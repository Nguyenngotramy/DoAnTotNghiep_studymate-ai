"""
StudyMind — Phase 3: Multi-Agent System (Async + Singleton)
=============================================================
Kiến trúc:
  User → Orchestrator → [Tutor | Quiz | Group | Summary | Flashcard]
                      ↓
               ChromaDB + Memory

- Async/await toàn bộ → không block, xử lý 1000 users đồng thời
- Singleton agents → khởi tạo 1 lần, dùng chung, không tốn RAM
- Stateless per-request → mỗi request tự quản lý messages riêng
- Fallback model tự động khi hết credits
- ClassifierAgent inject context môn học vào mọi sub-agent

Chạy: python multi_agent.py
"""

import os
import json
import asyncio
import logging
from contextvars import ContextVar
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Context theo request — tránh race khi nhiều user dùng chung singleton agent
_request_context: ContextVar[dict] = ContextVar("request_context", default={})

load_dotenv()

from knowledge_base import search as kb_search

logger = logging.getLogger(__name__)

# ════════════════════════════════════════
# CLIENT & MODEL CONFIG
# Danh sách đã xác minh còn hoạt động: 29/05/2026
# Nguồn: openrouter.ai/collections/free-models
# ════════════════════════════════════════

async_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# === FALLBACK CHUNG ===
FALLBACK_MODELS = [
    "google/gemini-2.0-flash-001",
    "deepseek/deepseek-v4-flash:free",         # Quality #1, 1M ctx, Tools ✓
    "nvidia/nemotron-3-super-120b-a12b:free",  # Quality #4, 1M ctx, Tools ✓
    "openai/gpt-oss-120b:free",                # Quality #5, 131K ctx, Tools ✓
    "meta-llama/llama-3.3-70b-instruct:free",  # Ổn định lâu dài, Tools ✓
    "z-ai/glm-4.5-air:free",                   # Agent-centric MoE, Tools ✓
    "meta-llama/llama-3.2-3b-instruct:free",   # Nhỏ nhất, fallback cuối
]

# === TUTOR AGENT (Socratic reasoning — cần CoT tốt) ===
TUTOR_MODELS = [
    "deepseek/deepseek-v4-flash:free",         # ★ Reasoning tốt nhất, 1M ctx
    "nvidia/nemotron-3-super-120b-a12b:free",  # Multi-step planning, 1M ctx
    "openai/gpt-oss-120b:free",                # Chain-of-thought tốt
    "meta-llama/llama-3.3-70b-instruct:free",
]

