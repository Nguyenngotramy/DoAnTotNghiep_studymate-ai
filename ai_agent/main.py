"""
StudyMind — FastAPI Backend v3.1
Cài: pip install fastapi uvicorn httpx python-docx pypdf openpyxl
Chạy: python main.py
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
from multi_agent import get_orchestrator, reset_chat_metadata, get_chat_metadata
from classifier_agent import (
    classify_message,
    build_kb_filter,
    build_generation_context,
    classification_to_api,
    classify_for_generation,
    get_agent_hint,
    SUBJECT_MAP,
)
import uvicorn
import re
import re as re_module
import json
import uuid
import httpx

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Session store (mỗi user/tab có history riêng) ─────────────
sessions: dict[str, list] = {}


# ════════════════════════════════════════════════════════
# FILE FETCHER — lấy nội dung file thực từ URL
# ════════════════════════════════════════════════════════

async def fetch_file_content(file_url: str, filename: str) -> str:
    if not file_url or file_url == '#':
        return f"Tài liệu: {filename}"

    if not file_url.startswith('http'):
        base = "http://localhost:8080/api"
        file_url = base + (file_url if file_url.startswith('/') else '/' + file_url)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(file_url)
            res.raise_for_status()

        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        if ext in ('txt', 'md', 'csv'):
            return res.text[:8000]

        if ext == 'docx':
            from io import BytesIO
            from docx import Document as DocxDoc
            doc = DocxDoc(BytesIO(res.content))
            text = '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
            return text[:8000]

        if ext == 'pdf':
            from io import BytesIO
            import pypdf
            reader = pypdf.PdfReader(BytesIO(res.content))
            pages_text = [page.extract_text() for page in reader.pages if page.extract_text()]
            return '\n'.join(pages_text)[:8000]

        return (
            f"Tài liệu: {filename}\n"
            f"Loại file: {ext.upper() if ext else 'không xác định'}\n"
            "(Không thể đọc nội dung file loại này — chỉ hỗ trợ TXT, MD, CSV, DOCX, PDF)"
        )

    except Exception as e:
        return f"Tài liệu: {filename}\n(Lỗi khi đọc file: {e})"


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
    if "flashcards" in data:
        for item in data["flashcards"]:
            front = item.get("front", "").strip()
            back  = item.get("back",  "").strip()
            if front and back:
                cards.append({
                    "question": front,
                    "answer":   back,
                    "hint":     item.get("hint", ""),
                    "type":     item.get("type", "mixed"),
                })
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
    if "questions" in data:
        for item in data["questions"]:
            opts = item.get("options", [])
            if not item.get("question") or len(opts) < 2:
                continue
            correct_idx = min(max(int(item.get("correct_index", 0)), 0), len(opts) - 1)
            questions.append({
                "question":     item["question"].strip(),
                "options":      [str(o).strip() for o in opts],
                "correctIndex": correct_idx,
                "explanation":  item.get("explanation", "").strip(),
            })
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


class SummaryRequest(BaseModel):
    topic: str
    file_url: Optional[str] = None
    style:  Literal["bullet", "paragraph", "outline", "map"] = "bullet"
    length: Literal["short", "medium", "long"] = "medium"
    blog_context: Optional[str] = None


class FlashcardRequest(BaseModel):
    topic: str
    file_url:  Optional[str] = None
    card_type: Literal["definition", "formula", "concept", "mixed"] = "mixed"
    num_cards: int = 5
    format:    Literal["qa", "cloze", "image_hint"] = "qa"
    use_vocabulary_pipeline: bool = True
    vocabulary: Optional[list[dict]] = None


class QuizRequest(BaseModel):
    topic: str
    file_url:    Optional[str] = None
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


# ════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════

@app.get("/")
def index():
    return {"message": "StudyMind API v3.1 đang chạy", "docs": "/docs"}


# ── UPLOAD — tự động classify khi upload file ──────────

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload file → tự động classify môn học → lưu ChromaDB với metadata đầy đủ.
    Trả về classification để FE hiển thị tag xác nhận.
    """
    from knowledge_base import ingest_pdf_async

    filename = file.filename or "document"
    text     = await extract_text_from_upload(file)

    if not text.strip():
        raise HTTPException(status_code=422, detail="Không đọc được nội dung file.")

    result = await ingest_pdf_async(pdf_path=filename, text=text, filename=filename)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    clf = result["classification"]

    return {
        "status":   "saved" if clf.confidence >= 0.65 else "needs_confirmation",
        "filename": filename,
        "classification": {
            "subject":      clf.subject,
            "subject_code": clf.subject_code,
            "topic":        clf.topic,
            "keywords":     clf.keywords,
            "content_type": clf.content_type,
            "difficulty":   clf.difficulty,
            "language":     clf.language,
            "confidence":   clf.confidence,
        },
        # Nếu confidence thấp → gửi danh sách môn cho FE hiển thị dropdown chọn lại
        "available_subjects": (
            [{"code": k, "name": v} for k, v in SUBJECT_MAP.items()]
            if clf.confidence < 0.65 else None
        ),
        "message": (
            f"Đã lưu tài liệu vào môn {clf.subject}"
            if clf.confidence >= 0.65
            else f"Không chắc chắn về môn học (confidence: {clf.confidence:.0%}). Vui lòng xác nhận."
        ),
    }


