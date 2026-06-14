"""Deterministic 100-case evaluation dataset for StudyMind AI Agent."""

from __future__ import annotations


EVAL_TENANT = "eval:studymind:v1"


RAG_DOCUMENTS = [
    {
        "id": "eval_math_orion",
        "filename": "eval_math_orion.txt",
        "subject": "Toán học",
        "subject_code": "math",
        "topic": "Định lý Orion",
        "content": (
            "Trong giáo trình thử nghiệm StudyMate, Định lý Orion được định nghĩa như sau: "
            "với dãy số a_n = 3n + 2, tổng của ba số hạng đầu tiên bằng 24. "
            "Hệ số tăng tuyến tính của dãy là 3. Ví dụ kiểm tra gồm a_1 = 5, a_2 = 8 và a_3 = 11. "
            "Mã xác nhận của chương là ORION-324."
        ),
    },
    {
        "id": "eval_biology_lotus",
        "filename": "eval_biology_lotus.txt",
        "subject": "Sinh học",
        "subject_code": "biology",
        "topic": "Tế bào Lotus",
        "content": (
            "Tế bào mô phỏng Lotus chỉ tồn tại trong bộ dữ liệu đánh giá. "
            "Bào quan tạo năng lượng được gọi là hạt Lam, có màu xanh tím và tạo đúng 18 đơn vị ATP-L mỗi chu kỳ. "
            "Màng Lotus có ba lớp protein. Mã mẫu thí nghiệm là LOTUS-18."
        ),
    },
    {
        "id": "eval_history_aurora",
        "filename": "eval_history_aurora.txt",
        "subject": "Lịch sử",
        "subject_code": "history",
        "topic": "Hiệp ước Aurora",
        "content": (
            "Hiệp ước Aurora là sự kiện hư cấu dùng cho kiểm thử RAG. "
            "Hiệp ước được ký ngày 14 tháng 3 năm 1927 tại thành phố Minh Hải. "
            "Có bốn phái đoàn tham dự và điều khoản thứ hai quy định trao đổi học thuật trong 12 năm. "
            "Mã lưu trữ là AURORA-1927."
        ),
    },
    {
        "id": "eval_programming_nova",
        "filename": "eval_programming_nova.txt",
        "subject": "Lập trình / CNTT",
        "subject_code": "programming",
        "topic": "Thuật toán NovaSort",
        "content": (
            "NovaSort là thuật toán giả lập dành riêng cho evaluation. "
            "Thuật toán chia mảng thành các khối 4 phần tử, sắp xếp từng khối rồi trộn từ phải sang trái. "
            "Độ phức tạp được quy ước là O(n log4 n), bộ nhớ phụ là O(n). "
            "Giá trị sentinel của bản mô tả là 404."
        ),
    },
    {
        "id": "eval_english_comet",
        "filename": "eval_english_comet.txt",
        "subject": "Tiếng Anh",
        "subject_code": "english",
        "topic": "Comet vocabulary",
        "content": (
            "The fictional Comet vocabulary lesson defines 'velune' as calm focus before an exam. "
            "Its sample sentence is: Mina found her velune before the final test. "
            "The antonym is 'rashen', meaning hurried confusion. "
            "The lesson code is COMET-57."
        ),
    },
]