# === QUIZ AGENT (JSON output nghiêm ngặt — cần tool-calling ổn định) ===
QUIZ_MODELS = [
    "openai/gpt-oss-120b:free",                # ★ Structured output / JSON tốt nhất
    "deepseek/deepseek-v4-flash:free",         # Tools + JSON ổn định
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

# === SUMMARY AGENT (nhanh, nhẹ, throughput cao) ===
SUMMARY_MODELS = [
    "meta-llama/llama-3.2-3b-instruct:free",   # ★ Nhanh nhất cho tóm tắt đơn giản
    "meta-llama/llama-3.3-70b-instruct:free",
    "z-ai/glm-4.5-air:free",
    "deepseek/deepseek-v4-flash:free",
]

# === FLASHCARD AGENT (JSON có cấu trúc) ===
FLASHCARD_MODELS = [
    "openai/gpt-oss-120b:free",                # ★ JSON structure tốt nhất
    "deepseek/deepseek-v4-flash:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

# === KEPNER-TREGOE AGENT (phân tích logic phức tạp — cần reasoning nặng) ===
KEPNER_TREGOE_MODELS = [
    "deepseek/deepseek-v4-flash:free",         # ★ Reasoning + 1M context
    "nvidia/nemotron-3-super-120b-a12b:free",  # Multi-agent reasoning tốt
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]


def _is_credit_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "402" in msg or "credits" in msg or "afford" in msg or "billing" in msg


# ════════════════════════════════════════
# BASE AGENT (Async + Stateless)
# ════════════════════════════════════════

class BaseAgent:
    """
    Stateless agent — không giữ state giữa các request.
    Mỗi lần gọi run() là một request độc lập với messages riêng.
    → An toàn khi nhiều user gọi đồng thời.
    """

    def __init__(self, name: str, system_prompt: str, tools: list = None, models: list = None):
        self.name          = name
        self.system_prompt = system_prompt
        self.tools         = tools or []
        self.models        = models or FALLBACK_MODELS
        self.json_mode     = False

    def _get_request_context(self) -> dict:
        return _request_context.get()

    async def run(self, message: str, context: dict = None, history: list = None) -> str:
        logger.info(f"🔵 [{self.name}] xử lý request")

        ctx_token = _request_context.set(context or {})
        try:
            return await self._run_impl(message, context, history)
        finally:
            _request_context.reset(ctx_token)

    async def _run_impl(self, message: str, context: dict = None, history: list = None) -> str:
        if context:
            full_message = (
                f"[Context từ Orchestrator]\n"
                f"{json.dumps(context, ensure_ascii=False)}\n\n"
                f"[Yêu cầu]\n{message}"
            )
        else:
            full_message = message

        # Mỗi request có messages riêng → stateless, thread-safe
        messages = (
            [{"role": "system", "content": self.system_prompt}]
            + (history or [])
            + [{"role": "user", "content": full_message}]
        )

        last_error = None
        for model in self.models:
            try:
                logger.info(f"  🤖 [{self.name}] dùng model: {model}")
                result = await self._run_with_model(model, list(messages))
                if result is not None:
                    return result
            except Exception as e:
                last_error = e
                logger.warning(f"  ⚠️  [{self.name}] {model} gặp lỗi: {e} → thử model tiếp theo...")
                continue

        logger.error(f"  ❌ [{self.name}] Tất cả các model đều thất bại. Lỗi cuối cùng: {last_error}")
        raise last_error or RuntimeError("Tất cả các model đều không khả dụng.")

    async def _run_with_model(self, model: str, messages: list) -> str:
        for _ in range(5):
            kwargs = dict(
                model=model,
                max_tokens=1800,
                messages=messages,
            )
            if self.tools:
                kwargs["tools"]       = [self._convert_tool(t) for t in self.tools]
                kwargs["tool_choice"] = "auto"
            elif self.json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await async_client.chat.completions.create(**kwargs)
            choice   = response.choices[0]

            # Không có tool call → trả về text
            if choice.finish_reason == "stop" or not choice.message.tool_calls:
                return choice.message.content or ""

            # Có tool call → xử lý async
            if choice.finish_reason == "tool_calls":
                messages.append(choice.message)

                # Chạy tất cả tool calls song song (asyncio.gather)
                tool_results = await asyncio.gather(*[
                    self._execute_tool(tool_call)
                    for tool_call in choice.message.tool_calls
                ])
                messages.extend(tool_results)

        return "Agent không phản hồi."

    async def _execute_tool(self, tool_call) -> dict:
        """Wrap tool execution để dùng với asyncio.gather."""
        tool_input = json.loads(tool_call.function.arguments)
        request_context = self._get_request_context()

        def call_tool_with_context():
            ctx_token = _request_context.set(request_context)
            try:
                return self._handle_tool(tool_call.function.name, tool_input)
            finally:
                _request_context.reset(ctx_token)
        # kb_search là sync → chạy trong thread pool để không block event loop
        result = await asyncio.get_event_loop().run_in_executor(
            None, call_tool_with_context
        )
        _record_sources_from_tool_result(result)
        return {
            "role":        "tool",
            "tool_call_id": tool_call.id,
            "content":     json.dumps(result, ensure_ascii=False),
        }

    def _convert_tool(self, tool: dict) -> dict:
        return {
            "type": "function",
            "function": {
                "name":        tool["name"],
                "description": tool["description"],
                "parameters":  tool["input_schema"],
            },
        }

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        return {"error": f"Tool '{tool_name}' chưa được implement"}


# ════════════════════════════════════════
# TUTOR AGENT
# ════════════════════════════════════════

TUTOR_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Tìm kiếm trong tài liệu học. LUÔN dùng trước khi giải thích.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query":     {"type": "string", "description": "Từ khóa tìm kiếm"},
                "n_results": {"type": "integer", "default": 3},
            },
            "required": ["query"],
        },
    }
]

