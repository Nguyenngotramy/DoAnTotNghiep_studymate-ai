"""
StudyMind — Phase 2: ChromaDB Knowledge Base
=============================================
Cài trước: pip install chromadb sentence-transformers pypdf

Chạy để nạp PDF:    python knowledge_base.py --ingest-pdf file.pdf
Chạy để test:       python knowledge_base.py --search "đạo hàm"
"""

import argparse
import hashlib
import json
import logging
import os
import re
import shutil
import sqlite3
import threading
from datetime import datetime
from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.api.configuration import CollectionConfigurationInternal
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from classifier_agent import enrich_kb_metadata
from subject_metadata import classification_from_subject


logger = logging.getLogger(__name__)

DB_PATH = os.getenv("STUDYMIND_DB_PATH", "./studymind_db")  # Thư mục lưu ChromaDB
COLLECTION_NAME = os.getenv("KB_COLLECTION_NAME", "knowledge_v2")
LEGACY_COLLECTION_NAME = "knowledge"
EMBED_MODEL = os.getenv("EMBED_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
KB_CHUNK_SIZE = max(300, int(os.getenv("KB_CHUNK_SIZE", "900")))
KB_CHUNK_OVERLAP = max(0, int(os.getenv("KB_CHUNK_OVERLAP", "120")))
MIN_KB_RELEVANCE = min(1.0, max(-1.0, float(os.getenv("MIN_KB_RELEVANCE", "0.25"))))


def _migrate_legacy_collection_config() -> None:
    db_file = Path(DB_PATH) / "chroma.sqlite3"
    if not db_file.exists():
        return

    with sqlite3.connect(db_file) as conn:
        rows = conn.execute(
            """
            SELECT id, config_json_str
            FROM collections
            WHERE name = ?
            """,
            (COLLECTION_NAME,),
        ).fetchall()
        legacy_ids = []
        for collection_id, raw_config in rows:
            try:
                parsed = json.loads(raw_config or "{}")
            except json.JSONDecodeError:
                continue
            if parsed == {}:
                legacy_ids.append(collection_id)

        if not legacy_ids:
            return

        backup = db_file.with_name(
            f"{db_file.name}.pre-config-migration-{datetime.now():%Y%m%d-%H%M%S}.bak"
        )
        shutil.copy2(db_file, backup)

        config_json_map = CollectionConfigurationInternal().to_json()
        config_json_map["hnsw_configuration"]["space"] = "cosine"
        config = CollectionConfigurationInternal.from_json(config_json_map)
        config_json = config.to_json_str()
        conn.executemany(
            """
            UPDATE collections
            SET config_json_str = ?
            WHERE id = ?
            """,
            [(config_json, collection_id) for collection_id in legacy_ids],
        )
        conn.commit()


_collection_lock = threading.Lock()


def _migrate_legacy_documents(client, target_collection) -> None:
    if COLLECTION_NAME == LEGACY_COLLECTION_NAME or target_collection.count() > 0:
        return

    try:
        legacy = client.get_collection(name=LEGACY_COLLECTION_NAME)
    except Exception:
        return

    total = legacy.count()
    if total == 0:
        return

    batch_size = 100
    for offset in range(0, total, batch_size):
        batch = legacy.get(
            limit=batch_size,
            offset=offset,
            include=["documents", "metadatas"],
        )
        if batch["ids"]:
            target_collection.upsert(
                ids=batch["ids"],
                documents=batch["documents"],
                metadatas=batch["metadatas"],
            )
    logger.info(
        "Migrated legacy Chroma collection source=%s target=%s documents=%s",
        LEGACY_COLLECTION_NAME,
        COLLECTION_NAME,
        total,
    )


@lru_cache(maxsize=1)
def get_collection():
    with _collection_lock:
        client = chromadb.PersistentClient(
            path=DB_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBED_MODEL
        )
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=embed_fn,
            metadata={"hnsw:space": "cosine"},
        )
        _migrate_legacy_documents(client, collection)
        return collection


# ── Nạp tài liệu vào DB ───────────────────────────────