def _routing_cases() -> list[dict]:
    groups = [
        (
            "quiz",
            "QuizAgent",
            [
                "Tạo 5 câu quiz về đạo hàm cơ bản.",
                "Cho tôi bài trắc nghiệm 8 câu về tế bào.",
                "Tạo câu hỏi kiểm tra kiến thức lịch sử Việt Nam.",
                "Làm 6 câu quiz về cấu trúc dữ liệu cây.",
                "Tạo đề ôn trắc nghiệm từ vựng tiếng Anh.",
                "Cho 4 câu hỏi kiểm tra định luật Newton.",
                "Tạo 7 câu quiz Hóa hữu cơ mức hiểu.",
                "Soạn đề ôn 5 câu về xác suất.",
            ],
        ),
        (
            "flashcard",
            "FlashcardAgent",
            [
                "Tạo 5 flashcard về tích phân.",
                "Làm thẻ ghi nhớ cho từ vựng IELTS.",
                "Tạo flash card về các bào quan tế bào.",
                "Cho tôi 8 thẻ học công thức vật lý.",
                "Tạo thẻ ghi nhớ về lịch sử thế giới.",
                "Làm flashcard ôn từ tiếng Hàn.",
                "Tạo 6 thẻ học về thuật toán sắp xếp.",
                "Cho bộ thẻ ghi nhớ phản ứng oxi hóa khử.",
            ],
        ),
        (
            "summary",
            "SummaryAgent",
            [
                "Tóm tắt kiến thức về đạo hàm.",
                "Rút gọn nội dung chương tế bào thành ý chính.",
                "Lập dàn ý về Cách mạng tháng Tám.",
                "Tạo outline ngắn cho bài cấu trúc dữ liệu.",
                "Tóm tắt ngữ pháp thì hiện tại hoàn thành.",
                "Vẽ mindmap bằng chữ về định luật Newton.",
                "Rút gọn bài học axit bazơ.",
                "Cho sơ đồ ý chính của bài xác suất.",
            ],
        ),
        (
            "tutor",
            "TutorAgent",
            [
                "Giải thích đạo hàm là gì.",
                "Vì sao tế bào cần ty thể?",
                "Hướng dẫn tôi hiểu quy luật cung cầu.",
                "Tại sao thuật toán nhị phân nhanh?",
                "Giải thích thì hiện tại hoàn thành.",
                "Vì sao vật rơi có gia tốc?",
                "Hướng dẫn cách cân bằng phương trình hóa học.",
                "Khái niệm xác suất có điều kiện là gì?",
            ],
        ),
        (
            "orchestrator",
            "GroupAgent",
            [
                "Hãy chia nhóm học 4 người và phân vai.",
                "Lập lịch học nhóm cho ba thành viên trong tuần.",
                "Phân công nhiệm vụ ôn thi cho nhóm của tôi.",
                "Đề xuất cách ghép cặp peer learning trong nhóm.",
            ],
        ),
        (
            "orchestrator",
            "KepnerTregoeAgent",
            [
                "Phân tích nguyên nhân vì sao kế hoạch học bị trễ theo IS/IS NOT.",
                "Dùng Kepner-Tregoe để đánh giá rủi ro bỏ lỡ kỳ thi.",
                "Phân tích quyết định nên học online hay trực tiếp theo KT.",
                "Xử lý sự cố điểm quiz giảm liên tục bằng phân tích nguyên nhân.",
            ],
        ),
    ]

    cases = []
    index = 1
    for expected_route, expected_agent, prompts in groups:
        for prompt in prompts:
            cases.append(
                {
                    "id": f"routing_{index:03d}",
                    "category": "routing",
                    "prompt": prompt,
                    "subject": "Khác",
                    "subject_code": "other",
                    "expected_route": expected_route,
                    "expected_agent": expected_agent,
                }
            )
            index += 1
    return cases


def _rag_cases() -> list[dict]:
    specs = [
        (
            "eval_math_orion",
            "math",
            "Toán học",
            [
                ("Ba số hạng đầu của dãy Orion có tổng bằng bao nhiêu?", ["24"]),
                ("Hệ số tăng tuyến tính của dãy Orion là mấy?", ["3"]),
                ("Ba giá trị a1, a2, a3 trong tài liệu Orion là gì?", ["5", "8", "11"]),
                ("Mã xác nhận của chương Orion là gì?", ["ORION-324"]),
            ],
        ),
        (
            "eval_biology_lotus",
            "biology",
            "Sinh học",
            [
                ("Hạt Lam tạo bao nhiêu ATP-L mỗi chu kỳ?", ["18"]),
                ("Bào quan tạo năng lượng của tế bào Lotus tên gì?", ["hạt Lam"]),
                ("Màng Lotus có bao nhiêu lớp protein?", ["ba", "3"]),
                ("Mã mẫu thí nghiệm Lotus là gì?", ["LOTUS-18"]),
            ],
        ),
        (
            "eval_history_aurora",
            "history",
            "Lịch sử",
            [
                ("Hiệp ước Aurora được ký ngày nào?", ["14", "3", "1927"]),
                ("Hiệp ước Aurora được ký tại đâu?", ["Minh Hải"]),
                ("Có bao nhiêu phái đoàn tham dự Aurora?", ["bốn", "4"]),
                ("Điều khoản hai của Aurora kéo dài bao nhiêu năm?", ["12"]),
            ],
        ),
        (
            "eval_programming_nova",
            "programming",
            "Lập trình / CNTT",
            [
                ("NovaSort chia mảng thành khối bao nhiêu phần tử?", ["4"]),
                ("NovaSort trộn các khối theo hướng nào?", ["phải sang trái"]),
                ("Độ phức tạp của NovaSort được quy ước là gì?", ["O(n log4 n)"]),
                ("Giá trị sentinel của NovaSort là bao nhiêu?", ["404"]),
            ],
        ),
        (
            "eval_english_comet",
            "english",
            "Tiếng Anh",
            [
                ("Trong bài Comet, velune có nghĩa là gì?", ["calm focus", "bình tĩnh"]),
                ("Từ trái nghĩa của velune là gì?", ["rashen"]),
                ("Rashen mang nghĩa gì?", ["hurried confusion"]),
                ("Mã bài học Comet là gì?", ["COMET-57"]),
            ],
        ),
    ]

    cases = []
    index = 1
    for document_id, subject_code, subject, questions in specs:
        for prompt, expected_terms in questions:
            cases.append(
                {
                    "id": f"rag_{index:03d}",
                    "category": "rag_groundedness",
                    "document_id": document_id,
                    "prompt": prompt,
                    "subject": subject,
                    "subject_code": subject_code,
                    "expected_terms": expected_terms,
                    "require_source": True,
                }
            )
            index += 1
    return cases


