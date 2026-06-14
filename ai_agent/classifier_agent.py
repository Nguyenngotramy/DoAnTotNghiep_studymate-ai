"""
StudyMind — ClassifierAgent
============================
Tự động phân loại tài liệu/câu hỏi theo:
  - Môn học (subject): Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Tiếng Anh, Lập trình, Kinh tế, Y dược, Khác
  - Chủ đề con (topic): cụ thể hơn, ví dụ "Giải tích", "Từ vựng IELTS", "Cấu trúc dữ liệu"
  - Loại nội dung (content_type): lý thuyết, bài tập, đề thi, tổng hợp
  - Độ khó (difficulty): cơ bản, trung bình, nâng cao
  - Ngôn ngữ (language): vi, en, mixed

Tích hợp vào multi_agent.py:
  1. Upload file  → gắn metadata vào ChromaDB
  2. Chat message → routing agent phù hợp + lọc KB đúng môn
  3. Xác nhận UI  → hiển thị tag cho user confirm

Dùng: from classifier_agent import ClassifierAgent, classify_document, classify_message
"""

import os
import json
import asyncio
import logging
from dataclasses import dataclass, asdict
from openai import AsyncOpenAI
from dotenv import load_dotenv
from llm_capacity import llm_capacity_slot
from llm_runtime import LLM_MAX_RETRIES, LLM_REQUEST_TIMEOUT_SECONDS

load_dotenv()
logger = logging.getLogger(__name__)

async_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    timeout=LLM_REQUEST_TIMEOUT_SECONDS,
    max_retries=LLM_MAX_RETRIES,
)

MODEL = os.getenv("MODEL", "anthropic/claude-haiku-4-5")

FALLBACK_MODELS = [
    MODEL,
    "anthropic/claude-haiku-4-5",
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-chat-v3-5:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/auto",
]


# ════════════════════════════════════════
# DATA CLASSES
# ════════════════════════════════════════

@dataclass
class ClassificationResult:
    subject: str          # Môn học chính
    subject_code: str     # Mã môn: math, physics, chemistry, biology, literature,
                          #         history, geography, english, programming,
                          #         economics, medicine, other
    topic: str            # Chủ đề con cụ thể
    keywords: list[str]   # 3-5 từ khóa đặc trưng
    content_type: str     # theory | exercise | exam | mixed
    difficulty: str       # basic | intermediate | advanced
    language: str         # vi | en | ko | ja | zh | fr | de | es | mixed | other
    confidence: float     # 0.0 - 1.0
    reasoning: str        # Lý do phân loại ngắn gọn

    def to_metadata(self) -> dict:
        """Chuyển sang dict để lưu vào ChromaDB metadata."""
        return {
            "subject": self.subject,
            "subject_code": self.subject_code,
            "topic": self.topic,
            "keywords": ",".join(self.keywords),
            "content_type": self.content_type,
            "difficulty": self.difficulty,
            "language": self.language,
            "confidence": str(self.confidence),
        }

    def to_filter(self) -> dict:
        """Tạo ChromaDB where-filter để lọc đúng môn."""
        return {"subject_code": {"$eq": self.subject_code}}


SUBJECT_MAP = {
    "math":        "Toán học",
    "physics":     "Vật lý",
    "chemistry":   "Hóa học",
    "biology":     "Sinh học",
    "literature":  "Ngữ văn",
    "history":     "Lịch sử",
    "geography":   "Địa lý",
    "english":     "Tiếng Anh",
    "korean":      "Tiếng Hàn",
    "japanese":    "Tiếng Nhật",
    "chinese":     "Tiếng Trung",
    "programming": "Lập trình / CNTT",
    "economics":   "Kinh tế / Kế toán",
    "medicine":    "Y dược / Sức khỏe",
    "law":         "Luật",
    "philosophy":  "Triết học",
    "other":       "Khác",
}


# ════════════════════════════════════════
# SYSTEM PROMPT
# ════════════════════════════════════════

