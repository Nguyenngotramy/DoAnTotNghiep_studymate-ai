import anthropic, json

TOOLS = [
    {
        "name": "search_knowledge",
        "description": "Tìm kiếm kiến thức từ tài liệu học theo chủ đề",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Chủ đề cần tìm"},
                "level": {"type": "string", "enum": ["basic", "advanced"]}
            },
            "required": ["topic"]
        }
    },
    {
        "name": "create_quiz",
        "description": "Tạo bài quiz theo Bloom's Taxonomy",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string"},
                "bloom_level": {"type": "string",
                    "enum": ["remember","understand","apply","analyze"]},
                "num_questions": {"type": "integer"}
            },
            "required": ["topic", "bloom_level"]
        }
    }
]

def run_tool(tool_name: str, tool_input: dict) -> str:
    """Thực thi tool và trả về kết quả"""
    if tool_name == "search_knowledge":
        # TODO Phase 2: thay bằng vector DB query
        return json.dumps({"found": True, "content": f"Kiến thức về {tool_input['topic']}..."})
    elif tool_name == "create_quiz":
        # TODO Phase 2: generate quiz thực sự
        return json.dumps({"quiz": ["Q1: ...", "Q2: ..."]})

def agent_loop(user_message: str) -> str:
    """Agentic loop: Claude gọi tools cho đến khi có câu trả lời cuối"""
    client = anthropic.Anthropic()
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=ORCHESTRATOR_PROMPT,
            tools=TOOLS,       # ← Key: truyền tools vào đây
            messages=messages
        )

        if response.stop_reason == "end_turn":
            return response.content[0].text  # Xong!

        if response.stop_reason == "tool_use":
            # Claude muốn dùng tool → thực thi và trả kết quả
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            # Append assistant response + tool results vào history
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            # → Loop lại, Claude sẽ xử lý kết quả tool và tiếp tục trả lời