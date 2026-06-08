"""
Build subject metadata from labels that already exist on groups/documents.

This replaces the old LLM classification step for group documents: each group is
already tied to one concrete subject, so the AI service should trust that label.
"""

from classifier_agent import ClassificationResult, SUBJECT_MAP


SUBJECT_ALIASES = {
    "toan": "math",
    "toan hoc": "math",
    "math": "math",
    "vat ly": "physics",
    "vat li": "physics",
    "physics": "physics",
    "hoa": "chemistry",
    "hoa hoc": "chemistry",
    "chemistry": "chemistry",
    "sinh": "biology",
    "sinh hoc": "biology",
    "biology": "biology",
    "ngu van": "literature",
    "van": "literature",
    "literature": "literature",
    "lich su": "history",
    "history": "history",
    "dia ly": "geography",
    "dia li": "geography",
    "geography": "geography",
    "tieng anh": "english",
    "english": "english",
    "tieng han": "korean",
    "korean": "korean",
    "tieng nhat": "japanese",
    "japanese": "japanese",
    "tieng trung": "chinese",
    "chinese": "chinese",
    "lap trinh": "programming",
    "cntt": "programming",
    "cong nghe thong tin": "programming",
    "programming": "programming",
    "kinh te": "economics",
    "ke toan": "economics",
    "economics": "economics",
    "y duoc": "medicine",
    "y khoa": "medicine",
    "medicine": "medicine",
    "luat": "law",
    "law": "law",
    "triet hoc": "philosophy",
    "philosophy": "philosophy",
}


def _strip_accents(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFD", value or "")
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def normalize_subject_code(subject: str | None = None, subject_code: str | None = None) -> str:
    code = (subject_code or "").strip().lower()
    if code in SUBJECT_MAP:
        return code

    raw = (subject or "").strip()
    if not raw:
        return "other"

    key = _strip_accents(raw).lower()
    key = " ".join(key.replace("/", " ").replace("-", " ").split())
    if key in SUBJECT_ALIASES:
        return SUBJECT_ALIASES[key]

    for alias, alias_code in SUBJECT_ALIASES.items():
        if alias in key:
            return alias_code

    for known_code, known_name in SUBJECT_MAP.items():
        known_key = _strip_accents(known_name).lower()
        if known_code in key or known_key in key or key in known_key:
            return known_code

    return "other"


def classification_from_subject(
    subject: str | None = None,
    subject_code: str | None = None,
    topic: str | None = None,
    filename: str | None = None,
) -> ClassificationResult:
    code = normalize_subject_code(subject=subject, subject_code=subject_code)
    display_subject = (subject or "").strip() or SUBJECT_MAP.get(code, SUBJECT_MAP["other"])
    if code != "other":
        display_subject = SUBJECT_MAP.get(code, display_subject)

    language = {
        "english": "en",
        "korean": "ko",
        "japanese": "ja",
        "chinese": "zh",
    }.get(code, "vi")

    return ClassificationResult(
        subject=display_subject,
        subject_code=code,
        topic=(topic or filename or display_subject or "Tai lieu").strip(),
        keywords=[],
        content_type="mixed",
        difficulty="intermediate",
        language=language,
        confidence=1.0 if code != "other" else 0.0,
        reasoning="Dung nhan mon hoc da gan san tu nhom/tai lieu, khong phan loai bang AI.",
    )


def build_compact_context(
    clf: ClassificationResult,
    task: str = "quiz",
) -> str:
    """Context ngắn gọn — tiết kiệm token, không gọi ClassifierAgent."""
    if clf.subject_code == "other":
        return ""
    parts = [f"[Môn: {clf.subject}]"]
    topic = (clf.topic or "").strip()
    if topic and topic.lower() not in {clf.subject.lower(), "tai lieu", clf.subject_code}:
        parts.append(f"[Chủ đề: {topic}]")
    if task == "quiz":
        parts.append("Trả về JSON thuần: {\"questions\":[...]}")
    elif task == "flashcard":
        parts.append("Trả về JSON thuần: {\"flashcards\":[...]}")
    return " ".join(parts)