class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="TutorAgent",
            system_prompt="""Bạn là gia sư AI chuyên giải thích khái niệm học thuật.

PHƯƠNG PHÁP: Socratic — không đưa đáp án thẳng, hỏi ngược để kích thích tư duy.
LUÔN: Dùng search_knowledge trước khi giải thích bất kỳ khái niệm nào.
FORMAT:
1. Nối với kiến thức học sinh đã biết
2. Đặt 1 câu hỏi gợi mở
3. Giải thích từng bước nhỏ
4. Đưa ví dụ thực tế phù hợp với môn học
5. Kiểm tra hiểu bằng 1 câu hỏi nhỏ

Nếu có [CONTEXT MÔN HỌC] trong message: điều chỉnh phong cách theo gợi ý đó.
KHÔNG làm bài hộ. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.""",
            tools=TUTOR_TOOLS,
            models=TUTOR_MODELS,
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            # Lấy kb_filter từ context nếu có (inject từ /chat endpoint)
            where_filter = self._get_request_context().get("kb_filter")
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 3),
                where_filter=where_filter,
            )
            if results:
                return {
                    "found":   True,
                    "results": [
                        {
                            "content":  r["content"],
                            "score":    r["relevance_score"],
                            "subject":  r.get("subject", ""),
                            "subject_code": r.get("subject_code", ""),
                            "topic":    r.get("topic", ""),
                            "source":   r.get("source", ""),
                            "filename": r.get("filename", ""),
                        }
                        for r in results
                    ],
                }
            return {"found": False, "message": "Không tìm thấy trong tài liệu."}
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# QUIZ AGENT
# ════════════════════════════════════════

class QuizAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="QuizAgent",
            system_prompt="""Bạn tạo quiz trắc nghiệm theo Bloom's Taxonomy.

Bloom: remember=định nghĩa | understand=giải thích | apply=tính toán | analyze=so sánh/phân tích

OUTPUT (BẮT BUỘC — chỉ JSON thuần):
{"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}

Dùng nội dung trong prompt nếu có. Không thêm text ngoài JSON.""",
            tools=[],
            models=QUIZ_MODELS,
        )
        self.json_mode = True


# ════════════════════════════════════════
# GROUP AGENT
# ════════════════════════════════════════

class GroupAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="GroupAgent",
            system_prompt="""Bạn là chuyên gia tổ chức học nhóm hiệu quả.

NHIỆM VỤ:
- Phân tích điểm mạnh/yếu của từng thành viên
- Đề xuất cách ghép cặp để học cùng nhau (peer learning)
- Phân chia vai trò trong nhóm
- Gợi ý lịch học và phương pháp phù hợp

NGUYÊN TẮC:
- Học sinh giỏi hơn giải thích cho học sinh yếu hơn (Feynman Technique)
- Xoay vai trò để tất cả đều được học qua giảng dạy
- Nhóm 3-4 người là tối ưu

Trả lời cụ thể, có thể làm được ngay. Tiếng Việt.""",
        )


# ════════════════════════════════════════
# SUMMARY AGENT
# ════════════════════════════════════════

SUMMARY_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Lấy nội dung tài liệu cần tóm tắt từ knowledge base. CHỈ dùng khi prompt KHÔNG có phần NỘI DUNG TÀI LIỆU. Sau khi nhận kết quả, tự viết bản tóm tắt ngay - không gọi thêm tool nào.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query":     {"type": "string", "description": "Chủ đề cần tóm tắt"},
                "n_results": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    }
]

class SummaryAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="SummaryAgent",
            system_prompt="""Bạn là chuyên gia tóm tắt tài liệu học thuật.

QUY TRÌNH (2 bước, không hơn):
1. Nếu prompt có phần "NỘI DUNG TÀI LIỆU": dùng trực tiếp -> viết tóm tắt ngay.
2. Nếu KHÔNG có nội dung: gọi search_knowledge một lần -> nhận kết quả -> viết tóm tắt ngay.
   KHÔNG gọi bất kỳ tool nào khác sau search_knowledge.

STYLE:
- bullet:    Danh sách gạch đầu dòng, mỗi điểm 1 ý độc lập
- paragraph: Văn xuôi mạch lạc, có mở-thân-kết
- outline:   Dàn ý cấp 1 -> cấp 2 -> cấp 3, có đánh số
- map:       Sơ đồ dạng text với indent và ký hiệu ->, ●, ○

NGUYÊN TẮC:
- Ưu tiên nội dung từ tài liệu thực, không thêm thông tin ngoài
- Giữ công thức chính xác, không diễn giải sai
- Kết thúc bằng 1-2 "điểm cần nhớ" quan trọng nhất

Tiếng Việt, rõ ràng, dễ học.""",
            tools=SUMMARY_TOOLS,
            models=SUMMARY_MODELS,
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            where_filter = self._get_request_context().get("kb_filter")
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 5),
                where_filter=where_filter,
            )
            return {
                "content":    "\n\n---\n\n".join([r["content"] for r in results]),
                "num_chunks": len(results),
                "sources":    [
                    {
                        "filename": r.get("filename", ""),
                        "source": r.get("source", ""),
                        "subject": r.get("subject", ""),
                        "subject_code": r.get("subject_code", ""),
                        "topic": r.get("topic", ""),
                        "score": r.get("relevance_score"),
                    }
                    for r in results
                ],
            }
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# FLASHCARD AGENT
# ════════════════════════════════════════

FLASHCARD_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Lấy nội dung để tạo flashcard từ knowledge base. CHỈ dùng khi prompt KHÔNG có phần NỘI DUNG TÀI LIỆU. Sau khi nhận kết quả, tự tạo flashcard theo format trong system prompt ngay - không gọi thêm tool nào.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query":     {"type": "string"},
                "n_results": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    }
]

class FlashcardAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="FlashcardAgent",
            system_prompt="""Bạn là chuyên gia tạo flashcard học thuật theo phương pháp spaced repetition.

QUY TRÌNH (2 bước, không hơn):
1. Nếu prompt có phần "NỘI DUNG TÀI LIỆU": CHỈ dùng nội dung đó -> tạo flashcard ngay. KHÔNG gọi search_knowledge.
2. Nếu KHÔNG có nội dung: gọi search_knowledge một lần -> nhận kết quả -> tạo flashcard ngay.
   KHÔNG gọi bất kỳ tool nào khác sau search_knowledge.

Khi đã có NỘI DUNG TÀI LIỆU: tuyệt đối không bịa thêm theo nhãn chủ đề/môn học nếu nội dung file khác chủ đề.

OUTPUT FORMAT (BẮT BUỘC - chỉ trả về JSON thuần, không thêm bất kỳ text nào khác):
{
  "flashcards": [
    {
      "front": "Câu hỏi hoặc thuật ngữ",
      "back": "Câu trả lời, định nghĩa hoặc công thức",
      "hint": "1 câu gợi nhớ ngắn gọn",
      "type": "definition|formula|concept"
    }
  ]
}

CARD TYPE:
- definition: MẶTTRƯỚC=Thuật ngữ/Khái niệm, MẶTSAU=Định nghĩa đầy đủ + ví dụ
- formula: MẶTTRƯỚC=Tình huống/Bài toán, MẶTSAU=Công thức + cách áp dụng
- concept: MẶTTRƯỚC=Câu hỏi "Tại sao/Như thế nào", MẶTSAU=Giải thích ngắn gọn
- mixed: Kết hợp cả 3 loại trên

NGUYÊN TẮC SPACED REPETITION:
- Mỗi flashcard chỉ có 1 ý chính (atomic)
- Mặt trước đủ rõ để nhớ ra mặt sau
- Ghi nhớ ngắn: dùng từ khóa, câu vần, liên tưởng
- Tránh câu trả lời dài hơn 3 dòng

Chính xác, dễ nhớ.
Nếu có [CONTEXT PHÂN LOẠI TÀI LIỆU]: tuân thủ ngôn ngữ (vd. từ vựng Hàn → front Hangul, back tiếng Việt + romanization).""",
            tools=FLASHCARD_TOOLS,
            models=FLASHCARD_MODELS,
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            where_filter = self._get_request_context().get("kb_filter")
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 5),
                where_filter=where_filter,
            )
            return {
                "content": "\n\n".join([r["content"] for r in results]),
                "num_chunks": len(results),
                "sources": [
                    {
                        "filename": r.get("filename", ""),
                        "source": r.get("source", ""),
                        "subject": r.get("subject", ""),
                        "subject_code": r.get("subject_code", ""),
                        "topic": r.get("topic", ""),
                        "score": r.get("relevance_score"),
                    }
                    for r in results
                ],
            }
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# KEPNER-TREGOE AGENT (Phân tích & giải thích vấn đề)
# ════════════════════════════════════════

