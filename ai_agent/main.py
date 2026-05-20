"""
StudyMind — FastAPI Backend v3.0
Cài: pip install fastapi uvicorn httpx python-docx pypdf
Chạy: python main.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
from multi_agent import OrchestratorAgent
import uvicorn
import re
import uuid
import httpx

app = FastAPI(title="StudyMind API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Session store (mỗi user/tab có history riêng) ─────────────
sessions: dict[str, list] = {}
orchestrator = OrchestratorAgent()


# ════════════════════════════════════════════════════════
# FILE FETCHER — lấy nội dung file thực từ URL
# ════════════════════════════════════════════════════════

async def fetch_file_content(file_url: str, filename: str) -> str:
    """
    Fetch nội dung file từ URL, trả về text thuần để inject vào prompt.
    Hỗ trợ: TXT, MD, CSV, DOCX, PDF.
    Fallback: trả về metadata nếu không đọc được.
    """
    if not file_url or file_url == '#':
        return f"Tài liệu: {filename}"

    # Resolve relative URL
    if not file_url.startswith('http'):
        base = "http://localhost:8080/api"
        file_url = base + (file_url if file_url.startswith('/') else '/' + file_url)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(file_url)
            res.raise_for_status()

        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        # ── Plain text / markdown / csv ──────────────────────
        if ext in ('txt', 'md', 'csv'):
            return res.text[:8000]

        # ── DOCX → python-docx ───────────────────────────────
        if ext == 'docx':
            from io import BytesIO
            from docx import Document as DocxDoc
            doc = DocxDoc(BytesIO(res.content))
            text = '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
            return text[:8000]

        # ── PDF → pypdf ──────────────────────────────────────
        if ext == 'pdf':
            from io import BytesIO
            import pypdf
            reader = pypdf.PdfReader(BytesIO(res.content))
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            return '\n'.join(pages_text)[:8000]

        # ── Fallback ─────────────────────────────────────────
        return (
            f"Tài liệu: {filename}\n"
            f"Loại file: {ext.upper() if ext else 'không xác định'}\n"
            "(Không thể đọc nội dung file loại này — chỉ hỗ trợ TXT, MD, CSV, DOCX, PDF)"
        )

    except Exception as e:
        return (
            f"Tài liệu: {filename}\n"
            f"(Lỗi khi đọc file: {e})"
        )


# ════════════════════════════════════════════════════════
# PARSERS — convert agent text output → JSON
# ════════════════════════════════════════════════════════

def parse_flashcards(raw: str) -> list[dict]:
    """
    Convert FlashcardAgent text output → [{question, answer}]

    Hỗ trợ format chuẩn:
        🃏 FLASHCARD 1 — definition
        📌 MẶT TRƯỚC: ...
        ✅ MẶT SAU: ...
        💡 GHI NHỚ: ...
    """
    cards = []

    # Tách từng block flashcard
    blocks = re.split(r'🃏\s*FLASHCARD\s*\d+', raw, flags=re.IGNORECASE)

    for block in blocks:
        if not block.strip():
            continue

        # Lấy MẶT TRƯỚC
        front_match = re.search(
            r'(?:📌\s*)?MẶT TRƯỚC\s*[:\-]?\s*\n?(.*?)(?=(?:✅\s*)?MẶT SAU|$)',
            block,
            re.DOTALL | re.IGNORECASE
        )
        # Lấy MẶT SAU (dừng trước GHI NHỚ hoặc dấu phân cách)
        back_match = re.search(
            r'(?:✅\s*)?MẶT SAU\s*[:\-]?\s*\n?(.*?)(?=(?:💡\s*)?GHI NHỚ|━+|🃏|$)',
            block,
            re.DOTALL | re.IGNORECASE
        )

        if front_match and back_match:
            question = front_match.group(1).strip()
            answer = back_match.group(1).strip()

            if question and answer:
                cards.append({
                    "question": question,
                    "answer": answer
                })

    # Fallback: nếu regex không bắt được
    if not cards:
        cards = _parse_flashcards_fallback(raw)

    return cards


def _parse_flashcards_fallback(raw: str) -> list[dict]:
    """
    Fallback parser: tìm cặp Q/A theo pattern đơn giản hơn
    """
    cards = []
    patterns = [
        (r'(?:Q|Câu hỏi|FRONT)\s*[:\.]\s*(.*?)\n+(?:A|Đáp án|BACK)\s*[:\.]\s*(.*?)(?=\n\n|\Z)', re.DOTALL),
        (r'\*\*Mặt trước\*\*\s*:\s*(.*?)\n+\*\*Mặt sau\*\*\s*:\s*(.*?)(?=\n\n|\Z)', re.DOTALL),
    ]
    for pattern, flags in patterns:
        matches = re.findall(pattern, raw, flags)
        for q, a in matches:
            if q.strip() and a.strip():
                cards.append({"question": q.strip(), "answer": a.strip()})
        if cards:
            break
    return cards


def parse_quiz(raw: str) -> list[dict]:
    """
    Convert QuizAgent text output → [{question, options, correctIndex, explanation}]

    Hỗ trợ format:
        1. Câu hỏi?
        A. Lựa chọn 1
        B. Lựa chọn 2
        C. Lựa chọn 3
        D. Lựa chọn 4
        Đáp án: A
        Giải thích: ...
    """
    questions = []

    # Tách từng câu hỏi theo số thứ tự
    blocks = re.split(r'\n(?=\d+[\.\)]\s)', raw.strip())

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue

        # Dòng đầu = câu hỏi (bỏ số thứ tự)
        question_text = re.sub(r'^\d+[\.\)]\s*', '', lines[0]).strip()

        options = []
        correct_idx = 0
        explanation = ""

        for line in lines[1:]:
            opt_match     = re.match(r'^([A-Da-d])[\.\)]\s*(.*)', line)
            correct_match = re.match(r'(?:Đáp án|Đáp|Answer)\s*[:\-]\s*([A-Da-d])', line, re.IGNORECASE)
            explain_match = re.match(r'(?:Giải thích|Explanation)\s*[:\-]\s*(.*)', line, re.IGNORECASE)

            if opt_match:
                options.append(opt_match.group(2).strip())
            elif correct_match:
                correct_idx = ord(correct_match.group(1).upper()) - ord('A')
            elif explain_match:
                explanation = explain_match.group(1).strip()

        if question_text and len(options) >= 2:
            correct_idx = min(correct_idx, len(options) - 1)
            questions.append({
                "question": question_text,
                "options": options,
                "correctIndex": correct_idx,
                "explanation": explanation
            })

    if not questions:
        questions = _parse_quiz_fallback(raw)

    return questions


def _parse_quiz_fallback(raw: str) -> list[dict]:
    """Fallback: tìm câu hỏi theo markdown hoặc format lạ"""
    questions = []
    blocks = re.split(r'\*\*Câu\s*\d+\*\*|###\s*Câu\s*\d+', raw)
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        question_text = lines[0].rstrip('?') + '?'
        options = []
        correct_idx = 0
        explanation = ""
        for line in lines[1:]:
            opt = re.match(r'^[-\*•]\s*(.*)', line)
            if opt:
                options.append(opt.group(1))
        if question_text and len(options) >= 2:
            questions.append({
                "question": question_text,
                "options": options,
                "correctIndex": correct_idx,
                "explanation": explanation
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
    file_url: Optional[str] = None          # ← URL file thực để fetch nội dung
    style: Literal["bullet", "paragraph", "outline", "map"] = "bullet"
    length: Literal["short", "medium", "long"] = "medium"


class FlashcardRequest(BaseModel):
    topic: str
    file_url: Optional[str] = None          # ← URL file thực để fetch nội dung
    card_type: Literal["definition", "formula", "concept", "mixed"] = "mixed"
    num_cards: int = 5
    format: Literal["qa", "cloze", "image_hint"] = "qa"


class QuizRequest(BaseModel):
    topic: str
    file_url: Optional[str] = None          # ← URL file thực để fetch nội dung
    bloom_level: Literal["remember", "understand", "apply", "analyze"] = "understand"
    num_questions: int = 5


# ════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════

@app.get("/")
def index():
    return {"message": "StudyMind API v3 đang chạy", "docs": "/docs"}


@app.post("/chat")
def chat(msg: ChatMessage):
    """
    Endpoint chính — Orchestrator routing đến agent phù hợp.
    Mỗi session_id có history riêng, tránh xung đột concurrent.
    """
    sid = msg.session_id or str(uuid.uuid4())
    history = sessions.setdefault(sid, [])

    response = orchestrator.run(msg.text, history=history)

    history.append({"role": "user", "content": msg.text})
    history.append({"role": "assistant", "content": response})

    if len(history) > 20:
        sessions[sid] = history[-20:]

    return {
        "session_id": sid,
        "response": response
    }


@app.post("/summary")
async def create_summary(req: SummaryRequest):
    """
    Gọi SummaryAgent với nội dung file thực (nếu có file_url).
    Trả về plain text tóm tắt.
    """
    # Fetch nội dung file thực nếu có file_url
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    # Tạo task với content được inject trực tiếp
    if content:
        task = (
            f"Tóm tắt tài liệu '{req.topic}' "
            f"theo style '{req.style}' với độ dài '{req.length}'.\n\n"
            f"NỘI DUNG TÀI LIỆU (hãy tóm tắt từ nội dung này, KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{content}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        task = (
            f"Tóm tắt chủ đề '{req.topic}' "
            f"theo style '{req.style}' "
            f"với độ dài '{req.length}'"
        )

    result = orchestrator.summary.run(message=task)
    return {
        "topic": req.topic,
        "style": req.style,
        "length": req.length,
        "summary": result,
    }


@app.post("/flashcard")
async def create_flashcard(req: FlashcardRequest):
    """
    Gọi FlashcardAgent với nội dung file thực (nếu có file_url).
    Parse text output → trả [{question, answer}].
    """
    # Fetch nội dung file thực nếu có file_url
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    # Tạo task với content được inject trực tiếp
    if content:
        task = (
            f"Tạo {req.num_cards} flashcard về '{req.topic}' "
            f"loại '{req.card_type}' format '{req.format}'.\n\n"
            f"NỘI DUNG TÀI LIỆU (tạo flashcard từ nội dung này, KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{content}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"BẮT BUỘC dùng format:\n"
            f"🃏 FLASHCARD [n] — [loại]\n"
            f"📌 MẶT TRƯỚC:\n[nội dung]\n\n"
            f"✅ MẶT SAU:\n[nội dung]\n\n"
            f"💡 GHI NHỚ: [gợi nhớ]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        task = (
            f"Tạo {req.num_cards} flashcard về '{req.topic}' "
            f"loại '{req.card_type}' format '{req.format}'. "
            f"BẮT BUỘC dùng format:\n"
            f"🃏 FLASHCARD [n] — [loại]\n"
            f"📌 MẶT TRƯỚC:\n[nội dung]\n\n"
            f"✅ MẶT SAU:\n[nội dung]\n\n"
            f"💡 GHI NHỚ: [gợi nhớ]\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━"
        )

    raw = orchestrator.flashcard.run(message=task)
    cards = parse_flashcards(raw)

    if not cards:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Không parse được flashcard từ agent output",
                "raw": raw[:500]
            }
        )

    return {
        "topic": req.topic,
        "card_type": req.card_type,
        "num_cards": len(cards),
        "flashcards": cards,
    }


@app.post("/quiz")
async def create_quiz(req: QuizRequest):
    """
    Gọi QuizAgent với nội dung file thực (nếu có file_url).
    Parse text output → trả [{question, options, correctIndex, explanation}].
    """
    # Fetch nội dung file thực nếu có file_url
    content = ""
    if req.file_url:
        content = await fetch_file_content(req.file_url, req.topic)

    # Tạo task với content được inject trực tiếp
    if content:
        task = (
            f"Tạo {req.num_questions} câu quiz trắc nghiệm về '{req.topic}' "
            f"ở mức Bloom's Taxonomy: {req.bloom_level}.\n\n"
            f"NỘI DUNG TÀI LIỆU (tạo câu hỏi từ nội dung này, KHÔNG dùng search_knowledge):\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{content}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"BẮT BUỘC dùng format này cho TỪNG câu:\n"
            f"[số]. [Câu hỏi?]\n"
            f"A. [Lựa chọn]\n"
            f"B. [Lựa chọn]\n"
            f"C. [Lựa chọn]\n"
            f"D. [Lựa chọn]\n"
            f"Đáp án: [A/B/C/D]\n"
            f"Giải thích: [1-2 câu]\n\n"
            f"Không thêm chú thích, header, hay markdown khác giữa các câu."
        )
    else:
        task = (
            f"Tạo {req.num_questions} câu quiz trắc nghiệm về '{req.topic}' "
            f"ở mức Bloom's Taxonomy: {req.bloom_level}.\n\n"
            f"BẮT BUỘC dùng format này cho TỪNG câu:\n"
            f"[số]. [Câu hỏi?]\n"
            f"A. [Lựa chọn]\n"
            f"B. [Lựa chọn]\n"
            f"C. [Lựa chọn]\n"
            f"D. [Lựa chọn]\n"
            f"Đáp án: [A/B/C/D]\n"
            f"Giải thích: [1-2 câu]\n\n"
            f"Không thêm chú thích, header, hay markdown khác giữa các câu."
        )

    raw = orchestrator.quiz.run(message=task)
    questions = parse_quiz(raw)

    if not questions:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Không parse được quiz từ agent output",
                "raw": raw[:500]
            }
        )

    return {
        "topic": req.topic,
        "bloom_level": req.bloom_level,
        "num_questions": len(questions),
        "questions": questions,
    }


@app.delete("/history")
def clear_history(session_id: Optional[str] = None):
    """Xóa history của 1 session hoặc tất cả."""
    if session_id:
        sessions.pop(session_id, None)
        return {"message": f"Đã xóa session {session_id}"}
    sessions.clear()
    return {"message": "Đã xóa tất cả sessions"}


@app.get("/agents")
def list_agents():
    return {
        "agents": [
            {"name": "TutorAgent",     "role": "Giải thích khái niệm theo Socratic"},
            {"name": "QuizAgent",      "role": "Tạo bài kiểm tra theo Bloom's Taxonomy"},
            {"name": "GroupAgent",     "role": "Tổ chức và quản lý nhóm học"},
            {"name": "SummaryAgent",   "role": "Tóm tắt tài liệu theo nhiều định dạng"},
            {"name": "FlashcardAgent", "role": "Tạo flashcard theo spaced repetition"},
        ]
    }


# ════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)