# ── CHAT — classify câu hỏi trước khi gửi orchestrator ──

@app.post("/chat")
async def chat(msg: ChatMessage):
    """Orchestrator routing — mỗi session có history riêng."""
    orch = get_orchestrator()
    sid  = msg.session_id or str(uuid.uuid4())
    history = sessions.setdefault(sid, [])

    # Phân loại câu hỏi → inject context môn học vào orchestrator
    clf            = await classify_message(msg.text)
    subject_context = ""
    if clf.subject_code != "other" and clf.confidence >= 0.65:
        subject_context = (
            f"\n\n[CONTEXT MÔN HỌC - dùng để định hướng trả lời]\n"
            f"Môn: {clf.subject} | Chủ đề: {clf.topic}\n"
            f"Gợi ý phong cách trả lời: {get_agent_hint(clf.subject_code)}"
        )

    reset_chat_metadata()
    enriched_text = msg.text + subject_context
    kb_filter     = build_kb_filter(clf)
    run_context   = {"kb_filter": kb_filter} if kb_filter else None
    response      = await orch.run(enriched_text, context=run_context, history=history)

    meta = get_chat_metadata()
    structured = meta.get("structured")
    if not structured:
        quiz_items = parse_quiz(response)
        if quiz_items:
            structured = {"type": "quiz", "items": [
                {"question": q["question"], "options": q["options"],
                 "correct_index": q["correctIndex"], "explanation": q.get("explanation", "")}
                for q in quiz_items
            ]}
        else:
            fc_items = parse_flashcards(response)
            if fc_items:
                structured = {"type": "flashcard", "items": [
                    {"front": c["question"], "back": c["answer"], "hint": c.get("hint", "")}
                    for c in fc_items
                ]}

    # Lưu history với text gốc (không có context inject)
    history.append({"role": "user",      "content": msg.text})
    history.append({"role": "assistant", "content": response})
    if len(history) > 20:
        sessions[sid] = history[-20:]

    return {
        "session_id": sid,
        "response":   response,
        "agent":      meta.get("agent"),
        "structured": structured,
        "classification": {
            "subject":      clf.subject,
            "subject_code": clf.subject_code,
            "topic":        clf.topic,
            "confidence":   clf.confidence,
        } if clf.confidence >= 0.65 else None,
    }


# ── SUMMARY ────────────────────────────────────────────