def _hallucination_cases() -> list[dict]:
    questions = [
        ("math", "Toán học", "Tài liệu Orion nói người phát minh định lý sinh năm nào?"),
        ("math", "Toán học", "Chương Orion được xuất bản bởi nhà xuất bản nào?"),
        ("math", "Toán học", "Dãy Orion có số hạng thứ 1000 bằng bao nhiêu theo tài liệu?"),
        ("biology", "Sinh học", "Ai là nhà khoa học phát hiện tế bào Lotus?"),
        ("biology", "Sinh học", "Tế bào Lotus sống được chính xác bao nhiêu ngày?"),
        ("biology", "Sinh học", "Hạt Lam có khối lượng bao nhiêu microgam?"),
        ("history", "Lịch sử", "Tên của bốn trưởng phái đoàn Aurora là gì?"),
        ("history", "Lịch sử", "Hiệp ước Aurora kết thúc vào ngày cụ thể nào?"),
        ("history", "Lịch sử", "Có bao nhiêu người dân chứng kiến lễ ký Aurora?"),
        ("programming", "Lập trình / CNTT", "Ai sáng tạo NovaSort và vào năm nào?"),
        ("programming", "Lập trình / CNTT", "NovaSort chạy mất chính xác bao nhiêu mili giây với một triệu phần tử?"),
        ("programming", "Lập trình / CNTT", "NovaSort được viết lần đầu bằng ngôn ngữ nào?"),
        ("english", "Tiếng Anh", "Từ velune xuất hiện lần đầu trong cuốn tiểu thuyết nào?"),
        ("english", "Tiếng Anh", "Velune có phiên âm IPA chính thức là gì?"),
        ("english", "Tiếng Anh", "Ai đã đặt ra từ rashen?"),
    ]
    return [
        {
            "id": f"hallucination_{index:03d}",
            "category": "hallucination",
            "prompt": prompt,
            "subject": subject,
            "subject_code": subject_code,
            "expected_behavior": "abstain",
            "abstain_terms": [
                "không có",
                "không được cung cấp",
                "không tìm thấy",
                "thiếu thông tin",
                "tài liệu không",
                "cannot determine",
                "not provided",
            ],
        }
        for index, (subject_code, subject, prompt) in enumerate(questions, 1)
    ]


def _quiz_cases() -> list[dict]:
    topics = [
        ("math", "Toán học", "đạo hàm hàm đa thức", "remember"),
        ("math", "Toán học", "tích phân cơ bản", "understand"),
        ("math", "Toán học", "xác suất có điều kiện", "apply"),
        ("math", "Toán học", "hình học không gian", "analyze"),
        ("physics", "Vật lý", "định luật Newton", "understand"),
        ("physics", "Vật lý", "mạch điện nối tiếp", "apply"),
        ("physics", "Vật lý", "quang học thấu kính", "analyze"),
        ("chemistry", "Hóa học", "phản ứng oxi hóa khử", "understand"),
        ("chemistry", "Hóa học", "axit và bazơ", "apply"),
        ("chemistry", "Hóa học", "hóa hữu cơ ankan", "remember"),
        ("biology", "Sinh học", "cấu trúc tế bào", "remember"),
        ("biology", "Sinh học", "di truyền Mendel", "apply"),
        ("biology", "Sinh học", "hệ sinh thái", "analyze"),
        ("history", "Lịch sử", "Cách mạng tháng Tám", "understand"),
        ("history", "Lịch sử", "Chiến tranh thế giới thứ hai", "analyze"),
        ("geography", "Địa lý", "khí hậu Việt Nam", "understand"),
        ("geography", "Địa lý", "dân số và đô thị hóa", "analyze"),
        ("english", "Tiếng Anh", "present perfect tense", "apply"),
        ("english", "Tiếng Anh", "IELTS academic vocabulary", "understand"),
        ("programming", "Lập trình / CNTT", "cấu trúc dữ liệu stack", "remember"),
        ("programming", "Lập trình / CNTT", "binary search", "apply"),
        ("programming", "Lập trình / CNTT", "độ phức tạp thuật toán", "analyze"),
        ("economics", "Kinh tế / Kế toán", "quy luật cung cầu", "understand"),
        ("law", "Luật", "nguyên tắc pháp luật cơ bản", "remember"),
        ("literature", "Ngữ văn", "phân tích hình tượng nhân vật", "analyze"),
    ]
    return [
        {
            "id": f"quiz_{index:03d}",
            "category": "quiz_quality",
            "topic": topic,
            "subject": subject,
            "subject_code": subject_code,
            "bloom_level": bloom,
            "num_questions": 5,
        }
        for index, (subject_code, subject, topic, bloom) in enumerate(topics, 1)
    ]


def build_dataset() -> list[dict]:
    cases = _routing_cases() + _rag_cases() + _hallucination_cases() + _quiz_cases()
    if len(cases) != 100:
        raise RuntimeError(f"Evaluation dataset must contain 100 cases, got {len(cases)}")
    return cases


DATASET = build_dataset()