KT_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Tìm kiếm tài liệu liên quan trước khi phân tích vấn đề.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query":     {"type": "string"},
                "n_results": {"type": "integer", "default": 4},
            },
            "required": ["query"],
        },
    }
]

class KepnerTregoeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="KepnerTregoeAgent",
            system_prompt="""Bạn là chuyên gia phân tích và giải thích vấn đề theo phương pháp Kepner-Tregoe (KT).

KHI NÀO DÙNG KT:
- User hỏi "tại sao", "phân tích nguyên nhân", "xử lý sự cố", "ra quyết định", "đánh giá rủi ro"
- Bài toán thực tế, case study, tình huống phức tạp cần tư duy có cấu trúc

4 BƯỚC KT (chọn bước phù hợp, không nhồi hết nếu câu hỏi đơn giản):

1. **Situation Appraisal (Đánh giá tình huống)**
   - Liệt kê mối quan tâm (concerns) theo mức ưu tiên
   - Phân loại: khẩn cấp / quan trọng / có thể hoãn

2. **Problem Analysis (Phân tích vấn đề) — IS / IS NOT**
   | Khía cạnh   | IS (đúng) | IS NOT (không đúng) |
   |-------------|-----------|---------------------|
   | Object      | ...       | ...                 |
   | Defect      | ...       | ...                 |
   | Location    | ...       | ...                 |
   | Time        | ...       | ...                 |
   | Magnitude   | ...       | ...                 |
   → Distinctions (khác biệt) → Changes (thay đổi) → Nguyên nhân khả dĩ (có căn cứ)

3. **Decision Analysis (Phân tích quyết định)**
   - Mục tiêu (must / want)
   - Phương án thay thế + ưu/nhược + rủi ro
   - Khuyến nghị có lý do

4. **Potential Problem Analysis (Phòng ngừa rủi ro)**
   - Điều gì có thể sai? → Nguyên nhân → Biện pháp phòng ngừa

QUY TẮC:
- LUÔN dùng search_knowledge nếu có tài liệu liên quan
- Giải thích từng bước, dùng bảng markdown khi phù hợp
- Không bịa dữ kiện — thiếu thông tin thì nêu giả định rõ ràng
- Kết thúc bằng 2-3 hành động cụ thể user có thể làm
- Tiếng Việt, logic, dễ theo dõi""",
            tools=KT_TOOLS,
            models=KEPNER_TREGOE_MODELS,
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            where_filter = self._get_request_context().get("kb_filter")
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 4),
                where_filter=where_filter,
            )
            if results:
                return {
                    "found": True,
                    "results": [
                        {
                            "content":  r["content"],
                            "score":    r["relevance_score"],
                            "subject":  r.get("subject", ""),
                            "subject_code": r.get("subject_code", ""),
                            "topic":    r.get("topic", ""),
                            "source":   r.get("source", ""),
                            "filename": r.get("filename", ""),
                        }
                        for r in results
                    ],
                }
            return {"found": False, "message": "Không tìm thấy trong tài liệu."}
        return super()._handle_tool(tool_name, tool_input)