@app.post("/summary")
async def create_summary(req: SummaryRequest):
    orch    = get_orchestrator()
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    if content:
        task = (
            f"Tóm tắt tài liệu '{req.topic}' "
            f"theo style '{req.style}' với độ dài '{req.length}'.\n\n"
            f"NỘI DUNG TÀI LIỆU (hãy tóm tắt từ nội dung này, KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{content}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        task = f"Tóm tắt chủ đề '{req.topic}' theo style '{req.style}' với độ dài '{req.length}'"

    if req.blog_context:
        task += (
            f"\n\nPHẦN BỔ SUNG TỪ BÀI BLOG (nối thêm vào cuối bản tóm tắt dưới mục "
            f"\"📚 Kiến thức mở rộng từ blog\", tổng hợp ý chính, không copy nguyên văn):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{req.blog_context}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )

    result = await orch.summary.run(message=task)
    return {"topic": req.topic, "style": req.style, "length": req.length, "summary": result}


# ── FLASHCARD ──────────────────────────────────────────

@app.post("/flashcard")
async def create_flashcard(req: FlashcardRequest):
    orch    = get_orchestrator()
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    clf = await classify_for_generation(req.topic, content, filename=req.topic)

    if req.use_vocabulary_pipeline:
        vocab = await _resolve_vocabulary(
            req.topic, content, req.vocabulary, max(req.num_cards * 2, 20)
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

    gen_ctx     = build_generation_context(clf, task="flashcard")
    kb_filter   = build_kb_filter(clf)
    run_context = {"kb_filter": kb_filter} if kb_filter else None

    if content:
        task = (
            f"{gen_ctx}\n\n"
            f"Tạo {req.num_cards} flashcard về '{req.topic}' "
            f"loại '{req.card_type}' format '{req.format}'.\n\n"
            f"NỘI DUNG TÀI LIỆU (tạo flashcard từ nội dung này, KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{content}\n━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        task = (
            f"{gen_ctx}\n\n"
            f"Tạo {req.num_cards} flashcard về '{req.topic}' "
            f"loại '{req.card_type}' format '{req.format}'."
        )

    raw   = await orch.flashcard.run(message=task, context=run_context)
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
    json_fmt    = '{"questions": [{"question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..."}]}'
    offset_note = f" (bắt đầu từ câu số {offset + 1}, không trùng câu đã có)" if offset > 0 else ""
    prefix      = f"{gen_context}\n\n" if gen_context else ""
    base        = (
        f"{prefix}Tạo {n} câu quiz trắc nghiệm về '{topic}' "
        f"ở mức Bloom's Taxonomy: {bloom_level}{offset_note}.\n\n"
        f"Trả về JSON thuần theo format:\n{json_fmt}"
    )
    if content:
        return (
            f"{prefix}Tạo {n} câu quiz trắc nghiệm về '{topic}' "
            f"ở mức Bloom's Taxonomy: {bloom_level}{offset_note}.\n\n"
            f"NỘI DUNG TÀI LIỆU (KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n{content}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Trả về JSON thuần theo format:\n{json_fmt}"
        )
    return base


@app.post("/quiz")
async def create_quiz(req: QuizRequest):
    """
    Tối đa 15 câu/batch. Nếu num_questions > 15 → tự động chia batch và chạy song song.
    """
    import asyncio
    orch    = get_orchestrator()
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    clf = await classify_for_generation(req.topic, content, filename=req.topic)

    if req.use_vocabulary_pipeline:
        vocab = await _resolve_vocabulary(
            req.topic, content, req.vocabulary, max(req.num_questions * 2, 30)
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

    gen_ctx     = build_generation_context(clf, task="quiz")
    kb_filter   = build_kb_filter(clf)
    run_context = {"kb_filter": kb_filter} if kb_filter else None

    # Chia batch
    batches, remaining, offset = [], req.num_questions, 0
    while remaining > 0:
        batch_size = min(remaining, QUIZ_BATCH_SIZE)
        batches.append((batch_size, offset))
        offset    += batch_size
        remaining -= batch_size

    async def run_batch(n: int, off: int) -> list:
        task = _build_quiz_task(req.topic, req.bloom_level, n, content, off, gen_ctx)
        raw  = await orch.quiz.run(message=task, context=run_context)
        return parse_quiz(raw)

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
        content = await fetch_file_content(req.file_url, req.topic)
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
        sessions.pop(session_id, None)
        return {"message": f"Đã xóa session {session_id}"}
    sessions.clear()
    return {"message": "Đã xóa tất cả sessions"}


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
            {"name": "ClassifierAgent",  "role": "Phân loại môn học tự động"},
        ]
    }


# ════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)