def ingest_text(text: str, metadata: dict, doc_id: str):
    """Nạp 1 đoạn text vào ChromaDB"""
    collection = get_collection()

    chunks = chunk_text(text, chunk_size=KB_CHUNK_SIZE, overlap=KB_CHUNK_OVERLAP)
    if not chunks:
        raise ValueError("Tai lieu khong co noi dung hop le de ingest.")

    tenant_id = str(metadata.get("tenant_id") or "").strip()
    if not tenant_id:
        raise ValueError("tenant_id la bat buoc khi ingest knowledge base.")
    doc_key = hashlib.sha256(f"{tenant_id}:{doc_id}".encode("utf-8")).hexdigest()[:24]
    ids = [f"{doc_key}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {**metadata, "doc_key": doc_key, "chunk_index": i}
        for i in range(len(chunks))
    ]

    collection.delete(where={"doc_key": {"$eq": doc_key}})
    collection.upsert(documents=chunks, metadatas=metadatas, ids=ids)
    logger.info("Ingested document=%s chunks=%s", doc_id, len(chunks))


def ingest_pdf(
    pdf_path: str,
    subject: str = None,
    subject_code: str = None,
    tenant_id: str = "cli",
):
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
    classification = classification_from_subject(
        subject=subject,
        subject_code=subject_code,
        topic=filename,
        filename=filename,
    )
    print(f"  📚 Môn:        {classification.subject} ({classification.subject_code})")
    print(f"  📌 Chủ đề:     {classification.topic}")
    print(f"  🏷️  Keywords:   {', '.join(classification.keywords)}")
    print(f"  📄 Loại:       {classification.content_type} | Độ khó: {classification.difficulty}")
    print(f"  🎯 Confidence: {classification.confidence:.0%}")
    if classification.confidence < 0.65:
        print(f"  ⚠️  Confidence thấp — lưu với subject_code='other'")
    # ────────────────────────────────────

    base_metadata = {
        "source": pdf_path,
        "type": "pdf",
        "filename": filename,
        "tenant_id": tenant_id,
    }
    enriched_metadata = enrich_kb_metadata(base_metadata, classification)

    ingest_text(text=text, metadata=enriched_metadata, doc_id=filename)


async def ingest_pdf_async(
    pdf_path: str,
    text: str = None,
    filename: str = None,
    subject: str = None,
    subject_code: str = None,
    tenant_id: str = None,
) -> dict:
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
        classification = classification_from_subject(
            subject=subject,
            subject_code=subject_code,
            topic=fname,
            filename=fname,
        )

        if not (tenant_id or "").strip():
            raise ValueError("tenant_id la bat buoc khi ingest knowledge base.")
        base_metadata = {
            "source": pdf_path or fname,
            "type": "pdf",
            "filename": fname,
            "tenant_id": tenant_id.strip(),
        }
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
    text = re.sub(r"\s+\n", "\n", text or "").strip()
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    if not paragraphs:
        paragraphs = [text]

    chunks = []
    current = ""

    def flush_current():
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
            current = ""

    for paragraph in paragraphs:
        if len(paragraph) > chunk_size:
            flush_current()
            sentences = re.split(r"(?<=[.!?])\s+", paragraph)
            buffer = ""
            for sentence in sentences:
                if len(sentence) > chunk_size:
                    if buffer.strip():
                        chunks.append(buffer.strip())
                        buffer = ""
                    start = 0
                    while start < len(sentence):
                        end = start + chunk_size
                        chunks.append(sentence[start:end].strip())
                        start += max(chunk_size - overlap, 1)
                    continue
                if len(buffer) + len(sentence) + 1 <= chunk_size:
                    buffer = f"{buffer} {sentence}".strip()
                else:
                    if buffer.strip():
                        chunks.append(buffer.strip())
                    buffer = sentence
            if buffer.strip():
                chunks.append(buffer.strip())
            continue

        if len(current) + len(paragraph) + 2 <= chunk_size:
            current = f"{current}\n\n{paragraph}".strip()
        else:
            flush_current()
            current = paragraph

    flush_current()

    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:].strip()
            overlapped.append(f"{prev_tail}\n{chunks[i]}".strip())
        chunks = overlapped
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
    count = collection.count()
    if count == 0:
        return []

    kwargs = dict(
        query_texts=[query],
        n_results=min(max(n_results, 1), count),
        include=["documents", "metadatas", "distances"],
    )
    if where_filter:
        kwargs["where"] = where_filter

    results = collection.query(**kwargs)

    output = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        relevance_score = round(1 - results["distances"][0][i], 3)
        if relevance_score < MIN_KB_RELEVANCE:
            continue
        output.append({
            "content":      doc,
            "source":       meta.get("source", "unknown"),
            "filename":     meta.get("filename", ""),
            "subject":      meta.get("subject", ""),
            "subject_code": meta.get("subject_code", ""),
            "topic":        meta.get("topic", ""),
            "tenant_id":    meta.get("tenant_id", ""),
            "relevance_score": relevance_score,
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
