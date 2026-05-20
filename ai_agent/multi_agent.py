"""
StudyMind — Phase 3: Multi-Agent System
=========================================
Kiến trúc:
  User → Orchestrator → [Tutor | Quiz | Group | Summary | Flashcard]
                      ↓
               ChromaDB + Memory

Chạy: python multi_agent.py
"""

import anthropic
import json
from dotenv import load_dotenv

load_dotenv()

from knowledge_base import search as kb_search

client = anthropic.Anthropic()
MODEL = "claude-opus-4-5"


# ════════════════════════════════════════
# BASE AGENT
# ════════════════════════════════════════

class BaseAgent:
    def __init__(self, name: str, system_prompt: str, tools: list = None):
        self.name = name
        self.system_prompt = system_prompt
        self.tools = tools or []

    def run(self, message: str, context: dict = None, history: list = None) -> str:
        print(f"🔵 [{self.name}] đang xử lý...")
        if context:
            full_message = f"[Context từ Orchestrator]\n{json.dumps(context, ensure_ascii=False)}\n\n[Yêu cầu]\n{message}"
        else:
            full_message = message

        messages = (history or []) + [{"role": "user", "content": full_message}]

        for _ in range(5):
            kwargs = dict(
                model=MODEL,
                max_tokens=2048,
                system=self.system_prompt,
                messages=messages,
            )
            if self.tools:
                kwargs["tools"] = self.tools

            response = client.messages.create(**kwargs)

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if hasattr(block, "text"):
                        return block.text
                return ""

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self._handle_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result, ensure_ascii=False)
                        })
                messages.append({"role": "user", "content": tool_results})

        return "Agent không phản hồi."

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
                "query": {"type": "string", "description": "Từ khóa tìm kiếm"},
                "n_results": {"type": "integer", "default": 3}
            },
            "required": ["query"]
        }
    }
]

class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="TutorAgent",
            system_prompt="""Bạn là gia sư AI chuyên giải thích khái niệm toán học.

PHƯƠNG PHÁP: Socratic — không đưa đáp án thẳng, hỏi ngược để kích thích tư duy.
LUÔN: Dùng search_knowledge trước khi giải thích bất kỳ khái niệm nào.
FORMAT:
1. Nối với kiến thức học sinh đã biết
2. Đặt 1 câu hỏi gợi mở
3. Giải thích từng bước nhỏ
4. Đưa ví dụ thực tế (vật lý, kinh tế, cuộc sống)
5. Kiểm tra hiểu bằng 1 câu hỏi nhỏ

KHÔNG làm bài hộ. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.""",
            tools=TUTOR_TOOLS
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 3)
            )
            if results:
                return {
                    "found": True,
                    "results": [{"content": r["content"], "score": r["relevance_score"]} for r in results]
                }
            return {"found": False, "message": "Không tìm thấy trong tài liệu."}
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# QUIZ AGENT
# ════════════════════════════════════════

QUIZ_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Lấy nội dung tài liệu để tạo câu hỏi chính xác. CHỈ dùng khi prompt KHÔNG có phần NỘI DUNG TÀI LIỆU.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "n_results": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    },
    {
        "name": "generate_questions",
        "description": "Tạo câu hỏi theo Bloom's Taxonomy từ nội dung đã tìm được.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "bloom_level": {
                    "type": "string",
                    "enum": ["remember", "understand", "apply", "analyze"]
                },
                "num_questions": {"type": "integer", "default": 3}
            },
            "required": ["content", "bloom_level"]
        }
    }
]

class QuizAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="QuizAgent",
            system_prompt="""Bạn là chuyên gia tạo bài kiểm tra theo Bloom's Taxonomy.

QUY TRÌNH:
- Nếu prompt có phần "NỘI DUNG TÀI LIỆU": dùng trực tiếp nội dung đó, KHÔNG gọi search_knowledge.
- Nếu prompt KHÔNG có nội dung: dùng search_knowledge để lấy tài liệu, rồi dùng generate_questions.

BLOOM'S TAXONOMY:
- remember: "Định nghĩa X là gì? Viết công thức Y."
- understand: "Giải thích tại sao... Mô tả bằng lời..."
- apply: "Tính... Giải bài toán... Áp dụng X vào..."
- analyze: "So sánh... Tại sao... Điều gì xảy ra nếu..."

Đặt câu hỏi từ nội dung thực, không bịa. Tiếng Việt rõ ràng.""",
            tools=QUIZ_TOOLS
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            results = kb_search(query=tool_input["query"], n_results=tool_input.get("n_results", 5))
            combined = "\n\n".join([r["content"] for r in results])
            return {"content": combined, "num_chunks": len(results)}
        elif tool_name == "generate_questions":
            return {
                "instruction": "Hãy tạo câu hỏi từ nội dung trên",
                "bloom_level": tool_input["bloom_level"],
                "num_questions": tool_input.get("num_questions", 3),
                "content_preview": tool_input["content"][:300]
            }
        return super()._handle_tool(tool_name, tool_input)


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
        "description": "Lấy nội dung tài liệu cần tóm tắt từ knowledge base. CHỈ dùng khi prompt KHÔNG có phần NỘI DUNG TÀI LIỆU.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Chủ đề cần tóm tắt"},
                "n_results": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    },
    {
        "name": "build_summary",
        "description": "Tạo bản tóm tắt có cấu trúc từ nội dung đã thu thập.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "Nội dung cần tóm tắt"},
                "style": {
                    "type": "string",
                    "enum": ["bullet", "paragraph", "outline", "map"],
                    "description": "bullet=gạch đầu dòng, paragraph=văn xuôi, outline=dàn ý có cấp, map=sơ đồ text"
                },
                "length": {
                    "type": "string",
                    "enum": ["short", "medium", "long"],
                    "description": "short=<100 từ, medium=100-300 từ, long=300+ từ"
                }
            },
            "required": ["content", "style"]
        }
    }
]

class SummaryAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="SummaryAgent",
            system_prompt="""Bạn là chuyên gia tóm tắt tài liệu học thuật.

QUY TRÌNH:
- Nếu prompt có phần "NỘI DUNG TÀI LIỆU": dùng trực tiếp nội dung đó để tóm tắt, KHÔNG gọi search_knowledge.
- Nếu prompt KHÔNG có nội dung: dùng search_knowledge để lấy tài liệu, rồi dùng build_summary.

Luôn giữ lại: định nghĩa chính, công thức quan trọng, ý nghĩa thực tiễn.

STYLE:
- bullet: Danh sách gạch đầu dòng, mỗi điểm 1 ý độc lập
- paragraph: Văn xuôi mạch lạc, có mở-thân-kết
- outline: Dàn ý cấp 1 → cấp 2 → cấp 3, có đánh số
- map: Sơ đồ dạng text với indent và ký hiệu →, ●, ○

NGUYÊN TẮC:
- Ưu tiên nội dung từ tài liệu thực, không thêm thông tin ngoài
- Giữ công thức chính xác, không diễn giải sai
- Độ dài phù hợp: short cho ôn nhanh, long cho học sâu
- Kết thúc bằng 1-2 "điểm cần nhớ" quan trọng nhất

Tiếng Việt, rõ ràng, dễ học.""",
            tools=SUMMARY_TOOLS
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 5)
            )
            combined = "\n\n---\n\n".join([r["content"] for r in results])
            return {
                "content": combined,
                "num_chunks": len(results),
                "sources": [r.get("filename", "") for r in results]
            }
        elif tool_name == "build_summary":
            return {
                "instruction": "Hãy tạo bản tóm tắt theo style và length đã chỉ định",
                "style": tool_input["style"],
                "length": tool_input.get("length", "medium"),
                "content_length": len(tool_input["content"])
            }
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# FLASHCARD AGENT
# ════════════════════════════════════════

FLASHCARD_TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Lấy nội dung để tạo flashcard từ knowledge base. CHỈ dùng khi prompt KHÔNG có phần NỘI DUNG TÀI LIỆU.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "n_results": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    },
    {
        "name": "generate_flashcards",
        "description": "Tạo bộ flashcard từ nội dung tài liệu.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "Nội dung tài liệu"},
                "card_type": {
                    "type": "string",
                    "enum": ["definition", "formula", "concept", "mixed"],
                    "description": "definition=thuật ngữ/định nghĩa, formula=công thức/ứng dụng, concept=câu hỏi mở, mixed=kết hợp"
                },
                "num_cards": {"type": "integer", "default": 5, "description": "Số lượng flashcard"},
                "format": {
                    "type": "string",
                    "enum": ["qa", "cloze", "image_hint"],
                    "description": "qa=Hỏi-Đáp thông thường, cloze=điền vào chỗ trống, image_hint=có gợi ý hình ảnh"
                }
            },
            "required": ["content", "card_type"]
        }
    }
]

class FlashcardAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="FlashcardAgent",
            system_prompt="""Bạn là chuyên gia tạo flashcard học thuật theo phương pháp spaced repetition.

QUY TRÌNH:
- Nếu prompt có phần "NỘI DUNG TÀI LIỆU": dùng trực tiếp nội dung đó để tạo flashcard, KHÔNG gọi search_knowledge.
- Nếu prompt KHÔNG có nội dung: dùng search_knowledge để lấy tài liệu, rồi dùng generate_flashcards.

CARD TYPE:
- definition: MẶTTRƯỚC=Thuật ngữ/Khái niệm, MẶTSAU=Định nghĩa đầy đủ + ví dụ
- formula: MẶTTRƯỚC=Tình huống/Bài toán, MẶTSAU=Công thức + cách áp dụng
- concept: MẶTTRƯỚC=Câu hỏi "Tại sao/Như thế nào", MẶTSAU=Giải thích ngắn gọn
- mixed: Kết hợp cả 3 loại trên

FORMAT OUTPUT (luôn theo cấu trúc này):
🃏 FLASHCARD [số thứ tự] — [loại]
━━━━━━━━━━━━━━━━━━━━━━━━
📌 MẶT TRƯỚC:
[Câu hỏi hoặc thuật ngữ]

✅ MẶT SAU:
[Câu trả lời, định nghĩa, hoặc công thức]

💡 GHI NHỚ: [1 câu gợi nhớ ngắn gọn]
━━━━━━━━━━━━━━━━━━━━━━━━

NGUYÊN TẮC SPACED REPETITION:
- Mỗi flashcard chỉ có 1 ý chính (atomic)
- Mặt trước đủ rõ để nhớ ra mặt sau
- Ghi nhớ ngắn: dùng từ khóa, câu vần, liên tưởng
- Tránh câu trả lời dài hơn 3 dòng

Tiếng Việt, chính xác, dễ nhớ.""",
            tools=FLASHCARD_TOOLS
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        if tool_name == "search_knowledge":
            results = kb_search(
                query=tool_input["query"],
                n_results=tool_input.get("n_results", 5)
            )
            combined = "\n\n".join([r["content"] for r in results])
            return {
                "content": combined,
                "num_chunks": len(results)
            }
        elif tool_name == "generate_flashcards":
            return {
                "instruction": "Hãy tạo flashcard theo format chuẩn đã được định nghĩa trong system prompt",
                "card_type": tool_input["card_type"],
                "num_cards": tool_input.get("num_cards", 5),
                "format": tool_input.get("format", "qa"),
                "content_chars": len(tool_input["content"])
            }
        return super()._handle_tool(tool_name, tool_input)


# ════════════════════════════════════════
# ORCHESTRATOR
# ════════════════════════════════════════

ORCHESTRATOR_TOOLS = [
    {
        "name": "delegate_to_tutor",
        "description": "Chuyển yêu cầu giải thích khái niệm, giảng bài cho Tutor Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {"type": "string"},
                "context": {"type": "object"}
            },
            "required": ["task"]
        }
    },
    {
        "name": "delegate_to_quiz",
        "description": "Chuyển yêu cầu tạo quiz, ôn tập cho Quiz Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string"},
                "bloom_level": {
                    "type": "string",
                    "enum": ["remember", "understand", "apply", "analyze"]
                },
                "num_questions": {"type": "integer", "default": 3}
            },
            "required": ["topic", "bloom_level"]
        }
    },
    {
        "name": "delegate_to_group",
        "description": "Chuyển yêu cầu liên quan đến nhóm học, phân công, lịch học.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task": {"type": "string"},
                "members": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["task"]
        }
    },
    {
        "name": "delegate_to_summary",
        "description": "Chuyển yêu cầu tóm tắt tài liệu, bài học, chương sách cho Summary Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Chủ đề cần tóm tắt"},
                "style": {
                    "type": "string",
                    "enum": ["bullet", "paragraph", "outline", "map"],
                    "default": "bullet"
                },
                "length": {
                    "type": "string",
                    "enum": ["short", "medium", "long"],
                    "default": "medium"
                }
            },
            "required": ["topic"]
        }
    },
    {
        "name": "delegate_to_flashcard",
        "description": "Chuyển yêu cầu tạo flashcard, thẻ ghi nhớ, ôn từ cho Flashcard Agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Chủ đề cần tạo flashcard"},
                "card_type": {
                    "type": "string",
                    "enum": ["definition", "formula", "concept", "mixed"],
                    "default": "mixed"
                },
                "num_cards": {"type": "integer", "default": 5},
                "format": {
                    "type": "string",
                    "enum": ["qa", "cloze", "image_hint"],
                    "default": "qa"
                }
            },
            "required": ["topic"]
        }
    }
]