CLASSIFIER_SYSTEM_PROMPT = """Bạn là chuyên gia phân loại tài liệu học thuật đa ngôn ngữ.

NHIỆM VỤ: Phân tích văn bản và trả về JSON phân loại chính xác.

CÁC MÔN HỌC HỢP LỆ (subject_code):
- math:        Toán (đại số, giải tích, hình học, xác suất, thống kê, tối ưu hóa...)
- physics:     Vật lý (cơ học, nhiệt động lực học, điện từ, quang học, lượng tử...)
- chemistry:   Hóa học (vô cơ, hữu cơ, phân tích, hóa lý...)
- biology:     Sinh học (tế bào, di truyền, sinh thái, giải phẫu, vi sinh...)
- literature:  Ngữ văn (thơ, văn xuôi, nghị luận, ngữ pháp tiếng Việt...)
- history:     Lịch sử (thế giới, Việt Nam, cận đại, hiện đại...)
- geography:   Địa lý (tự nhiên, kinh tế, xã hội, bản đồ...)
- english:     Tiếng Anh (ngữ pháp, từ vựng, IELTS, TOEFL, đọc hiểu...)
- korean:      Tiếng Hàn (Hangul, TOPIK, từ vựng, ngữ pháp, hội thoại...)
- japanese:    Tiếng Nhật (Hiragana/Katakana/Kanji, JLPT, từ vựng, ngữ pháp...)
- chinese:     Tiếng Trung (Hán tự, HSK, pinyin, từ vựng, ngữ pháp...)
- programming: Lập trình / CNTT (thuật toán, cấu trúc dữ liệu, web, AI, database...)
- economics:   Kinh tế / Kế toán / Tài chính / Quản trị
- medicine:    Y dược / Sức khỏe / Điều dưỡng
- law:         Luật / Pháp luật / Hành chính
- philosophy:  Triết học / Tâm lý học / Xã hội học
- other:       Không xác định được rõ ràng

OUTPUT FORMAT (chỉ trả về JSON, không thêm bất kỳ text nào):
{
  "subject": "Tên môn học đầy đủ bằng tiếng Việt",
  "subject_code": "mã môn theo danh sách trên",
  "topic": "Chủ đề con cụ thể (ví dụ: Tích phân, Từ vựng IELTS band 7, Cấu trúc dữ liệu cây)",
  "keywords": ["từ_khóa_1", "từ_khóa_2", "từ_khóa_3"],
  "content_type": "theory | exercise | exam | vocabulary | grammar | mixed",
  "difficulty": "basic | intermediate | advanced",
  "language": "vi | en | ko | ja | zh | fr | de | es | mixed | other",
  "confidence": 0.95,
  "reasoning": "Lý do 1 câu ngắn gọn"
}

NGUYÊN TẮC:
- Dựa vào nội dung, thuật ngữ, cấu trúc để phân loại — không đoán theo tiêu đề
- Nếu tài liệu đa môn thì chọn môn CHIẾM ĐA SỐ nội dung
- confidence < 0.6 → dùng subject_code "other"
- keywords phải là thuật ngữ chuyên môn thực sự xuất hiện trong văn bản
- language = ngôn ngữ CHÍNH của nội dung học (vd: tài liệu tiếng Hàn → ko, không phải vi)
- Tài liệu ngoại ngữ chủ yếu là từ vựng → content_type = vocabulary
- Tài liệu ngoại ngữ chủ yếu là ngữ pháp → content_type = grammar"""


# ════════════════════════════════════════
# CLASSIFIER AGENT
# ════════════════════════════════════════

