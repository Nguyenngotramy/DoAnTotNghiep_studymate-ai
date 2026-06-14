"""Run the StudyMind 100-case evaluation suite against a live AI Agent API."""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import re
import statistics
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from evals.dataset import DATASET, EVAL_TENANT, RAG_DOCUMENTS
else:
    from .dataset import DATASET, EVAL_TENANT, RAG_DOCUMENTS


DEFAULT_TIMEOUT_SECONDS = 90.0
ABSTAIN_THRESHOLD = 1


def normalize_text(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def percentile(values: list[float], percent: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * percent
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def extract_response_text(payload: dict) -> str:
    response = payload.get("response", "")
    if isinstance(response, str):
        return response
    return json.dumps(response, ensure_ascii=False)


def score_routing(case: dict, payload: dict) -> dict:
    actual_route = payload.get("route")
    actual_agent = payload.get("agent")
    route_ok = actual_route == case["expected_route"]
    agent_ok = actual_agent == case["expected_agent"]
    score = (float(route_ok) + float(agent_ok)) / 2
    return {
        "passed": route_ok and agent_ok,
        "score": score,
        "checks": {
            "route": route_ok,
            "agent": agent_ok,
        },
        "actual": {
            "route": actual_route,
            "agent": actual_agent,
        },
    }


def score_rag(case: dict, payload: dict) -> dict:
    response_text = normalize_text(extract_response_text(payload))
    expected_terms = case.get("expected_terms", [])
    matched_terms = [
        term for term in expected_terms if normalize_text(term) in response_text
    ]
    term_coverage = len(matched_terms) / max(len(expected_terms), 1)

    sources = payload.get("sources") or []
    expected_document = case.get("document_id", "")
    source_ok = any(
        expected_document in normalize_text(source.get("filename"))
        or expected_document in normalize_text(source.get("source"))
        for source in sources
        if isinstance(source, dict)
    )
    score = round(term_coverage * 0.8 + float(source_ok) * 0.2, 4)
    return {
        "passed": term_coverage >= 0.5 and source_ok,
        "score": score,
        "checks": {
            "term_coverage": round(term_coverage, 4),
            "source_present": source_ok,
        },
        "actual": {
            "matched_terms": matched_terms,
            "source_count": len(sources),
        },
    }


def score_hallucination(case: dict, payload: dict) -> dict:
    response_text = normalize_text(extract_response_text(payload))
    matched_abstain_terms = [
        term
        for term in case.get("abstain_terms", [])
        if normalize_text(term) in response_text
    ]
    abstained = len(matched_abstain_terms) >= ABSTAIN_THRESHOLD
    return {
        "passed": abstained,
        "score": float(abstained),
        "checks": {"abstained": abstained},
        "actual": {"matched_abstain_terms": matched_abstain_terms},
    }


def _quiz_items(payload: dict) -> list[dict]:
    items = payload.get("questions")
    if isinstance(items, list):
        return [item for item in items if isinstance(item, dict)]
    structured = payload.get("structured") or {}
    items = structured.get("items")
    if isinstance(items, list):
        return [item for item in items if isinstance(item, dict)]
    return []


def score_quiz(case: dict, payload: dict) -> dict:
    questions = _quiz_items(payload)
    expected_count = case["num_questions"]
    count_score = min(len(questions) / max(expected_count, 1), 1.0)

    valid_options = 0
    valid_correct_index = 0
    has_explanation = 0
    nonempty_questions = 0
    normalized_questions = []

    for item in questions:
        question = str(item.get("question") or "").strip()
        options = item.get("options") or []
        raw_index = item.get("correctIndex", item.get("correct_index"))
        explanation = str(item.get("explanation") or "").strip()

        if question:
            nonempty_questions += 1
            normalized_questions.append(normalize_text(question))
        if (
            isinstance(options, list)
            and len(options) == 4
            and len({normalize_text(option) for option in options}) == 4
            and all(str(option).strip() for option in options)
        ):
            valid_options += 1
        if isinstance(raw_index, int) and isinstance(options, list) and 0 <= raw_index < len(options):
            valid_correct_index += 1
        if explanation:
            has_explanation += 1

    denominator = max(len(questions), 1)
    question_score = nonempty_questions / denominator
    options_score = valid_options / denominator
    index_score = valid_correct_index / denominator
    explanation_score = has_explanation / denominator
    uniqueness_score = (
        len(set(normalized_questions)) / max(len(normalized_questions), 1)
        if normalized_questions
        else 0.0
    )
    score = statistics.mean(
        [
            count_score,
            question_score,
            options_score,
            index_score,
            explanation_score,
            uniqueness_score,
        ]
    )
    return {
        "passed": score >= 0.85 and len(questions) >= expected_count,
        "score": round(score, 4),
        "checks": {
            "count": round(count_score, 4),
            "question_text": round(question_score, 4),
            "four_unique_options": round(options_score, 4),
            "correct_index": round(index_score, 4),
            "explanation": round(explanation_score, 4),
            "unique_questions": round(uniqueness_score, 4),
        },
        "actual": {"question_count": len(questions)},
    }


SCORERS = {
    "routing": score_routing,
    "rag_groundedness": score_rag,
    "hallucination": score_hallucination,
    "quiz_quality": score_quiz,
}


class EvaluationRunner:
    def __init__(
        self,
        base_url: str,
        service_key: str,
        concurrency: int,
        timeout_seconds: float,
    ):
        self.base_url = base_url.rstrip("/")
        self.service_key = service_key
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.timeout = httpx.Timeout(timeout_seconds, connect=10.0)

    @property
    def headers(self) -> dict[str, str]:
        if not self.service_key:
            return {}
        return {"X-AI-Service-Key": self.service_key}

    async def healthcheck(self, client: httpx.AsyncClient) -> None:
        response = await client.get(f"{self.base_url}/health")
        response.raise_for_status()

    async def seed_rag_documents(self, client: httpx.AsyncClient) -> None:
        for document in RAG_DOCUMENTS:
            files = {
                "file": (
                    document["filename"],
                    document["content"].encode("utf-8"),
                    "text/plain",
                )
            }
            data = {
                "subject": document["subject"],
                "subject_code": document["subject_code"],
                "tenant_id": EVAL_TENANT,
            }
            response = await client.post(
                f"{self.base_url}/upload",
                headers=self.headers,
                files=files,
                data=data,
            )
            response.raise_for_status()

    async def run_case(self, client: httpx.AsyncClient, case: dict) -> dict:
        async with self.semaphore:
            started = time.perf_counter()
            try:
                if case["category"] == "quiz_quality":
                    payload = {
                        "topic": case["topic"],
                        "subject": case["subject"],
                        "subject_code": case["subject_code"],
                        "doc_topic": case["topic"],
                        "tenant_id": EVAL_TENANT,
                        "bloom_level": case["bloom_level"],
                        "num_questions": case["num_questions"],
                        "use_vocabulary_pipeline": False,
                    }
                    response = await client.post(
                        f"{self.base_url}/quiz",
                        headers=self.headers,
                        json=payload,
                    )
                else:
                    payload = {
                        "text": case["prompt"],
                        "session_id": f"eval:{case['id']}",
                        "tenant_id": EVAL_TENANT,
                        "subject": case.get("subject"),
                        "subject_code": case.get("subject_code"),
                        "doc_topic": case.get("document_id"),
                    }
                    response = await client.post(
                        f"{self.base_url}/chat",
                        headers=self.headers,
                        json=payload,
                    )

                latency_ms = round((time.perf_counter() - started) * 1000, 2)
                response.raise_for_status()
                response_payload = response.json()
                scoring = SCORERS[case["category"]](case, response_payload)
                return {
                    "id": case["id"],
                    "category": case["category"],
                    "passed": scoring["passed"],
                    "score": scoring["score"],
                    "latency_ms": latency_ms,
                    "checks": scoring["checks"],
                    "actual": scoring["actual"],
                    "response_preview": extract_response_text(response_payload)[:500],
                    "error": None,
                }
            except Exception as exc:
                latency_ms = round((time.perf_counter() - started) * 1000, 2)
                error_message = str(exc).strip()
                error_detail = (
                    f"{type(exc).__name__}: {error_message}"
                    if error_message
                    else type(exc).__name__
                )
                return {
                    "id": case["id"],
                    "category": case["category"],
                    "passed": False,
                    "score": 0.0,
                    "latency_ms": latency_ms,
                    "checks": {},
                    "actual": {},
                    "response_preview": "",
                    "error": error_detail,
                }

    async def run(self, cases: list[dict], seed_rag: bool) -> list[dict]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            await self.healthcheck(client)
            if seed_rag and any(
                case["category"] in {"rag_groundedness", "hallucination"}
                for case in cases
            ):
                await self.seed_rag_documents(client)
            return await asyncio.gather(
                *(self.run_case(client, case) for case in cases)
            )


def summarize(results: list[dict]) -> dict:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for result in results:
        grouped[result["category"]].append(result)

    category_summaries = {}
    for category, items in grouped.items():
        latencies = [item["latency_ms"] for item in items]
        category_summaries[category] = {
            "cases": len(items),
            "passed": sum(1 for item in items if item["passed"]),
            "pass_rate": round(
                sum(1 for item in items if item["passed"]) / max(len(items), 1),
                4,
            ),
            "mean_score": round(
                statistics.mean(item["score"] for item in items),
                4,
            ),
            "latency_ms": {
                "mean": round(statistics.mean(latencies), 2),
                "p50": round(percentile(latencies, 0.50), 2),
                "p95": round(percentile(latencies, 0.95), 2),
                "max": round(max(latencies), 2),
            },
            "errors": sum(1 for item in items if item["error"]),
        }

    all_latencies = [item["latency_ms"] for item in results]
    return {
        "cases": len(results),
        "passed": sum(1 for item in results if item["passed"]),
        "pass_rate": round(
            sum(1 for item in results if item["passed"]) / max(len(results), 1),
            4,
        ),
        "mean_score": round(
            statistics.mean(item["score"] for item in results),
            4,
        ),
        "latency_ms": {
            "mean": round(statistics.mean(all_latencies), 2),
            "p50": round(percentile(all_latencies, 0.50), 2),
            "p95": round(percentile(all_latencies, 0.95), 2),
            "max": round(max(all_latencies), 2),
        },
        "errors": sum(1 for item in results if item["error"]),
        "categories": category_summaries,
    }


def markdown_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# StudyMind AI Evaluation Report",
        "",
        f"- Generated: `{report['generated_at']}`",
        f"- API: `{report['config']['base_url']}`",
        f"- Cases: **{summary['cases']}**",
        f"- Passed: **{summary['passed']}**",
        f"- Overall pass rate: **{summary['pass_rate']:.1%}**",
        f"- Mean score: **{summary['mean_score']:.3f}**",
        f"- Latency p50 / p95: **{summary['latency_ms']['p50']:.0f} / {summary['latency_ms']['p95']:.0f} ms**",
        "",
        "## Category Results",
        "",
        "| Category | Cases | Pass rate | Mean score | p50 ms | p95 ms | Errors |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for category, item in summary["categories"].items():
        lines.append(
            f"| {category} | {item['cases']} | {item['pass_rate']:.1%} | "
            f"{item['mean_score']:.3f} | {item['latency_ms']['p50']:.0f} | "
            f"{item['latency_ms']['p95']:.0f} | {item['errors']} |"
        )

    failed = [item for item in report["results"] if not item["passed"]]
    lines.extend(["", "## Failed Cases", ""])
    if not failed:
        lines.append("No failed cases.")
    else:
        lines.append("| ID | Category | Score | Latency ms | Error / Preview |")
        lines.append("|---|---|---:|---:|---|")
        for item in failed[:40]:
            detail = item["error"] or item["response_preview"]
            detail = detail.replace("|", "\\|").replace("\n", " ")[:160]
            lines.append(
                f"| {item['id']} | {item['category']} | {item['score']:.3f} | "
                f"{item['latency_ms']:.0f} | {detail} |"
            )
    return "\n".join(lines) + "\n"


def select_cases(categories: list[str] | None, limit: int | None) -> list[dict]:
    cases = DATASET
    if categories:
        allowed = set(categories)
        cases = [case for case in cases if case["category"] in allowed]
    if limit:
        cases = cases[:limit]
    return cases


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run StudyMind AI evaluation")
    parser.add_argument(
        "--base-url",
        default=os.getenv("AI_AGENT_EVAL_URL", "http://localhost:8001"),
    )
    parser.add_argument(
        "--service-key",
        default=os.getenv("AI_AGENT_SERVICE_KEY", ""),
    )
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument(
        "--category",
        action="append",
        choices=sorted(SCORERS),
        help="Run only one category; repeat to select multiple.",
    )
    parser.add_argument("--limit", type=int)
    parser.add_argument("--no-seed-rag", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent / "results"),
    )
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = parse_args()
    cases = select_cases(args.category, args.limit)
    counts = Counter(case["category"] for case in cases)

    if args.dry_run:
        print(json.dumps({"cases": len(cases), "categories": counts}, ensure_ascii=False, indent=2))
        return 0

    runner = EvaluationRunner(
        base_url=args.base_url,
        service_key=args.service_key,
        concurrency=args.concurrency,
        timeout_seconds=args.timeout,
    )
    results = asyncio.run(runner.run(cases, seed_rag=not args.no_seed_rag))
    generated_at = datetime.now(timezone.utc).isoformat()
    report = {
        "generated_at": generated_at,
        "config": {
            "base_url": args.base_url,
            "tenant_id": EVAL_TENANT,
            "concurrency": args.concurrency,
            "seed_rag": not args.no_seed_rag,
            "categories": dict(counts),
        },
        "summary": summarize(results),
        "results": results,
    }

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = output_dir / f"eval_{stamp}.json"
    markdown_path = output_dir / f"eval_{stamp}.md"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    markdown_path.write_text(markdown_report(report), encoding="utf-8")

    print(markdown_report(report))
    print(f"JSON report: {json_path}")
    print(f"Markdown report: {markdown_path}")
    return 0 if report["summary"]["errors"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