ORCHESTRATOR_PROMPT = """Bạn là StudyMind Orchestrator — não điều khiển của hệ thống học tập AI.

NHIỆM VỤ: Phân tích yêu cầu và điều phối đúng agent chuyên biệt.

QUY TẮC ROUTING:
- Giải thích khái niệm / học bài mới           → delegate_to_tutor
- Tạo quiz / ôn tập / kiểm tra                 → delegate_to_quiz
- Tổ chức nhóm / lịch học / phân công          → delegate_to_group
- Tóm tắt / tóm gọn / rút ngắn tài liệu        → delegate_to_summary
- Tạo flashcard / thẻ ghi nhớ / ôn từ          → delegate_to_flashcard
- Câu hỏi đơn giản → trả lời thẳng, không cần delegate

QUAN TRỌNG:
- Luôn delegate đến agent phù hợp, đừng tự xử lý phần chuyên biệt
- Tóm tắt ngắn gọn kết quả từ agent trước khi trả về user
- Nếu yêu cầu cần nhiều agents → delegate lần lượt
- Với flashcard: hỏi số lượng nếu user không nói rõ (mặc định 5)
- Với tóm tắt: hỏi style nếu user không nói rõ (mặc định bullet)

Trả lời bằng tiếng Việt, thân thiện."""


class OrchestratorAgent(BaseAgent):
    def __init__(self):
        self.tutor = TutorAgent()
        self.quiz = QuizAgent()
        self.group = GroupAgent()
        self.summary = SummaryAgent()
        self.flashcard = FlashcardAgent()
        self.history = []

        super().__init__(
            name="Orchestrator",
            system_prompt=ORCHESTRATOR_PROMPT,
            tools=ORCHESTRATOR_TOOLS
        )

    def _handle_tool(self, tool_name: str, tool_input: dict) -> dict:
        print(f"\n  🎯 Orchestrator → {tool_name}")

        if tool_name == "delegate_to_tutor":
            result = self.tutor.run(
                message=tool_input["task"],
                context=tool_input.get("context")
            )
            return {"agent": "TutorAgent", "response": result}

        elif tool_name == "delegate_to_quiz":
            task = f"Tạo {tool_input.get('num_questions', 3)} câu quiz về '{tool_input['topic']}' ở mức độ {tool_input['bloom_level']}"
            result = self.quiz.run(message=task)
            return {"agent": "QuizAgent", "response": result}

        elif tool_name == "delegate_to_group":
            task = tool_input["task"]
            if "members" in tool_input:
                task += f"\nThành viên: {', '.join(tool_input['members'])}"
            result = self.group.run(message=task)
            return {"agent": "GroupAgent", "response": result}

        elif tool_name == "delegate_to_summary":
            task = (
                f"Tóm tắt chủ đề '{tool_input['topic']}' "
                f"theo style '{tool_input.get('style', 'bullet')}' "
                f"với độ dài '{tool_input.get('length', 'medium')}'"
            )
            result = self.summary.run(message=task)
            return {"agent": "SummaryAgent", "response": result}

        elif tool_name == "delegate_to_flashcard":
            task = (
                f"Tạo {tool_input.get('num_cards', 5)} flashcard về '{tool_input['topic']}' "
                f"loại '{tool_input.get('card_type', 'mixed')}' "
                f"format '{tool_input.get('format', 'qa')}'"
            )
            result = self.flashcard.run(message=task)
            return {"agent": "FlashcardAgent", "response": result}

        return super()._handle_tool(tool_name, tool_input)
