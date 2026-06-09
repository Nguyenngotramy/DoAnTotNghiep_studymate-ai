"""
StudyMind — FastAPI Backend v3.1
Cài: pip install fastapi uvicorn httpx python-docx pypdf openpyxl
Chạy: python main.py
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
from multi_agent import get_orchestrator, reset_chat_metadata, get_chat_metadata
from chat_store import chat_store
from classifier_agent import (
    build_kb_filter,
    classification_to_api,
    SUBJECT_MAP,
)
from subject_metadata import classification_from_subject, build_compact_context
import uvicorn
import re
import re as re_module
import json
import uuid
import httpx
import os

from vocabulary import (
    parse_vocabulary_file,
    parse_paste_text,
    ai_extract_vocabulary,
    vocabulary_to_payload,
    vocab_to_flashcards,
    vocab_to_quiz_questions,
    normalize_vocab_list,
    VOCAB_JSON_SCHEMA,
)

app = FastAPI(title="StudyMind API", version="3.2.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Persistent chat history lives in chat_store.py ─────────────
CHAT_HISTORY_FOR_LLM = max(2, int(os.getenv("CHAT_HISTORY_FOR_LLM", "8")))
DEFAULT_KB_RESULTS = max(1, int(os.getenv("DEFAULT_KB_RESULTS", "3")))
MAX_KB_CONTEXT_CHARS = max(1000, int(os.getenv("MAX_KB_CONTEXT_CHARS", "4500")))
MAX_KB_SOURCE_CHARS = max(400, int(os.getenv("MAX_KB_SOURCE_CHARS", "1200")))
# ════════════════════════════════════════════════════════
# FILE FETCHER — lấy nội dung file thực từ URL
# ════════════════════════════════════════════════════════

def _basename_from_url(file_url: str) -> str:
    from urllib.parse import unquote, urlparse

    path = unquote(urlparse(file_url or "").path)
    return path.rsplit("/", 1)[-1] if path else ""


def _resolve_file_extension(file_url: str, filename: str, content_type: str = "", content: bytes = b"") -> str:
    """Ưu tiên đuôi file thật (doc.name / URL), không dùng nhãn chủ đề."""
    candidates: list[str] = []
    for name in (filename, _basename_from_url(file_url)):
        if name and "." in name:
            candidates.append(name.rsplit(".", 1)[-1].lower())

    ct = (content_type or "").lower()
    if "pdf" in ct:
        candidates.append("pdf")
    if "wordprocessingml" in ct or "msword" in ct:
        candidates.append("docx")
    if "spreadsheetml" in ct or "ms-excel" in ct:
        candidates.append("xlsx")
    if "text/plain" in ct:
        candidates.append("txt")
    if "json" in ct:
        candidates.append("json")

    if content.startswith(b"%PDF"):
        candidates.append("pdf")
    elif content[:2] == b"PK":
        candidates.append("docx")

    for ext in candidates:
        if ext in ("txt", "md", "csv", "docx", "pdf", "xlsx", "json"):
            return ext
    return candidates[0] if candidates else ""


def _is_valid_document_content(content: str) -> bool:
    if not content or len(content.strip()) < 40:
        return False
    error_markers = (
        "Không thể đọc nội dung file",
        "Lỗi khi đọc file",
        "Loại file: không xác định",
        "Loại file: KHÔNG XÁC ĐỊNH",
    )
    return not any(marker in content for marker in error_markers)


def _resolve_document_filename(filename: str | None, file_url: str | None, topic: str) -> str:
    return (filename or "").strip() or _basename_from_url(file_url or "") or (topic or "").strip()


async def fetch_file_content(file_url: str, filename: str) -> str:
    if not file_url or file_url == '#':
        return ""

    if not file_url.startswith('http'):
        base = os.getenv("BACKEND_API_URL", "http://localhost:8080/api").rstrip("/")
        file_url = base + (file_url if file_url.startswith('/') else '/' + file_url)

    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            res = await client.get(file_url)
            res.raise_for_status()

        ext = _resolve_file_extension(
            file_url,
            filename,
            res.headers.get("content-type", ""),
            res.content,
        )

        if ext in ('txt', 'md', 'csv'):
            return res.text[:12000]

        if ext == 'docx':
            from io import BytesIO
            from docx import Document as DocxDoc
            doc = DocxDoc(BytesIO(res.content))
            text = '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
            return text[:12000]

        if ext == 'pdf':
            from io import BytesIO
            import pypdf
            reader = pypdf.PdfReader(BytesIO(res.content))
            pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
            return '\n'.join(pages_text)[:12000]

        return ""

    except Exception:
        return ""


def _require_readable_content(content: str, filename: str) -> str:
    if _is_valid_document_content(content):
        return content
    raise HTTPException(
        status_code=422,
        detail=(
            f"Không đọc được nội dung tài liệu '{filename}'. "
            "Hỗ trợ PDF, DOCX, TXT, MD, CSV."
        ),
    )


async def extract_text_from_upload(file: UploadFile) -> str:
    """Đọc text từ UploadFile (PDF, DOCX, TXT, MD, CSV)."""
    content = await file.read()
    ext = (file.filename or "").rsplit('.', 1)[-1].lower()

    if ext in ('txt', 'md', 'csv'):
        return content.decode('utf-8', errors='ignore')[:8000]

    if ext == 'docx':
        from io import BytesIO
        from docx import Document as DocxDoc
        doc = DocxDoc(BytesIO(content))
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())[:8000]

    if ext == 'pdf':
        from io import BytesIO
        import pypdf
        reader = pypdf.PdfReader(BytesIO(content))
        pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
        return '\n'.join(pages_text)[:8000]

    return ""


# ════════════════════════════════════════════════════════
# PARSERS
# ════════════════════════════════════════════════════════

def _extract_json(raw: str) -> dict:
    cleaned = re_module.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for match in re_module.finditer(r"[\{\[]", cleaned):
        try:
            data, _ = decoder.raw_decode(cleaned[match.start():])
            if isinstance(data, dict):
                return data
            if isinstance(data, list):
                return {"items": data}
        except json.JSONDecodeError:
            continue

    match = re_module.search(r'\{.*\}', cleaned, re_module.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def parse_flashcards(raw: str) -> list[dict]:
    data  = _extract_json(raw)
    cards = []
    items = data.get("flashcards") or data.get("items") or []
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            front = str(item.get("front") or item.get("question") or "").strip()
            back  = str(item.get("back") or item.get("answer") or "").strip()
            if front and back:
                cards.append({
                    "question": front,
                    "answer":   back,
                    "hint":     str(item.get("hint", "") or ""),
                    "type":     str(item.get("type", "mixed") or "mixed"),
                })
        if cards:
            return cards
    if "flashcards" in data:
        return cards
    return _parse_flashcards_regex_fallback(raw)


def _parse_flashcards_regex_fallback(raw: str) -> list[dict]:
    cards  = []
    blocks = re.split(r'🃏\s*FLASHCARD\s*\d+', raw, flags=re.IGNORECASE)
    for block in blocks:
        if not block.strip():
            continue
        front_match = re.search(
            r'(?:📌\s*)?MẶT TRƯỚC\s*[:\-]?\s*\n?(.*?)(?=(?:✅\s*)?MẶT SAU|$)',
            block, re.DOTALL | re.IGNORECASE
        )
        back_match = re.search(
            r'(?:✅\s*)?MẶT SAU\s*[:\-]?\s*\n?(.*?)(?=(?:💡\s*)?GHI NHỚ|━+|🃏|$)',
            block, re.DOTALL | re.IGNORECASE
        )
        if front_match and back_match:
            q = front_match.group(1).strip()
            a = back_match.group(1).strip()
            if q and a:
                cards.append({"question": q, "answer": a, "hint": "", "type": "mixed"})
    return cards


def parse_quiz(raw: str) -> list[dict]:
    data      = _extract_json(raw)
    questions = []
    items = data.get("questions") or data.get("items") or []
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            opts = item.get("options", [])
            opts = [str(o).strip() for o in opts if str(o).strip()] if isinstance(opts, list) else []
            if not item.get("question") or len(opts) < 2:
                continue
            raw_idx = item.get("correct_index", item.get("correctIndex", 0))
            try:
                correct_idx = int(raw_idx)
            except (TypeError, ValueError):
                if isinstance(raw_idx, str) and len(raw_idx) == 1 and raw_idx.upper() in "ABCD":
                    correct_idx = ord(raw_idx.upper()) - ord("A")
                else:
                    correct_idx = 0
            correct_idx = min(max(correct_idx, 0), len(opts) - 1)
            questions.append({
                "question":     str(item["question"]).strip(),
                "options":      opts,
                "correctIndex": correct_idx,
                "explanation":  str(item.get("explanation", "") or "").strip(),
            })
        if questions:
            return questions
    if "questions" in data:
        return questions
    return _parse_quiz_regex_fallback(raw)


def _parse_quiz_regex_fallback(raw: str) -> list[dict]:
    questions = []
    blocks    = re.split(r'\n(?=\d+[\.\)]\s)', raw.strip())
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        question_text             = re.sub(r'^\d+[\.\)]\s*', '', lines[0]).strip()
        options, correct_idx, explanation = [], 0, ""
        for line in lines[1:]:
            opt_m = re.match(r'^([A-Da-d])[\.\)]\s*(.*)', line)
            cor_m = re.match(r'(?:Đáp án|Đáp|Answer)\s*[:\-]\s*([A-Da-d])', line, re.IGNORECASE)
            exp_m = re.match(r'(?:Giải thích|Explanation)\s*[:\-]\s*(.*)', line, re.IGNORECASE)
            if opt_m:   options.append(opt_m.group(2).strip())
            elif cor_m: correct_idx = ord(cor_m.group(1).upper()) - ord('A')
            elif exp_m: explanation = exp_m.group(1).strip()
        if question_text and len(options) >= 2:
            questions.append({
                "question":     question_text,
                "options":      options,
                "correctIndex": min(correct_idx, len(options) - 1),
                "explanation":  explanation,
            })
    return questions


# ════════════════════════════════════════════════════════
# SCHEMAS
# ════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    text: str
    session_id: Optional[str] = None
    subject: Optional[str] = None
    subject_code: Optional[str] = None
    doc_topic: Optional[str] = None
    api_key: Optional[str] = None


class SummaryRequest(BaseModel):
    topic: str
    filename: Optional[str] = None
    file_url: Optional[str] = None
    subject: Optional[str] = None
    subject_code: Optional[str] = None
    doc_topic: Optional[str] = None
    style:  Literal["bullet", "paragraph", "outline", "map"] = "bullet"
    length: Literal["short", "medium", "long"] = "medium"
    blog_context: Optional[str] = None


class FlashcardRequest(BaseModel):
    topic: str
    filename: Optional[str] = None
    file_url:  Optional[str] = None
    subject: Optional[str] = None
    subject_code: Optional[str] = None
    doc_topic: Optional[str] = None
    card_type: Literal["definition", "formula", "concept", "mixed"] = "mixed"
    num_cards: int = 5
    format:    Literal["qa", "cloze", "image_hint"] = "qa"
    use_vocabulary_pipeline: bool = True
    vocabulary: Optional[list[dict]] = None


class QuizRequest(BaseModel):
    topic: str
    filename: Optional[str] = None
    file_url:    Optional[str] = None
    subject: Optional[str] = None
    subject_code: Optional[str] = None
    doc_topic: Optional[str] = None
    bloom_level: Literal["remember", "understand", "apply", "analyze"] = "understand"
    num_questions: int = 10
    use_vocabulary_pipeline: bool = True
    vocabulary: Optional[list[dict]] = None


class VocabItem(BaseModel):
    tu_vung: str
    nghia: str
    vi_du: str = ""
    phat_am: str = ""


class VocabularyExtractRequest(BaseModel):
    topic: str = "từ vựng"
    filename: Optional[str] = None
    file_url: Optional[str] = None
    text: Optional[str] = None
    max_items: int = 30


class VocabularyFromJsonRequest(BaseModel):
    vocabulary: list[dict]
    num_cards: int = 10
    num_questions: int = 10


class VocabularyPasteRequest(BaseModel):
    text: str


class ConfirmClassificationRequest(BaseModel):
    """Dùng khi user muốn sửa lại môn học sau khi upload."""
    doc_id:       str   # filename (doc_id dùng khi ingest)
    subject_code: str   # môn học user chọn lại


QUIZ_BATCH_SIZE = 15
QUIZ_JSON_SCHEMA = (
    '{"questions":[{"question":"...","options":["A","B","C","D"],'
    '"correct_index":0,"explanation":"..."}]}'
)


def _require_doc_labels(subject: str | None, doc_topic: str | None, has_file: bool) -> None:
    """Bắt buộc nhãn nhóm + nhãn tài liệu trước khi đọc file — không dùng ClassifierAgent."""
    if not has_file:
        return
    if not (subject or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Nhóm chưa gắn nhãn môn học. Vui lòng cập nhật môn học của nhóm trước.",
        )
    if not (doc_topic or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Tài liệu chưa có nhãn chủ đề. Gắn nhãn tài liệu trước khi dùng AI.",
        )


async def _resolve_vocabulary(
    topic: str,
    content: str,
    provided: list[dict] | None,
    max_items: int,
) -> list[dict]:
    if provided:
        items = normalize_vocab_list(provided)
        if items:
            return items[:max_items]
    if content and len(content.strip()) > 30:
        items = await ai_extract_vocabulary(content, topic=topic, max_items=max_items)
        if items:
            return items
    return []


async def _search_kb_context(query: str, kb_filter: dict | None, n_results: int = DEFAULT_KB_RESULTS) -> tuple[str, list[dict]]:
    if not kb_filter:
        return "", []

    import asyncio
    from knowledge_base import search as kb_search

    results = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: kb_search(query=query, n_results=n_results, where_filter=kb_filter),
    )
    if not results:
        return "", []

    clipped_chunks = []
    total = 0
    for r in results:
        chunk = (r["content"] or "")[:MAX_KB_SOURCE_CHARS]
        if total + len(chunk) > MAX_KB_CONTEXT_CHARS:
            chunk = chunk[: max(0, MAX_KB_CONTEXT_CHARS - total)]
        if chunk.strip():
            clipped_chunks.append(chunk)
            total += len(chunk)
        if total >= MAX_KB_CONTEXT_CHARS:
            break

    content = "\n\n---\n\n".join(clipped_chunks)
    sources = [
        {
            "filename": r.get("filename", ""),
            "source": r.get("source", ""),
            "subject": r.get("subject", ""),
            "subject_code": r.get("subject_code", ""),
            "topic": r.get("topic", ""),
            "score": r.get("relevance_score"),
        }
        for r in results
    ]
    return content, sources


def _remember_turn(session_id: str, user_text: str, assistant_text: str) -> None:
    chat_store.remember_turn(session_id, user_text, assistant_text)


def _friendly_ai_error(e: Exception, used_user_key: bool = False) -> str:
    msg = str(e).lower()
    if "429" in msg or "rate-limit" in msg or "rate limit" in msg or "temporarily rate-limited" in msg:
        if used_user_key:
            return "Provider đang giới hạn tốc độ với API key của bạn. Hãy thử lại sau vài phút hoặc kiểm tra quota/key."
        return (
            "Model miễn phí đang bị giới hạn tạm thời. Bạn có thể thử lại sau vài phút "
            "hoặc nhập API key OpenRouter của riêng bạn để dùng quota riêng."
        )
    if "api key" in msg or "authentication" in msg or "401" in msg:
        return "API key không hợp lệ hoặc thiếu quyền truy cập model. Vui lòng kiểm tra lại key."
    return "AI service đang bận hoặc provider tạm thời không phản hồi. Vui lòng thử lại sau."


def _extract_requested_count(text: str, default: int, max_value: int) -> int:
    match = re.search(r"\b(\d{1,2})\b", text or "")
    if not match:
        return default
    return min(max(int(match.group(1)), 1), max_value)


def _detect_chat_route(text: str) -> str | None:
    normalized = (text or "").lower()
    normalized = re.sub(r"\s+", " ", normalized).strip()

    route_rules = [
        ("quiz", r"\b(quiz|trac nghiem|trắc nghiệm|cau hoi|câu hỏi|kiem tra|kiểm tra|de on|đề ôn)\b"),
        ("flashcard", r"\b(flashcard|flash card|the ghi nho|thẻ ghi nhớ|the hoc|thẻ học|on tu|ôn từ)\b"),
        ("summary", r"\b(tom tat|tóm tắt|rut gon|rút gọn|dan y|dàn ý|outline|mindmap|so do|sơ đồ)\b"),
        ("tutor", r"\b(giai thich|giải thích|huong dan|hướng dẫn|vi sao|vì sao|tai sao|tại sao|la gi|là gì)\b"),
    ]
    for route, pattern in route_rules:
        if re.search(pattern, normalized):
            return route
    return None


def _structured_quiz(questions: list[dict]) -> dict | None:
    if not questions:
        return None
    return {
        "type": "quiz",
        "items": [
            {
                "question": q["question"],
                "options": q["options"],
                "correctIndex": q["correctIndex"],
                "correct_index": q["correctIndex"],
                "explanation": q.get("explanation", ""),
            }
            for q in questions
        ],
    }


def _structured_flashcards(cards: list[dict]) -> dict | None:
    if not cards:
        return None
    return {
        "type": "flashcard",
        "items": [
            {
                "front": c["question"],
                "back": c["answer"],
                "question": c["question"],
                "answer": c["answer"],
                "hint": c.get("hint", ""),
                "type": c.get("type", "mixed"),
            }
            for c in cards
        ],
    }


def _json_response_from_structured(structured: dict | None) -> str | None:
    if not structured:
        return None
    if structured.get("type") == "quiz":
        return json.dumps({"type": "quiz", "questions": structured.get("items", [])}, ensure_ascii=False)
    if structured.get("type") == "flashcard":
        return json.dumps({"type": "flashcard", "flashcards": structured.get("items", [])}, ensure_ascii=False)
    return json.dumps(structured, ensure_ascii=False)


async def _run_fast_chat_route(route: str, orch, text: str, context: dict | None, history: list) -> tuple[str, str, dict | None, list[dict]]:
    manual_sources: list[dict] = []
    if route == "quiz":
        n = _extract_requested_count(text, default=5, max_value=20)
        kb_content, manual_sources = await _search_kb_context(
            query=text,
            kb_filter=(context or {}).get("kb_filter"),
            n_results=DEFAULT_KB_RESULTS,
        )
        kb_note = (
            f"\n\nNOI DUNG TU KNOWLEDGE BASE:\n{kb_content}\n\n"
            "Chi tao cau hoi dua tren noi dung knowledge base neu phu hop."
            if kb_content else ""
        )
        task = (
            f"Tạo {n} câu quiz trắc nghiệm theo yêu cầu sau. "
            f"CHỈ trả JSON thuần đúng schema {QUIZ_JSON_SCHEMA}.\nYêu cầu: {text}"
            f"{kb_note}"
        )
        raw = await orch.quiz.run(message=task, context=context)
        questions = parse_quiz(raw)
        if not questions:
            retry = f"{task}\n\nOutput trước chưa hợp lệ. Chỉ trả JSON hợp lệ theo schema: {QUIZ_JSON_SCHEMA}"
            raw = await orch.quiz.run(message=retry, context=context)
            questions = parse_quiz(raw)
        structured = _structured_quiz(questions)
        response = _json_response_from_structured(structured) or json.dumps(
            {"type": "quiz", "questions": [], "error": "invalid_model_output"},
            ensure_ascii=False,
        )
        return response, "QuizAgent", structured, manual_sources

    if route == "flashcard":
        n = _extract_requested_count(text, default=5, max_value=20)
        task = (
            f"Tạo {n} flashcard theo yêu cầu sau. "
            "CHỈ trả JSON thuần dạng {\"flashcards\":[{\"front\":\"...\",\"back\":\"...\",\"hint\":\"...\",\"type\":\"concept\"}]}.\n"
            f"Yêu cầu: {text}"
        )
        raw = await orch.flashcard.run(message=task, context=context)
        cards = parse_flashcards(raw)
        if not cards:
            retry = f"{task}\n\nOutput trước chưa hợp lệ. Chỉ trả JSON hợp lệ."
            raw = await orch.flashcard.run(message=retry, context=context)
            cards = parse_flashcards(raw)
        structured = _structured_flashcards(cards)
        response = _json_response_from_structured(structured) or json.dumps(
            {"type": "flashcard", "flashcards": [], "error": "invalid_model_output"},
            ensure_ascii=False,
        )
        return response, "FlashcardAgent", structured, manual_sources

    if route == "summary":
        task = f"Tóm tắt/rút ý chính theo yêu cầu sau, trình bày ngắn gọn, dễ học:\n{text}"
        raw = await orch.summary.run(message=task, context=context)
        return raw, "SummaryAgent", None, manual_sources

    if route == "tutor":
        raw = await orch.tutor.run(message=text, context=context, history=history)
        return raw, "TutorAgent", None, manual_sources

    raw = await orch.run(text, context=context, history=history)
    return raw, "Orchestrator", None, manual_sources


# ════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════

@app.get("/")
def index():
    return {"message": "StudyMind API v3.1 đang chạy", "docs": "/docs"}


# ── UPLOAD — dùng nhãn môn học từ nhóm, không classify bằng AI ──

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "studymind-ai-agent",
        "chat_store": chat_store.stats(),
    }


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    subject_code: Optional[str] = Form(None),
):
    """
    Upload file → lưu ChromaDB với metadata từ nhãn môn học đã gắn sẵn.
    """
    from knowledge_base import ingest_pdf_async

    if not (subject or subject_code or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Cần truyền nhãn môn học (subject) từ nhóm trước khi upload.",
        )

    filename = file.filename or "document"
    text     = await extract_text_from_upload(file)

    if not text.strip():
        raise HTTPException(status_code=422, detail="Không đọc được nội dung file.")

    result = await ingest_pdf_async(
        pdf_path=filename,
        text=text,
        filename=filename,
        subject=subject,
        subject_code=subject_code,
    )

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    clf = result["classification"]

    return {
        "status":   "saved",
        "filename": filename,
        "classification": classification_to_api(clf),
        "message": f"Đã lưu tài liệu vào môn {clf.subject}",
    }


# ── CHAT — dùng nhãn môn học, không gọi ClassifierAgent ──

@app.post("/chat")
async def chat(msg: ChatMessage):
    """Orchestrator routing — mỗi session có history riêng."""
    orch = get_orchestrator()
    sid  = msg.session_id or str(uuid.uuid4())
    history = chat_store.get_history(sid, limit=CHAT_HISTORY_FOR_LLM)

    clf = classification_from_subject(
        subject=msg.subject,
        subject_code=msg.subject_code,
        topic=msg.doc_topic or msg.text[:80],
    )
    subject_context = build_compact_context(clf, task="chat") if clf.subject_code != "other" else ""

    reset_chat_metadata()
    enriched_text = f"{subject_context}\n{msg.text}".strip() if subject_context else msg.text
    kb_filter     = build_kb_filter(clf)
    run_context   = {}
    if kb_filter:
        run_context["kb_filter"] = kb_filter
    if msg.api_key and msg.api_key.strip():
        run_context["api_key"] = msg.api_key.strip()
    run_context = run_context or None
    route         = _detect_chat_route(msg.text)
    try:
        if route:
            response, agent_name, structured, manual_sources = await _run_fast_chat_route(
                route=route,
                orch=orch,
                text=enriched_text,
                context=run_context,
                history=history,
            )
        else:
            response = await orch.run(enriched_text, context=run_context, history=history)
            agent_name = None
            structured = None
            manual_sources = []
    except Exception as e:
        response = _friendly_ai_error(e, used_user_key=bool(msg.api_key and msg.api_key.strip()))
        agent_name = "System"
        structured = None
        manual_sources = []

    meta = get_chat_metadata()
    structured = structured or meta.get("structured")
    if not structured:
        quiz_items = parse_quiz(response)
        if quiz_items:
            structured = _structured_quiz(quiz_items)
        else:
            fc_items = parse_flashcards(response)
            if fc_items:
                structured = _structured_flashcards(fc_items)

    normalized_response = _json_response_from_structured(structured)
    if normalized_response:
        response = normalized_response

    # Lưu history với text gốc (không có context inject)
    _remember_turn(sid, msg.text, response)

    return {
        "session_id": sid,
        "response":   response,
        "agent":      agent_name or meta.get("agent"),
        "route":      route or "orchestrator",
        "structured": structured,
        "sources":    manual_sources or meta.get("sources", []),
        "classification": classification_to_api(clf) if clf.subject_code != "other" else None,
    }


# ── SUMMARY ────────────────────────────────────────────

@app.post("/summary")
async def create_summary(req: SummaryRequest):
    _require_doc_labels(req.subject, req.doc_topic or req.topic, bool(req.file_url))

    orch     = get_orchestrator()
    doc_name = _resolve_document_filename(req.filename, req.file_url, req.topic)
    chapter  = (req.doc_topic or req.topic).strip()
    content  = ""
    if req.file_url:
        raw = await fetch_file_content(req.file_url, doc_name)
        content = _require_readable_content(raw, doc_name)

    if content:
        task = (
            f"Tóm tắt tài liệu '{doc_name}'"
            f"{f' (chủ đề: {chapter})' if chapter and chapter != doc_name else ''} "
            f"theo style '{req.style}' với độ dài '{req.length}'.\n\n"
            f"CHỈ tóm tắt từ nội dung bên dưới — KHÔNG dùng search_knowledge.\n"
            f"NỘI DUNG TÀI LIỆU:\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{content}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        task = f"Tóm tắt chủ đề '{chapter}' theo style '{req.style}' với độ dài '{req.length}'"

    if req.blog_context:
        task += (
            f"\n\nPHẦN BỔ SUNG TỪ BÀI BLOG (nối thêm vào cuối bản tóm tắt dưới mục "
            f"\"📚 Kiến thức mở rộng từ blog\", tổng hợp ý chính, không copy nguyên văn):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{req.blog_context}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )

    result = await orch.summary.run(message=task)
    return {"topic": req.topic, "style": req.style, "length": req.length, "summary": result}


# ── FLASHCARD ──────────────────────────────────────────

LANGUAGE_SUBJECT_CODES = {"english", "korean", "japanese", "chinese"}
VOCAB_FILE_EXTENSIONS = {"xlsx", "csv", "json"}


@app.post("/flashcard")
async def create_flashcard(req: FlashcardRequest):
    _require_doc_labels(req.subject, req.doc_topic or req.topic, bool(req.file_url))

    orch     = get_orchestrator()
    doc_name = _resolve_document_filename(req.filename, req.file_url, req.topic)
    chapter  = (req.doc_topic or req.topic).strip()
    content  = ""
    if req.file_url:
        raw = await fetch_file_content(req.file_url, doc_name)
        content = _require_readable_content(raw, doc_name)

    clf = classification_from_subject(
        subject=req.subject,
        subject_code=req.subject_code,
        topic=chapter,
        filename=doc_name,
    )

    file_ext = _resolve_file_extension(req.file_url or "", doc_name)
    use_vocab = req.use_vocabulary_pipeline and (
        clf.subject_code in LANGUAGE_SUBJECT_CODES
        or file_ext in VOCAB_FILE_EXTENSIONS
    )

    if use_vocab:
        vocab = await _resolve_vocabulary(
            chapter, content, req.vocabulary, max(req.num_cards * 2, 20)
        )
        if vocab:
            cards = vocab_to_flashcards(vocab[: req.num_cards])
            return {
                "topic": req.topic,
                "card_type": req.card_type,
                "num_cards": len(cards),
                "flashcards": cards,
                "vocabulary": vocabulary_to_payload(vocab),
                "pipeline": "vocabulary_json",
                "classification": classification_to_api(clf),
            }

    gen_ctx = build_compact_context(clf, task="flashcard")
    lang_note = ""
    if clf.language and clf.language != "vi":
        lang_note = (
            f"\nNgôn ngữ tài liệu: {clf.language}. "
            "Giữ nguyên ngôn ngữ trong flashcard (front/back đúng ngôn ngữ tài liệu)."
        )

    if content:
        # Đã có nội dung file — không cho agent search KB (tránh lấy kiến thức môn học khác)
        run_context = None
        task = (
            f"{gen_ctx}\n\n"
            f"Tạo {req.num_cards} flashcard từ TÀI LIỆU '{doc_name}'"
            f"{f' — chủ đề nhãn: {chapter}' if chapter and chapter != doc_name else ''} "
            f"loại '{req.card_type}' format '{req.format}'.{lang_note}\n\n"
            f"QUY TẮC BẮT BUỘC:\n"
            f"- CHỈ dùng nội dung bên dưới, KHÔNG gọi search_knowledge\n"
            f"- KHÔNG tạo flashcard từ kiến thức ngoài tài liệu\n"
            f"- Không suy diễn theo nhãn chủ đề nếu nội dung tài liệu khác chủ đề\n\n"
            f"NỘI DUNG TÀI LIỆU:\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{content}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        kb_filter   = build_kb_filter(clf)
        run_context = {"kb_filter": kb_filter} if kb_filter else None
        task = (
            f"{gen_ctx}\n\n"
            f"Tạo {req.num_cards} flashcard về '{chapter}' "
            f"loại '{req.card_type}' format '{req.format}'.{lang_note}"
        )

    raw   = await orch.flashcard.run(message=task, context=run_context)
    cards = parse_flashcards(raw)
    if not cards:
        retry_task = (
            f"{task}\n\n"
            "Lan truoc khong parse duoc. CHI tra JSON hop le dang "
            "{\"flashcards\":[{\"front\":\"...\",\"back\":\"...\",\"hint\":\"...\",\"type\":\"concept\"}]}."
        )
        raw = await orch.flashcard.run(message=retry_task, context=run_context)
        cards = parse_flashcards(raw)

    if not cards:
        raise HTTPException(
            status_code=422,
            detail={"message": "Không parse được flashcard từ agent output", "raw": raw[:500]}
        )

    return {
        "topic":     req.topic,
        "card_type": req.card_type,
        "num_cards": len(cards),
        "flashcards": cards,
        "pipeline": "ai_direct",
        "classification": classification_to_api(clf),
    }


# ── QUIZ ───────────────────────────────────────────────

def _build_quiz_task(
    topic: str,
    bloom_level: str,
    n: int,
    content: str,
    offset: int = 0,
    gen_context: str = "",
) -> str:
    offset_note = f" (câu {offset + 1} trở đi, không trùng)" if offset > 0 else ""
    header = f"{gen_context}\n" if gen_context else ""
    core = (
        f"{header}Tạo {n} câu quiz trắc nghiệm về '{topic}' "
        f"(Bloom: {bloom_level}){offset_note}.\n"
        f"CHỈ trả JSON thuần, không markdown, không giải thích thêm:\n{QUIZ_JSON_SCHEMA}"
    )
    if content:
        return (
            f"{core}\n\n"
            f"QUY TẮC: CHỈ tạo câu hỏi từ nội dung tài liệu bên dưới, KHÔNG dùng kiến thức ngoài.\n"
            f"NỘI DUNG TÀI LIỆU:\n{content}\n\n"
            f"Trả về đúng JSON theo schema trên."
        )
    return core


@app.post("/quiz")
async def create_quiz(req: QuizRequest):
    """
    Tối đa 15 câu/batch. Ép output JSON — không dùng ClassifierAgent.
    """
    import asyncio
    _require_doc_labels(req.subject, req.doc_topic or req.topic, bool(req.file_url))

    orch     = get_orchestrator()
    doc_name = _resolve_document_filename(req.filename, req.file_url, req.topic)
    content  = ""
    if req.file_url:
        raw = await fetch_file_content(req.file_url, doc_name)
        content = _require_readable_content(raw, doc_name)

    topic_label = (req.doc_topic or req.topic).strip()
    clf = classification_from_subject(
        subject=req.subject,
        subject_code=req.subject_code,
        topic=topic_label,
        filename=doc_name,
    )

    file_ext = _resolve_file_extension(req.file_url or "", doc_name)
    use_vocab = req.use_vocabulary_pipeline and (
        clf.subject_code in LANGUAGE_SUBJECT_CODES
        or file_ext in VOCAB_FILE_EXTENSIONS
    )

    if use_vocab:
        vocab = await _resolve_vocabulary(
            topic_label, content, req.vocabulary, max(req.num_questions * 2, 30)
        )
        if len(vocab) >= 2:
            questions = vocab_to_quiz_questions(vocab, req.num_questions)
            return {
                "topic": req.topic,
                "bloom_level": req.bloom_level,
                "num_questions": len(questions),
                "batches_used": 1,
                "questions": questions,
                "vocabulary": vocabulary_to_payload(vocab),
                "pipeline": "vocabulary_json",
                "classification": classification_to_api(clf),
            }

    gen_ctx = build_compact_context(clf, task="quiz")
    kb_filter   = build_kb_filter(clf)
    run_context = None if content else ({"kb_filter": kb_filter} if kb_filter else None)
    retrieved_content = ""
    retrieved_sources: list[dict] = []
    if not content and kb_filter:
        retrieved_content, retrieved_sources = await _search_kb_context(
            query=topic_label,
            kb_filter=kb_filter,
            n_results=DEFAULT_KB_RESULTS,
        )
    quiz_content = content or retrieved_content

    # Chia batch
    batches, remaining, offset = [], req.num_questions, 0
    while remaining > 0:
        batch_size = min(remaining, QUIZ_BATCH_SIZE)
        batches.append((batch_size, offset))
        offset    += batch_size
        remaining -= batch_size

    async def run_batch(n: int, off: int) -> list:
        task = _build_quiz_task(topic_label, req.bloom_level, n, quiz_content, off, gen_ctx)
        raw  = await orch.quiz.run(message=task, context=run_context)
        parsed = parse_quiz(raw)
        if not parsed:
            retry_task = f"{task}\n\nLần trước không parse được. CHỈ trả JSON hợp lệ:\n{QUIZ_JSON_SCHEMA}"
            raw = await orch.quiz.run(message=retry_task, context=run_context)
            parsed = parse_quiz(raw)
        return parsed

    results = await asyncio.gather(*[run_batch(n, off) for n, off in batches])

    seen, all_questions = set(), []
    for batch_qs in results:
        for q in batch_qs:
            key = q["question"][:50]
            if key not in seen:
                seen.add(key)
                all_questions.append(q)

    if not all_questions:
        raise HTTPException(status_code=422, detail={"message": "Không parse được quiz từ agent output"})

    return {
        "topic":          req.topic,
        "bloom_level":    req.bloom_level,
        "num_questions":  len(all_questions),
        "batches_used":   len(batches),
        "questions":      all_questions,
        "classification": classification_to_api(clf),
        "sources":        retrieved_sources,
        "pipeline": "ai_direct",
    }


# ── VOCABULARY — JSON chuẩn → flashcard / quiz ─────────

@app.get("/vocabulary/schema")
def vocabulary_schema():
    return {"schema": VOCAB_JSON_SCHEMA, "example": vocabulary_to_payload([
        {"tu_vung": "안녕하세요", "nghia": "xin chào", "vi_du": "안녕하세요, 만나서 반갑습니다.", "phat_am": "annyeonghaseyo"},
    ])}


@app.post("/vocabulary/parse-paste")
async def vocabulary_parse_paste(req: VocabularyPasteRequest):
    """Dán nội dung từ Excel/Word (Tab, |, CSV, JSON) → JSON từ vựng chuẩn."""
    items = parse_paste_text(req.text)
    if not items:
        raise HTTPException(
            status_code=422,
            detail="Không nhận diện được từ vựng. Dùng Tab: từ | nghĩa | ví dụ | phát âm",
        )
    return {
        "count": len(items),
        "vocabulary": vocabulary_to_payload(items),
    }


@app.post("/vocabulary/import")
async def vocabulary_import(file: UploadFile = File(...)):
    """Import từ Excel (.xlsx), CSV, DOCX hoặc file JSON từ vựng."""
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="File trống")
    try:
        items = parse_vocabulary_file(raw, file.filename or "import.csv")
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not items:
        raise HTTPException(
            status_code=422,
            detail="Không đọc được từ vựng. Cột gợi ý: tu_vung, nghia, vi_du, phat_am",
        )
    payload = vocabulary_to_payload(items)
    return {
        "filename": file.filename,
        "count": len(items),
        "vocabulary": payload,
    }


@app.post("/vocabulary/extract")
async def vocabulary_extract(req: VocabularyExtractRequest):
    """Bước 1: AI trích xuất JSON từ vựng từ tài liệu hoặc text."""
    content = req.text or ""
    if req.file_url:
        doc_name = _resolve_document_filename(req.filename, req.file_url, req.topic)
        raw = await fetch_file_content(req.file_url, doc_name)
        content = _require_readable_content(raw, doc_name)
    if not content.strip():
        raise HTTPException(status_code=422, detail="Không có nội dung để trích xuất")
    items = await ai_extract_vocabulary(content, topic=req.topic, max_items=req.max_items)
    if not items:
        raise HTTPException(status_code=422, detail="AI không trích xuất được từ vựng")
    return {
        "topic": req.topic,
        "count": len(items),
        "vocabulary": vocabulary_to_payload(items),
    }


@app.post("/vocabulary/to-flashcards")
async def vocabulary_to_flashcards_api(req: VocabularyFromJsonRequest):
    """Bước 2a: Từ JSON từ vựng → flashcard."""
    items = normalize_vocab_list(req.vocabulary)
    if not items:
        raise HTTPException(status_code=422, detail="Danh sách từ vựng trống")
    cards = vocab_to_flashcards(items[: req.num_cards])
    return {
        "num_cards": len(cards),
        "flashcards": cards,
        "vocabulary": vocabulary_to_payload(items),
    }


@app.post("/vocabulary/to-quiz")
async def vocabulary_to_quiz_api(req: VocabularyFromJsonRequest):
    """Bước 2b: Từ JSON từ vựng → quiz trắc nghiệm."""
    items = normalize_vocab_list(req.vocabulary)
    if len(items) < 2:
        raise HTTPException(status_code=422, detail="Cần ít nhất 2 từ để tạo quiz")
    questions = vocab_to_quiz_questions(items, req.num_questions)
    return {
        "num_questions": len(questions),
        "questions": questions,
        "vocabulary": vocabulary_to_payload(items),
    }


@app.get("/vocabulary/export")
async def vocabulary_export_download(vocabulary: str):
    """Query: vocabulary = JSON string — trả file tải về (dùng POST body trên FE thay thế)."""
    raise HTTPException(status_code=400, detail="Dùng POST /vocabulary/import hoặc tải JSON từ response")


# ── SUBJECTS — danh sách môn học ───────────────────────

@app.get("/subjects")
def list_subjects():
    """Trả về danh sách môn học hỗ trợ — dùng cho FE dropdown."""
    return {
        "subjects": [{"code": k, "name": v} for k, v in SUBJECT_MAP.items()]
    }


# ── HISTORY ────────────────────────────────────────────

@app.delete("/history")
def clear_history(session_id: Optional[str] = None):
    if session_id:
        deleted = chat_store.clear(session_id)
        return {"message": f"Đã xóa session {session_id}", "deleted": deleted}
    deleted = chat_store.clear()
    return {"message": "Đã xóa tất cả sessions", "deleted": deleted}


@app.get("/history/{session_id}")
def get_history(session_id: str, limit: int = 100):
    return {
        "session_id": session_id,
        "messages": chat_store.get_messages(session_id, limit=limit),
    }


# ── AGENTS ─────────────────────────────────────────────

@app.get("/agents")
def list_agents():
    return {
        "agents": [
            {"name": "TutorAgent",       "role": "Giải thích khái niệm theo Socratic"},
            {"name": "QuizAgent",        "role": "Tạo bài kiểm tra theo Bloom's Taxonomy"},
            {"name": "GroupAgent",       "role": "Tổ chức và quản lý nhóm học"},
            {"name": "SummaryAgent",     "role": "Tóm tắt tài liệu theo nhiều định dạng"},
            {"name": "FlashcardAgent",   "role": "Tạo flashcard theo spaced repetition"},
            {"name": "KepnerTregoeAgent","role": "Phân tích vấn đề theo Kepner-Tregoe"},
        ]
    }


# ════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