# Theo dõi agent/structured cho /chat
_last_delegate_agent: ContextVar[str | None] = ContextVar("last_delegate_agent", default=None)
_last_structured: ContextVar[dict | None] = ContextVar("last_structured", default=None)
_last_sources: ContextVar[list] = ContextVar("last_sources", default=[])


def _normalize_source(item: dict) -> dict:
    return {
        "filename": item.get("filename", ""),
        "source": item.get("source", ""),
        "subject": item.get("subject", ""),
        "subject_code": item.get("subject_code", ""),
        "topic": item.get("topic", ""),
        "score": item.get("score", item.get("relevance_score")),
    }


def _record_sources_from_tool_result(result: dict) -> None:
    if not isinstance(result, dict):
        return

    raw_sources = []
    if isinstance(result.get("results"), list):
        raw_sources = result["results"]
    elif isinstance(result.get("sources"), list):
        raw_sources = result["sources"]

    sources = []
    for item in raw_sources:
        if isinstance(item, dict):
            sources.append(_normalize_source(item))
        elif item:
            sources.append({
                "filename": str(item),
                "source": "",
                "subject": "",
                "subject_code": "",
                "topic": "",
                "score": None,
            })

    if not sources:
        return

    current = list(_last_sources.get())
    seen = {
        (s.get("filename"), s.get("source"), s.get("topic"))
        for s in current
    }
    for source in sources:
        key = (source.get("filename"), source.get("source"), source.get("topic"))
        if key not in seen:
            seen.add(key)
            current.append(source)
    _last_sources.set(current[:8])


def reset_chat_metadata() -> None:
    _last_delegate_agent.set(None)
    _last_structured.set(None)
    _last_sources.set([])


def get_chat_metadata() -> dict:
    return {
        "agent": _last_delegate_agent.get(),
        "structured": _last_structured.get(),
        "sources": _last_sources.get(),
    }


def _try_parse_structured(agent_name: str, raw: str) -> dict | None:
    import re
    cleaned = re.sub(r"```(?:json)?\s*", "", raw or "").replace("```", "").strip()
    data = None
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                pass
    if not isinstance(data, dict):
        return None
    if agent_name == "QuizAgent" and data.get("questions"):
        return {"type": "quiz", "items": data["questions"]}
    if agent_name == "FlashcardAgent" and data.get("flashcards"):
        return {"type": "flashcard", "items": data["flashcards"]}
    return None



