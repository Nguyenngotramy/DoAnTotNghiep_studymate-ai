"""
StudyMind — Phase 2: ChromaDB Knowledge Base
=============================================
Cài trước: pip install chromadb sentence-transformers pypdf

Chạy để nạp PDF:    python knowledge_base.py --ingest-pdf file.pdf
Chạy để test:       python knowledge_base.py --search "đạo hàm"
"""

import argparse
import asyncio
import os
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

from classifier_agent import classify_document as clf_doc, enrich_kb_metadata


DB_PATH = "./studymind_db"          # Thư mục lưu ChromaDB
COLLECTION_NAME = "knowledge"
EMBED_MODEL = "all-MiniLM-L6-v2"   # Model embedding nhẹ, chạy offline


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

    ids       = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]

    collection.add(documents=chunks, metadatas=metadatas, ids=ids)
    print(f"✅ Đã nạp '{doc_id}': {len(chunks)} chunks")


def ingest_pdf(pdf_path: str):
    """Nạp file PDF vào ChromaDB (có tự động phân loại môn học)"""
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

    # ── Classify môn học trước khi lưu ──
    print(f"🔍 Đang phân loại tài liệu '{filename}'...")
    classification = asyncio.run(clf_doc(text, filename=filename))
    print(f"  📚 Môn:        {classification.subject} ({classification.subject_code})")
    print(f"  📌 Chủ đề:     {classification.topic}")
    print(f"  🏷️  Keywords:   {', '.join(classification.keywords)}")
    print(f"  📄 Loại:       {classification.content_type} | Độ khó: {classification.difficulty}")
    print(f"  🎯 Confidence: {classification.confidence:.0%}")
    if classification.confidence < 0.65:
        print(f"  ⚠️  Confidence thấp — lưu với subject_code='other'")
    # ────────────────────────────────────

    base_metadata    = {"source": pdf_path, "type": "pdf", "filename": filename}
    enriched_metadata = enrich_kb_metadata(base_metadata, classification)

    ingest_text(text=text, metadata=enriched_metadata, doc_id=filename)


async def ingest_pdf_async(pdf_path: str, text: str = None, filename: str = None) -> dict:
    """
    Async version — dùng trong FastAPI /upload endpoint.
    Trả về classification để FE hiển thị xác nhận.
    """
    try:
        if text is None:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

        fname = filename or Path(pdf_path).stem
        classification = await clf_doc(text, filename=fname)

        base_metadata     = {"source": pdf_path or fname, "type": "pdf", "filename": fname}
        enriched_metadata = enrich_kb_metadata(base_metadata, classification)

        ingest_text(text=text, metadata=enriched_metadata, doc_id=fname)
        return {"status": "ok", "classification": classification}

    except Exception as e:
        return {"status": "error", "error": str(e)}


def ingest_folder(folder_path: str):
    """Nạp tất cả PDF trong thư mục"""
    folder = Path(folder_path)
    pdfs   = list(folder.glob("*.pdf"))
    print(f"Tìm thấy {len(pdfs)} file PDF...")
    for pdf in pdfs:
        ingest_pdf(str(pdf))


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Chia text thành chunks có overlap"""
    chunks = []
    start  = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start += chunk_size - overlap
    return [c for c in chunks if len(c) > 50]


# ── Tìm kiếm ─────────────────────────────────────────

def search(query: str, n_results: int = 3, where_filter: dict = None) -> list[dict]:
    """
    Tìm kiếm semantic trong knowledge base.

    Args:
        query:        Câu tìm kiếm
        n_results:    Số kết quả trả về
        where_filter: ChromaDB filter theo môn học.
                      Lấy từ build_kb_filter(classification) trong classifier_agent.py.
                      Ví dụ: {"subject_code": {"$eq": "math"}}
                      None = tìm toàn bộ KB không filter.
    """
    collection = get_collection()

    kwargs = dict(
        query_texts=[query],
        n_results=min(n_results, collection.count() or 1),
        include=["documents", "metadatas", "distances"],
    )
    if where_filter:
        kwargs["where"] = where_filter

    results = collection.query(**kwargs)

    output = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        output.append({
            "content":      doc,
            "source":       meta.get("source", "unknown"),
            "filename":     meta.get("filename", ""),
            "subject":      meta.get("subject", ""),
            "subject_code": meta.get("subject_code", ""),
            "topic":        meta.get("topic", ""),
            "relevance_score": round(1 - results["distances"][0][i], 3),
        })

    return output


# ── CLI ───────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StudyMind Knowledge Base")
    parser.add_argument("--ingest-pdf",    type=str, help="Nạp file PDF")
    parser.add_argument("--ingest-folder", type=str, help="Nạp cả thư mục PDF")
    parser.add_argument("--search",        type=str, help="Tìm kiếm")
    parser.add_argument("--subject",       type=str, help="Filter theo subject_code (vd: math, physics)")
    args = parser.parse_args()

    if args.ingest_pdf:
        ingest_pdf(args.ingest_pdf)

    elif args.ingest_folder:
        ingest_folder(args.ingest_folder)

    elif args.search:
        where = {"subject_code": {"$eq": args.subject}} if args.subject else None
        results = search(args.search, where_filter=where)
        print(f"\nKết quả tìm kiếm: '{args.search}'" + (f" [môn: {args.subject}]" if args.subject else "") + "\n")
        for i, r in enumerate(results, 1):
            print(f"[{i}] Score: {r['relevance_score']} | Môn: {r['subject']} | Source: {r['filename']}")
            print(f"    {r['content'][:200]}...")
            print()

    else:
        parser.print_help()