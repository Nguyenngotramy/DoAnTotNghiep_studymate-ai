import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main as main_module
import multi_agent
from chat_store import chat_store
from llm_runtime import LLMTurnTimeoutError
from multi_agent import BaseAgent


class _SlowAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="SlowAgent", system_prompt="test")

    async def _run_impl(self, message, context=None, history=None):
        await asyncio.sleep(0.1)
        return "late"


class _FailingOrchestrator:
    async def run(self, message, context=None, history=None):
        raise RuntimeError("provider unavailable")


class _SlowOrchestrator:
    async def run(self, message, context=None, history=None):
        await asyncio.sleep(0.1)
        return "late"


class _GroundedOrchestrator:
    async def run(self, message, context=None, history=None):
        return "grounded answer"


class ProductionHardeningTests(unittest.TestCase):
    def test_agent_turn_has_a_total_deadline(self):
        with patch.object(multi_agent, "LLM_TURN_TIMEOUT_SECONDS", 0.01):
            with self.assertRaises(LLMTurnTimeoutError):
                asyncio.run(_SlowAgent().run("hello"))

    def test_ready_endpoint_is_public_and_reports_configuration(self):
        previous = main_module.AI_AGENT_SERVICE_KEY
        main_module.AI_AGENT_SERVICE_KEY = "service-secret"
        try:
            with patch.object(
                main_module,
                "provider_status",
                return_value={"configured": True, "ready": True},
            ):
                response = TestClient(main_module.app).get("/ready")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["provider"]["configured"])
        finally:
            main_module.AI_AGENT_SERVICE_KEY = previous

    def test_chat_http_operation_has_a_total_deadline(self):
        previous_key = main_module.AI_AGENT_SERVICE_KEY
        main_module.AI_AGENT_SERVICE_KEY = ""
        try:
            with (
                patch.object(main_module, "AI_HTTP_TIMEOUT_SECONDS", 0.01),
                patch.object(
                    main_module,
                    "get_orchestrator",
                    return_value=_SlowOrchestrator(),
                ),
            ):
                response = TestClient(main_module.app).post(
                    "/chat",
                    json={"text": "Mot yeu cau cham khong co route nhanh"},
                )
            self.assertEqual(response.status_code, 504)
        finally:
            main_module.AI_AGENT_SERVICE_KEY = previous_key

    def test_failed_chat_turn_is_not_written_to_history(self):
        session_id = "test:failed-turn"
        tenant_id = "test:tenant"
        storage_id = f"{tenant_id}::{session_id}"
        chat_store.clear(storage_id)
        previous = main_module.AI_AGENT_SERVICE_KEY
        main_module.AI_AGENT_SERVICE_KEY = ""
        try:
            with patch.object(
                main_module,
                "get_orchestrator",
                return_value=_FailingOrchestrator(),
            ), patch.object(
                main_module,
                "_search_kb_context",
                new=AsyncMock(return_value=("", [])),
            ):
                response = TestClient(main_module.app).post(
                    "/chat",
                    json={
                        "text": "Mot yeu cau khong co route nhanh",
                        "session_id": session_id,
                        "tenant_id": tenant_id,
                    },
                )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["agent"], "System")
            self.assertEqual(chat_store.get_messages(storage_id), [])
        finally:
            main_module.AI_AGENT_SERVICE_KEY = previous
            chat_store.clear(storage_id)

    def test_chat_prefetch_returns_sources(self):
        source = {
            "filename": "lesson.txt",
            "source": "lesson.txt",
            "subject": "Toan hoc",
            "subject_code": "math",
            "topic": "Orion",
            "score": 0.9,
        }
        previous = main_module.AI_AGENT_SERVICE_KEY
        main_module.AI_AGENT_SERVICE_KEY = ""
        try:
            with patch.object(
                main_module,
                "get_orchestrator",
                return_value=_GroundedOrchestrator(),
            ), patch.object(
                main_module,
                "_search_kb_context",
                new=AsyncMock(return_value=("Orion code is ORION-324.", [source])),
            ):
                response = TestClient(main_module.app).post(
                    "/chat",
                    json={
                        "text": "Ma Orion?",
                        "tenant_id": "test:tenant",
                        "subject_code": "math",
                    },
                )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["sources"], [source])
        finally:
            main_module.AI_AGENT_SERVICE_KEY = previous


if __name__ == "__main__":
    unittest.main()
