import os
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError


os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("ALLOWED_FILE_HOSTS", "backend,res.cloudinary.com")
os.environ.setdefault("BACKEND_API_URL", "http://backend:8080/api")

import main as main_module  # noqa: E402
from main import (  # noqa: E402
    ChatMessage,
    QuizRequest,
    _build_scoped_kb_filter,
    _append_unique_quiz_questions,
    _is_language_vocabulary_request,
    _looks_like_vocabulary_content,
    _preset_vocabulary_flashcards,
    _resolve_and_validate_file_url,
    _should_use_vocabulary_pipeline,
)
from knowledge_base import chunk_text  # noqa: E402
from subject_metadata import classification_from_subject  # noqa: E402
from provider_config import build_ai_context, validate_model  # noqa: E402


class SecurityAndRagTests(unittest.TestCase):
    def test_relative_upload_url_uses_trusted_backend(self):
        resolved = _resolve_and_validate_file_url("/uploads/group-a/lesson.pdf")
        self.assertEqual(
            resolved,
            "http://backend:8080/api/uploads/group-a/lesson.pdf",
        )

    def test_untrusted_remote_host_is_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            _resolve_and_validate_file_url("http://169.254.169.254/latest/meta-data")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_service_key_protects_non_public_endpoints(self):
        previous = main_module.AI_AGENT_SERVICE_KEY
        main_module.AI_AGENT_SERVICE_KEY = "test-service-secret"
        try:
            client = TestClient(main_module.app)
            self.assertEqual(client.get("/subjects").status_code, 401)
            response = client.get(
                "/subjects",
                headers={"X-AI-Service-Key": "test-service-secret"},
            )
            self.assertEqual(response.status_code, 200)
        finally:
            main_module.AI_AGENT_SERVICE_KEY = previous

    def test_kb_filter_is_scoped_by_tenant_and_subject(self):
        clf = classification_from_subject(subject_code="math", topic="Calculus")
        scoped = _build_scoped_kb_filter(clf, "group:123")
        self.assertEqual(
            scoped,
            {
                "$and": [
                    {"tenant_id": {"$eq": "group:123"}},
                    {"subject_code": {"$eq": "math"}},
                ]
            },
        )

    def test_missing_tenant_cannot_search_global_kb(self):
        clf = classification_from_subject(subject_code="math", topic="Calculus")
        self.assertEqual(
            _build_scoped_kb_filter(clf, None),
            {"tenant_id": {"$eq": "__no_tenant_access__"}},
        )

    def test_request_limits_are_validated(self):
        self.assertEqual(QuizRequest(topic="Math").num_questions, 20)
        with self.assertRaises(ValidationError):
            QuizRequest(topic="Math", num_questions=61)
        with self.assertRaises(ValidationError):
            ChatMessage(text="")

    def test_chunking_preserves_overlap_and_bounds(self):
        text = "\n\n".join(
            [
                "First paragraph contains a complete learning concept. " * 8,
                "Second paragraph contains another complete learning concept. " * 8,
            ]
        )
        chunks = chunk_text(text, chunk_size=300, overlap=40)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 340 for chunk in chunks))

    def test_provider_model_must_match(self):
        with self.assertRaises(ValueError):
            validate_model("anthropic", "openai/gpt-oss-120b")

    def test_byok_context_keeps_provider_model_and_key(self):
        context = build_ai_context(
            provider="anthropic",
            model="claude-haiku-4-5",
            api_key="sk-ant-test",
            extra={"kb_filter": {"tenant_id": {"$eq": "group:1"}}},
        )
        self.assertEqual(context["provider"], "anthropic")
        self.assertEqual(context["model"], "claude-haiku-4-5")
        self.assertEqual(context["api_key"], "sk-ant-test")
        self.assertIn("kb_filter", context)

    def test_language_vocabulary_request_detection(self):
        self.assertTrue(
            _is_language_vocabulary_request(
                "Tạo 10 flashcard từ vựng tiếng Hàn TOPIK 1"
            )
        )
        self.assertFalse(
            _is_language_vocabulary_request(
                "Tạo 10 flashcard về đạo hàm"
            )
        )

    def test_english_a2_preset_is_complete(self):
        cards = _preset_vocabulary_flashcards(
            "Tạo 10 flashcard từ vựng tiếng Anh level A2",
            10,
        )
        self.assertIsNotNone(cards)
        self.assertEqual(len(cards), 10)
        self.assertEqual(cards[0]["question"], "arrive")
        self.assertIn("Ví dụ:", cards[0]["answer"])

    def test_language_subject_does_not_force_vocabulary_pipeline(self):
        grammar_lesson = (
            "The present perfect is formed with have or has and a past participle. "
            "It is used for experiences and actions connected to the present. "
            "Students compare it with the simple past and complete several exercises."
        )
        self.assertFalse(
            _should_use_vocabulary_pipeline(
                enabled=True,
                topic="Unit 4 - Present perfect grammar",
                content=grammar_lesson,
                provided=None,
                file_ext="pdf",
            )
        )

    def test_general_csv_does_not_force_vocabulary_pipeline(self):
        grade_csv = (
            "student,math,physics,average\n"
            "An,8.0,7.5,7.75\n"
            "Binh,6.5,8.0,7.25\n"
            "Chi,9.0,8.5,8.75\n"
        )
        self.assertFalse(_looks_like_vocabulary_content(grade_csv))
        self.assertFalse(
            _should_use_vocabulary_pipeline(
                enabled=True,
                topic="Phân tích bảng điểm",
                content=grade_csv,
                provided=None,
                file_ext="csv",
            )
        )

    def test_explicit_or_structured_vocabulary_uses_vocabulary_pipeline(self):
        vocabulary_table = (
            "word\tmeaning\texample\n"
            "borrow\tmượn\tCan I borrow your pen?\n"
            "arrive\tđến nơi\tWe arrived early.\n"
            "careful\tcẩn thận\tBe careful.\n"
        )
        self.assertTrue(_looks_like_vocabulary_content(vocabulary_table))
        self.assertTrue(
            _should_use_vocabulary_pipeline(
                enabled=True,
                topic="Unit 1 vocabulary",
                content=vocabulary_table,
                provided=None,
                file_ext="csv",
            )
        )
        self.assertTrue(
            _should_use_vocabulary_pipeline(
                enabled=True,
                topic="Bài học tiếng Anh",
                content="",
                provided=[{"tu_vung": "hello", "nghia": "xin chào"}],
                file_ext="",
            )
        )

    def test_disabled_vocabulary_pipeline_is_respected(self):
        self.assertFalse(
            _should_use_vocabulary_pipeline(
                enabled=False,
                topic="Tạo flashcard từ vựng tiếng Anh",
                content="word\tmeaning\nhello\txin chào\nbook\tsách",
                provided=None,
                file_ext="csv",
            )
        )

    def test_quiz_dedupe_keeps_requested_limit(self):
        target = [
            {
                "question": "What is photosynthesis?",
                "options": ["A", "B"],
                "correctIndex": 0,
            }
        ]
        candidates = [
            {
                "question": "  what   is photosynthesis? ",
                "options": ["A", "B"],
                "correctIndex": 0,
            },
            {
                "question": "Where does photosynthesis occur?",
                "options": ["A", "B"],
                "correctIndex": 1,
            },
            {
                "question": "Why is chlorophyll important?",
                "options": ["A", "B"],
                "correctIndex": 0,
            },
        ]
        _append_unique_quiz_questions(target, candidates, 2)
        self.assertEqual(len(target), 2)
        self.assertEqual(target[1]["question"], "Where does photosynthesis occur?")


if __name__ == "__main__":
    unittest.main()