ORCHESTRATOR_TOOLS = [
    {
        "name": "delegate_to_tutor",
        "description": "Chuyển yêu cầu giải thích khái niệm, giảng bài cho Tutor Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task":    {"type": "string"},
                "context": {"type": "object"},
            },
            "required": ["task"],
        },
    },
    {
        "name": "delegate_to_quiz",
        "description": "Chuyển yêu cầu tạo quiz, ôn tập cho Quiz Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic":         {"type": "string"},
                "bloom_level":   {"type": "string", "enum": ["remember", "understand", "apply", "analyze"]},
                "num_questions": {"type": "integer", "default": 3},
            },
            "required": ["topic", "bloom_level"],
        },
    },
    {
        "name": "delegate_to_group",
        "description": "Chuyển yêu cầu liên quan đến nhóm học, phân công, lịch học.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task":    {"type": "string"},
                "members": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["task"],
        },
    },
    {
        "name": "delegate_to_summary",
        "description": "Chuyển yêu cầu tóm tắt tài liệu, bài học, chương sách cho Summary Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic":  {"type": "string"},
                "style":  {"type": "string", "enum": ["bullet", "paragraph", "outline", "map"], "default": "bullet"},
                "length": {"type": "string", "enum": ["short", "medium", "long"], "default": "medium"},
            },
            "required": ["topic"],
        },
    },
    {
        "name": "delegate_to_flashcard",
        "description": "Chuyển yêu cầu tạo flashcard, thẻ ghi nhớ, ôn từ cho Flashcard Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic":     {"type": "string"},
                "card_type": {"type": "string", "enum": ["definition", "formula", "concept", "mixed"], "default": "mixed"},
                "num_cards": {"type": "integer", "default": 5},
                "format":    {"type": "string", "enum": ["qa", "cloze", "image_hint"], "default": "qa"},
            },
            "required": ["topic"],
        },
    },
    {
        "name": "delegate_to_kepner_tregoe",
        "description": "Phân tích/giải thích vấn đề phức tạp theo Kepner-Tregoe: nguyên nhân (IS/IS NOT), quyết định, rủi ro.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task":    {"type": "string", "description": "Mô tả vấn đề hoặc tình huống cần phân tích"},
                "kt_step": {
                    "type": "string",
                    "enum": ["auto", "situation", "problem", "decision", "potential"],
                    "default": "auto",
                    "description": "Bước KT cụ thể hoặc auto để agent chọn",
                },
            },
            "required": ["task"],
        },
    },
]

ORCHESTRATOR_PROMPT = """Bạn là StudyMind Orchestrator — não điều khiển của hệ thống học tập AI.

NHIỆM VỤ: Phân tích yêu cầu và điều phối đúng agent chuyên biệt.

QUY TẮC ROUTING:
- Giải thích khái niệm / học bài mới (Socratic)  → delegate_to_tutor
- Tạo quiz / ôn tập / kiểm tra                   → delegate_to_quiz
- Tổ chức nhóm / lịch học / phân công            → delegate_to_group
- Tóm tắt / tóm gọn / rút ngắn tài liệu          → delegate_to_summary
- Tạo flashcard / thẻ ghi nhớ / ôn từ            → delegate_to_flashcard
- Phân tích vấn đề / nguyên nhân / quyết định / rủi ro (KT) → delegate_to_kepner_tregoe
- Câu hỏi đơn giản → trả lời thẳng, không cần delegate

QUAN TRỌNG:
- Nếu có [CONTEXT MÔN HỌC] trong message → ưu tiên tìm trong tài liệu đúng môn đó
- Luôn delegate đến agent phù hợp, đừng tự xử lý phần chuyên biệt
- Tóm tắt ngắn gọn kết quả từ agent trước khi trả về user
- Nếu yêu cầu cần nhiều agents → delegate lần lượt

Trả lời bằng tiếng Việt, thân thiện."""


