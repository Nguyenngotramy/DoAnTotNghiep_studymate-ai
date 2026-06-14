import asyncio
import unittest

import httpx

from evals.run_eval import EvaluationRunner, summarize


class _TimeoutClient:
    async def post(self, *args, **kwargs):
        raise httpx.ReadTimeout("")


class EvaluationRunnerTests(unittest.TestCase):
    def test_timeout_error_is_not_silently_dropped(self):
        runner = EvaluationRunner(
            base_url="http://localhost:8001",
            service_key="test-key",
            concurrency=1,
            timeout_seconds=1,
        )
        case = {
            "id": "routing_timeout",
            "category": "routing",
            "prompt": "Tao quiz",
            "subject": "Toan hoc",
            "subject_code": "math",
            "expected_route": "quiz",
            "expected_agent": "QuizAgent",
        }

        result = asyncio.run(runner.run_case(_TimeoutClient(), case))

        self.assertFalse(result["passed"])
        self.assertEqual(result["error"], "ReadTimeout")
        self.assertEqual(summarize([result])["errors"], 1)


if __name__ == "__main__":
    unittest.main()