class ClassifierAgent:
    """
    Stateless classifier — phân loại tài liệu/câu hỏi theo môn học.

    Dùng:
        classifier = ClassifierAgent()

        # Phân loại khi upload file
        result = await classifier.classify_document(text_content)

        # Phân loại câu hỏi của user
        result = await classifier.classify_message("Tính tích phân của x^2 từ 0 đến 1")
    """

    def __init__(self):
        self.name = "ClassifierAgent"

    async def classify_document(
        self,
        text: str,
        max_chars: int = 3000,
        filename: str = None,
    ) -> ClassificationResult:
        """
        Phân loại tài liệu từ nội dung text.

        Args:
            text:      Nội dung tài liệu (sẽ lấy 3000 ký tự đầu để classify)
            max_chars: Số ký tự tối đa gửi lên LLM (default 3000 — đủ chính xác, tiết kiệm token)
            filename:  Tên file gốc (dùng làm context bổ sung)
        """
        sample = text[:max_chars]
        prompt_parts = []

        if filename:
            prompt_parts.append(f"[Tên file: {filename}]")

        prompt_parts.append(
            f"Phân loại tài liệu sau:\n\n{sample}"
            + ("\n\n[...nội dung còn tiếp...]" if len(text) > max_chars else "")
        )

        return await self._classify("\n".join(prompt_parts))

    async def classify_message(self, message: str) -> ClassificationResult:
        """
        Phân loại câu hỏi/yêu cầu của user để routing + lọc KB.

        Args:
            message: Câu hỏi hoặc yêu cầu của user
        """
        prompt = f"Phân loại môn học của câu hỏi/yêu cầu sau:\n\n{message}"
        return await self._classify(prompt)

    async def _classify(self, prompt: str) -> ClassificationResult:
        """Core classification — thử fallback models nếu lỗi."""
        for model in FALLBACK_MODELS:
            try:
                logger.info(f"🔍 [{self.name}] classify với model: {model}")
                result = await self._call_model(model, prompt)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"  ⚠️  {model} lỗi: {e} → thử model tiếp theo...")
                continue

        # Fallback mặc định nếu tất cả models đều fail
        return ClassificationResult(
            subject="Không xác định",
            subject_code="other",
            topic="Chưa phân loại",
            keywords=[],
            content_type="mixed",
            difficulty="basic",
            language="vi",
            confidence=0.0,
            reasoning="Không thể phân loại do lỗi hệ thống",
        )

    async def _call_model(self, model: str, prompt: str) -> ClassificationResult | None:
        async with llm_capacity_slot():
            response = await async_client.chat.completions.create(
                model=model,
                max_tokens=500,
                messages=[
                    {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
            )

        raw = response.choices[0].message.content or ""
        # Strip markdown fences nếu có
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        data = json.loads(raw)
        return ClassificationResult(
            subject      = data.get("subject", "Không xác định"),
            subject_code = data.get("subject_code", "other"),
            topic        = data.get("topic", ""),
            keywords     = data.get("keywords", []),
            content_type = data.get("content_type", "mixed"),
            difficulty   = data.get("difficulty", "basic"),
            language     = data.get("language", "vi"),
            confidence   = float(data.get("confidence", 0.5)),
            reasoning    = data.get("reasoning", ""),
        )


# ════════════════════════════════════════
# SINGLETON + CONVENIENCE FUNCTIONS
# ════════════════════════════════════════

_classifier: ClassifierAgent | None = None

def get_classifier() -> ClassifierAgent:
    """Singleton — khởi tạo 1 lần, dùng chung."""
    global _classifier
    if _classifier is None:
        _classifier = ClassifierAgent()
    return _classifier


async def classify_document(text: str, filename: str = None) -> ClassificationResult:
    """Shortcut: phân loại tài liệu khi upload."""
    return await get_classifier().classify_document(text, filename=filename)


async def classify_message(message: str) -> ClassificationResult:
    """Shortcut: phân loại câu hỏi của user."""
    return await get_classifier().classify_message(message)


# ════════════════════════════════════════
# TÍCH HỢP VỚI KNOWLEDGE BASE
# ════════════════════════════════════════

def build_kb_filter(result: ClassificationResult, strict: bool = False) -> dict | None:
    """
    Tạo ChromaDB where-filter từ kết quả phân loại.

    Args:
        result: ClassificationResult từ classify_document/classify_message
        strict: True → filter chặt theo subject_code
                False → chỉ filter khi confidence cao (>= 0.75)

    Returns:
        dict filter cho ChromaDB, hoặc None (không filter — tìm toàn bộ KB)
    """
    if result.subject_code == "other":
        return None
    if not strict and result.confidence < 0.75:
        return None
    return {"subject_code": {"$eq": result.subject_code}}


def enrich_kb_metadata(
    base_metadata: dict,
    classification: ClassificationResult,
) -> dict:
    """
    Gộp metadata gốc với kết quả phân loại để lưu vào ChromaDB.

    Dùng trong knowledge_base.py khi add_document:
        metadata = enrich_kb_metadata({"filename": "bai1.pdf"}, classification)
        collection.add(documents=[text], metadatas=[metadata], ...)
    """
    return {**base_metadata, **classification.to_metadata()}


# ════════════════════════════════════════
# TÍCH HỢP VỚI MULTI_AGENT (Orchestrator)
# ════════════════════════════════════════

SUBJECT_TO_AGENT_HINT = {
    "math":        "Ưu tiên giải thích step-by-step, dùng LaTeX cho công thức",
    "physics":     "Kết hợp công thức và ví dụ thực tế, diagram nếu cần",
    "chemistry":   "Chú trọng phương trình phản ứng và điều kiện",
    "biology":     "Giải thích cơ chế, dùng ví dụ gần gũi",
    "literature":  "Phân tích văn học, cảm thụ thẩm mỹ",
    "history":     "Theo trình tự thời gian, nhân quả sự kiện",
    "geography":   "Kết hợp số liệu thực tế, liên hệ địa phương",
    "english":     "Giải thích bằng cả tiếng Anh lẫn tiếng Việt",
    "korean":      "Dùng Hangul; kèm romanization và nghĩa tiếng Việt",
    "japanese":    "Dùng Hiragana/Katakana/Kanji; kèm romaji và nghĩa tiếng Việt",
    "chinese":     "Dùng Hán tự hoặc pinyin; kèm nghĩa tiếng Việt",
    "programming": "Code example cụ thể, giải thích từng dòng",
    "economics":   "Dùng biểu đồ/số liệu, liên hệ thực tế thị trường",
    "medicine":    "Chính xác về thuật ngữ y khoa, cảnh báo khi cần",
    "other":       "Giải thích tổng quát, hỏi thêm ngữ cảnh nếu cần",
}

def get_agent_hint(subject_code: str) -> str:
    """Lấy gợi ý hành vi cho agent theo môn học."""
    return SUBJECT_TO_AGENT_HINT.get(subject_code, SUBJECT_TO_AGENT_HINT["other"])


# ════════════════════════════════════════
# GỢI Ý SINH QUIZ / FLASHCARD THEO PHÂN LOẠI
# ════════════════════════════════════════

LANGUAGE_LABELS = {
    "vi": "Tiếng Việt",
    "en": "Tiếng Anh",
    "ko": "Tiếng Hàn",
    "ja": "Tiếng Nhật",
    "zh": "Tiếng Trung",
    "fr": "Tiếng Pháp",
    "de": "Tiếng Đức",
    "es": "Tiếng Tây Ban Nha",
    "mixed": "Đa ngôn ngữ",
    "other": "Không xác định",
}

FOREIGN_LANGUAGE_SUBJECTS = {"english", "korean", "japanese", "chinese"}

QUIZ_HINTS_BY_LANGUAGE = {
    "ko": (
        "Viết câu hỏi và các lựa chọn bằng tiếng Hàn (Hangul). "
        "Giải thích (explanation) bằng tiếng Việt, có thể kèm romanization."
    ),
    "ja": (
        "Viết câu hỏi và lựa chọn bằng tiếng Nhật. "
        "Giải thích bằng tiếng Việt, có thể kèm romaji."
    ),
    "zh": (
        "Viết câu hỏi và lựa chọn bằng tiếng Trung (Hán tự hoặc pinyin). "
        "Giải thích bằng tiếng Việt."
    ),
    "en": (
        "Viết câu hỏi và lựa chọn bằng tiếng Anh. "
        "Giải thích có thể kèm tiếng Việt nếu cần."
    ),
}

FLASHCARD_HINTS_BY_LANGUAGE = {
    "ko": (
        "Flashcard từ vựng tiếng Hàn: "
        "front = từ/cụm Hangul; back = nghĩa tiếng Việt + romanization + 1 ví dụ câu ngắn bằng tiếng Hàn."
    ),
    "ja": (
        "Flashcard từ vựng tiếng Nhật: "
        "front = từ Kanji/Kana; back = nghĩa tiếng Việt + romaji + ví dụ câu ngắn."
    ),
    "zh": (
        "Flashcard từ vựng tiếng Trung: "
        "front = Hán tự (kèm pinyin nếu phù hợp); back = nghĩa tiếng Việt + ví dụ câu."
    ),
    "en": (
        "Flashcard từ vựng tiếng Anh: "
        "front = từ/cụm tiếng Anh; back = nghĩa tiếng Việt + ví dụ câu ngắn."
    ),
}

CONTENT_TYPE_HINTS = {
    "vocabulary": "Ưu tiên từ vựng, collocation, cụm từ thực tế trong tài liệu — không bịa từ ngoài nội dung.",
    "grammar":    "Ưu tiên cấu trúc ngữ pháp, mẫu câu, điền khuyết, chọn dạng đúng của từ.",
    "exercise":   "Dạng bài tập thực hành, gần với đề trong tài liệu.",
    "exam":       "Phong cách đề thi, có độ khó và distractor hợp lý.",
    "theory":     "Kiểm tra hiểu khái niệm lý thuyết cốt lõi.",
}


def build_generation_context(clf: ClassificationResult, task: str = "quiz") -> str:
    """
    Tạo block context inject vào prompt Quiz/Flashcard sau bước phân loại.

    Args:
        clf:  Kết quả classify_document hoặc classify_message
        task: "quiz" | "flashcard"
    """
    lang_label = LANGUAGE_LABELS.get(clf.language, clf.language)
    lines = [
        "[CONTEXT PHÂN LOẠI TÀI LIỆU — BẮT BUỘC TUÂN THỦ]",
        f"- Môn: {clf.subject} ({clf.subject_code}) | Chủ đề: {clf.topic}",
        f"- Ngôn ngữ chính: {lang_label} ({clf.language})",
        f"- Loại nội dung: {clf.content_type} | Độ khó: {clf.difficulty}",
    ]
    if clf.keywords:
        lines.append(f"- Từ khóa: {', '.join(clf.keywords[:8])}")

    lines.append("")
    lines.append("QUY TẮC SINH NỘI DUNG:")

    ctype_hint = CONTENT_TYPE_HINTS.get(clf.content_type)
    if ctype_hint:
        lines.append(f"- {ctype_hint}")

    is_foreign = (
        clf.subject_code in FOREIGN_LANGUAGE_SUBJECTS
        or clf.language not in ("vi", "mixed", "other")
    )

    if task == "flashcard":
        if clf.content_type == "vocabulary" or is_foreign:
            lines.append(f"- {FLASHCARD_HINTS_BY_LANGUAGE.get(clf.language, 'Mặt trước = thuật ngữ chính; mặt sau = định nghĩa + ví dụ ngắn.')}")
        else:
            lines.append("- Giữ format JSON flashcard; nội dung bám sát tài liệu và môn học đã phân loại.")
    else:
        if is_foreign:
            lines.append(f"- {QUIZ_HINTS_BY_LANGUAGE.get(clf.language, 'Viết câu hỏi bằng ngôn ngữ của tài liệu; giải thích bằng tiếng Việt.')}")
        else:
            lines.append(f"- {get_agent_hint(clf.subject_code)}")

    if clf.language == "vi" and clf.subject_code not in FOREIGN_LANGUAGE_SUBJECTS:
        lines.append("- Viết toàn bộ câu hỏi và giải thích bằng tiếng Việt.")
    elif clf.language not in ("vi", "mixed", "other"):
        lines.append("- KHÔNG dịch sang tiếng Việt phần câu hỏi/lựa chọn nếu tài liệu là ngoại ngữ — giữ nguyên ngôn ngữ gốc.")

    lines.append("- Chỉ dùng kiến thức từ tài liệu/nội dung đã cung cấp, không bịa thêm.")
    return "\n".join(lines)


def classification_to_api(clf: ClassificationResult) -> dict:
    """Format classification cho response API."""
    return {
        "subject":      clf.subject,
        "subject_code": clf.subject_code,
        "topic":        clf.topic,
        "language":     clf.language,
        "language_label": LANGUAGE_LABELS.get(clf.language, clf.language),
        "content_type": clf.content_type,
        "difficulty":   clf.difficulty,
        "keywords":     clf.keywords,
        "confidence":   clf.confidence,
    }


async def classify_for_generation(
    topic: str,
    content: str = "",
    filename: str | None = None,
) -> ClassificationResult:
    """
    Phân loại trước khi tạo quiz/flashcard.
    Có nội dung file → classify_document; chỉ có topic → classify_message.
    """
    if content and len(content.strip()) > 80:
        return await classify_document(content, filename=filename or topic)
    return await classify_message(f"Tạo bài học/quiz/flashcard về: {topic}")


# ════════════════════════════════════════
# TEST
# ════════════════════════════════════════

async def _demo():
    logging.basicConfig(level=logging.INFO)

    test_cases = [
        ("Đạo hàm của hàm số f(x) = x^3 - 2x + 1 tại x=2 bằng bao nhiêu?", "message"),
        ("IELTS Reading: The passage discusses the impact of climate change on Arctic ecosystems.", "doc"),
        ("Cho mạch điện RLC nối tiếp, tìm tổng trở khi f = 50Hz", "message"),
        ("class BinaryTree: def insert(self, val): ...", "doc"),
        ("Phân tích hình ảnh người lính trong bài thơ Tây Tiến của Quang Dũng", "message"),
    ]

    classifier = get_classifier()

    for text, mode in test_cases:
        print(f"\n{'='*60}")
        print(f"Input ({mode}): {text[:80]}...")
        if mode == "message":
            result = await classifier.classify_message(text)
        else:
            result = await classifier.classify_document(text)

        print(f"  📚 Môn:       {result.subject} ({result.subject_code})")
        print(f"  📌 Chủ đề:    {result.topic}")
        print(f"  🏷️  Keywords:  {', '.join(result.keywords)}")
        print(f"  📄 Loại:      {result.content_type} | Độ khó: {result.difficulty}")
        print(f"  🌐 Ngôn ngữ:  {result.language} | Confidence: {result.confidence:.0%}")
        print(f"  💡 Lý do:     {result.reasoning}")
        print(f"  🤖 Agent hint: {get_agent_hint(result.subject_code)}")
        print(f"  🔎 KB filter:  {build_kb_filter(result)}")


if __name__ == "__main__":
    asyncio.run(_demo())