class OrchestratorAgent(BaseAgent):
    """
    Stateless orchestrator — không giữ history.
    Mỗi request truyền history riêng vào run().
    """

    def __init__(self):
        # Sub-agents là singleton, khởi tạo 1 lần, dùng chung cho mọi request
        self.tutor     = TutorAgent()
        self.quiz      = QuizAgent()
        self.group     = GroupAgent()
        self.summary   = SummaryAgent()
        self.flashcard = FlashcardAgent()
        self.kt        = KepnerTregoeAgent()

        super().__init__(
            name="Orchestrator",
            system_prompt=ORCHESTRATOR_PROMPT,
            tools=ORCHESTRATOR_TOOLS,
        )

    async def _execute_tool(self, tool_call) -> dict:
        """Override để delegate async sang sub-agents, truyền kb_filter xuống."""
        tool_input = json.loads(tool_call.function.arguments)
        tool_name  = tool_call.function.name
        logger.info(f"\n  🎯 Orchestrator → {tool_name}")

        # Lấy kb_filter từ context của orchestrator (inject từ /chat)
        kb_filter = self._get_request_context().get("kb_filter")

        result = await self._handle_tool_async(tool_name, tool_input, kb_filter=kb_filter)
        return {
            "role":        "tool",
            "tool_call_id": tool_call.id,
            "content":     json.dumps(result, ensure_ascii=False),
        }

    async def _handle_tool_async(self, tool_name: str, tool_input: dict, kb_filter: dict = None) -> dict:
        # Context chứa kb_filter để sub-agent dùng khi search KB
        sub_context = {"kb_filter": kb_filter} if kb_filter else {}

        if tool_name == "delegate_to_tutor":
            merged_context = {**tool_input.get("context", {}), **sub_context}
            result = await self.tutor.run(
                message=tool_input["task"],
                context=merged_context or None,
            )
            _last_delegate_agent.set("TutorAgent")
            return {"agent": "TutorAgent", "response": result}

        elif tool_name == "delegate_to_quiz":
            n = tool_input.get("num_questions", 3)
            topic = tool_input['topic']
            bloom = tool_input['bloom_level']
            task = (
                f"Tạo {n} câu quiz về '{topic}' (Bloom: {bloom}). "
                f"CHỈ trả JSON: {{\"questions\":[{{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],"
                f"\"correct_index\":0,\"explanation\":\"...\"}}]}}"
            )
            result = await self.quiz.run(message=task, context=sub_context or None)
            _last_delegate_agent.set("QuizAgent")
            parsed = _try_parse_structured("QuizAgent", result)
            if parsed:
                _last_structured.set(parsed)
            return {"agent": "QuizAgent", "response": result}

        elif tool_name == "delegate_to_group":
            task = tool_input["task"]
            if "members" in tool_input:
                task += f"\nThành viên: {', '.join(tool_input['members'])}"
            result = await self.group.run(message=task)
            _last_delegate_agent.set("GroupAgent")
            return {"agent": "GroupAgent", "response": result}

        elif tool_name == "delegate_to_summary":
            task = (
                f"Tóm tắt chủ đề '{tool_input['topic']}' "
                f"theo style '{tool_input.get('style', 'bullet')}' "
                f"với độ dài '{tool_input.get('length', 'medium')}'"
            )
            result = await self.summary.run(message=task, context=sub_context or None)
            _last_delegate_agent.set("SummaryAgent")
            return {"agent": "SummaryAgent", "response": result}

        elif tool_name == "delegate_to_flashcard":
            task = (
                f"Tạo {tool_input.get('num_cards', 5)} flashcard về '{tool_input['topic']}' "
                f"loại '{tool_input.get('card_type', 'mixed')}' "
                f"format '{tool_input.get('format', 'qa')}'"
            )
            result = await self.flashcard.run(message=task, context=sub_context or None)
            _last_delegate_agent.set("FlashcardAgent")
            parsed = _try_parse_structured("FlashcardAgent", result)
            if parsed:
                _last_structured.set(parsed)
            return {"agent": "FlashcardAgent", "response": result}

        elif tool_name == "delegate_to_kepner_tregoe":
            step = tool_input.get("kt_step", "auto")
            task = tool_input["task"]
            if step != "auto":
                task = f"[KT step: {step}]\n{task}"
            result = await self.kt.run(message=task, context=sub_context or None)
            _last_delegate_agent.set("KepnerTregoeAgent")
            return {"agent": "KepnerTregoeAgent", "response": result}

        return {"error": f"Tool '{tool_name}' không tồn tại"}


# ════════════════════════════════════════
# SINGLETON — khởi tạo 1 lần khi app start
# ════════════════════════════════════════

_orchestrator: OrchestratorAgent | None = None

def get_orchestrator() -> OrchestratorAgent:
    """
    Trả về singleton OrchestratorAgent.
    Gọi hàm này trong FastAPI endpoint thay vì tạo mới mỗi request.
    """
    global _orchestrator
    if _orchestrator is None:
        logger.info("🚀 Khởi tạo OrchestratorAgent singleton...")
        _orchestrator = OrchestratorAgent()
    return _orchestrator
