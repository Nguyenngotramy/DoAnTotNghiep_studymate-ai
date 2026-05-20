"""
StudyMind — Phase 2: ChromaDB Knowledge Base
=============================================
Cài trước: pip install chromadb sentence-transformers pypdf

Chạy để nạp PDF:    python knowledge_base.py --ingest-pdf file.pdf
Chạy để test:       python knowledge_base.py --search "đạo hàm"
"""

import argparse
import os
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

# ── Cấu hình ──────────────────────────────────────────
DB_PATH = "./studymind_db"          # Thư mục lưu ChromaDB
COLLECTION_NAME = "knowledge"
EMBED_MODEL = "all-MiniLM-L6-v2"   # Model embedding nhẹ, chạy offline

# ── Khởi tạo ChromaDB ─────────────────────────────────
def get_collection():
    client = chromadb.PersistentClient(path=DB_PATH)
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBED_MODEL
    )
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


# ── Nạp tài liệu vào DB ───────────────────────────────
def ingest_text(text: str, metadata: dict, doc_id: str):
    """Nạp 1 đoạn text vào ChromaDB"""
    collection = get_collection()

    chunks = chunk_text(text, chunk_size=500, overlap=50)

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]

    collection.add(documents=chunks, metadatas=metadatas, ids=ids)
    print(f"✅ Đã nạp '{doc_id}': {len(chunks)} chunks")


def ingest_pdf(pdf_path: str):
    """Nạp file PDF vào ChromaDB"""
    try:
        from pypdf import PdfReader
    except ImportError:
        print("❌ Cần cài: pip install pypdf")
        return

    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    filename = Path(pdf_path).stem
    ingest_text(
        text=text,
        metadata={"source": pdf_path, "type": "pdf", "filename": filename},
        doc_id=filename
    )


def ingest_folder(folder_path: str):
    """Nạp tất cả PDF trong thư mục"""
    folder = Path(folder_path)
    pdfs = list(folder.glob("*.pdf"))
    print(f"Tìm thấy {len(pdfs)} file PDF...")
    for pdf in pdfs:
        ingest_pdf(str(pdf))


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Chia text thành chunks có overlap"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start += chunk_size - overlap
    return [c for c in chunks if len(c) > 50]


# ── Tìm kiếm ─────────────────────────────────────────
def search(query: str, n_results: int = 3, subject: str = None) -> list[dict]:
    """
    Tìm kiếm semantic trong knowledge base.
    Trả về list các đoạn liên quan nhất.
    """
    collection = get_collection()

    where = {"subject": subject} if subject else None

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count() or 1),
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    output = []
    for i, doc in enumerate(results["documents"][0]):
        output.append({
            "content": doc,
            "source": results["metadatas"][0][i].get("source", "unknown"),
            "filename": results["metadatas"][0][i].get("filename", ""),
            "relevance_score": round(1 - results["distances"][0][i], 3)
        })

    return output


# ── CLI ───────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StudyMind Knowledge Base")
    parser.add_argument("--ingest-pdf", type=str, help="Nạp file PDF")
    parser.add_argument("--ingest-folder", type=str, help="Nạp cả thư mục PDF")
    parser.add_argument("--search", type=str, help="Tìm kiếm")
    args = parser.parse_args()

    if args.ingest_pdf:
        ingest_pdf(args.ingest_pdf)

    elif args.ingest_folder:
        ingest_folder(args.ingest_folder)

    elif args.search:
        results = search(args.search)
        print(f"\n🔍 Kết quả tìm kiếm: '{args.search}'\n")
        for i, r in enumerate(results, 1):
            print(f"[{i}] Score: {r['relevance_score']} | Source: {r['filename']}")
            print(f"    {r['content'][:200]}...")
            print()

    else:
        parser.print_help()