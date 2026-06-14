# Bao cao danh gia va kiem thu AI Agent StudyMate

Ngay danh gia: 14/06/2026

## 1. Ket luan dieu hanh

AI Agent da vuot muc chatbot don le: co multi-agent, hybrid routing, RAG theo tenant va mon hoc, bo nho SQLite, BYOK, service authentication, capacity control va bo eval 100 ca.

Danh gia tong the hien tai: **7.1/10 - kha, co nen tang tot nhung chua san sang cho tai production lon**.

Van de can xu ly truoc tien la do tre va timeout cua `openrouter/free`. Smoke test live chi hoan tat 1/4 ca; ba ca vuot 120 giay. Ket qua nay khong du de cham chat luong noi dung cua toan bo 100 ca, nhung du de ket luan duong provider mien phi hien tai khong dat SLO tuong tac.

## 2. Pham vi kiem thu

- Static check va compile toan bo `ai_agent`.
- Unit test bao mat, RAG, provider, vocabulary va parser.
- Kiem tra health API va capacity.
- Xac minh bo eval 100 ca.
- Smoke evaluation live voi provider da cau hinh.
- Review kien truc, isolation, error handling, observability va kha nang mo rong.

## 3. Ket qua da do

| Hang muc | Ket qua |
|---|---:|
| Python compile | PASS |
| Unit test | 17/17 PASS |
| Dataset eval | 100 ca hop le |
| Health API | PASS |
| Service authentication | PASS |
| Tenant-scoped RAG | PASS qua unit test |
| Live routing smoke test | 1/4 PASS |
| Latency ca thanh cong | 30,003 ms |
| Ba ca con lai | Vuot timeout 120,000 ms |

Co cau dataset:

- Routing: 40 ca.
- RAG groundedness: 20 ca.
- Hallucination/abstention: 15 ca.
- Quiz quality: 25 ca.

Khong chay full 100 live cases vi smoke test cho thay provider timeout nghiem trong. Chay tiep se ton quota va tao ket qua khong phan anh chat luong logic cua agent.

## 4. Diem manh

1. Kien truc `Orchestrator + Specialist Agents` ro rang, gom Tutor, Quiz, Summary, Flashcard, Group va Kepner-Tregoe.
2. Hybrid routing trong `/chat` giup cac intent ro rang di thang den agent chuyen biet.
3. RAG co cach ly `tenant_id`; request thieu tenant bi chan truy cap KB toan cuc.
4. Upload co allowlist host, chan credential trong URL, redirect va gioi han dung luong.
5. API noi bo co `AI_AGENT_SERVICE_KEY` va so sanh constant-time.
6. Context dung `ContextVar`, phu hop singleton agent va request dong thoi.
7. Co SQLite WAL cho history va quota uu tien tai khoan.
8. Co BYOK OpenRouter/Anthropic, model allowlist va capacity headroom.
9. Quiz/flashcard co parser, validation co ban, retry va structured payload.
10. Bo eval co scorers rieng cho routing, RAG, hallucination va quiz.

## 5. Phat hien va rui ro

### P0 - Provider timeout lam mat kha nang phuc vu

`AsyncOpenAI` dat timeout 60 giay, nhung SDK retry co the lam request thuc te vuot 120 giay. Endpoint `/chat` bat exception va tra thong bao than thien, nhung client co the timeout truoc khi nhan duoc response.

Tac dong:

- UX bi treo.
- Worker va slot LLM bi chiem lau.
- Eval va monitoring co the bao sai.
- Khong the dat SLO chatbot thong thuong.

Khuyen nghi:

- Dat `max_retries=0` hoac 1 cho client.
- Dung timeout ket noi/doc/ghi ro rang, tong deadline 20-30 giay.
- Them timeout bao quanh toan bo agent turn.
- Dung model/provider on dinh cho production; `openrouter/free` chi nen la fallback.

### P0 - Bo eval tung che mat timeout

`httpx.ReadTimeout` co the co message rong. Runner cu luu `str(exc)`, lam `summary.errors` bang 0 du request that bai. Da sua de luon ghi ten exception, vi du `ReadTimeout`, va da them test hoi quy.

### P1 - Healthcheck chua phan anh provider readiness

`/health` chi kiem tra process, SQLite va counter noi bo. Service co the healthy trong khi provider khong phan hoi.

Khuyen nghi them `/ready` co cache, kiem tra provider nhe theo chu ky, khong goi provider tren moi health probe.

### P1 - Chat luu ca thong bao loi vao history

Response loi than thien van duoc ghi vao session. Nhieu lan timeout se lam o nhiem context va anh huong cau tra loi sau.

Khuyen nghi chi luu turn thanh cong, hoac luu loi voi metadata rieng va khong dua vao prompt history.

### P1 - Observability chua du de dieu tra

Da co request ID, latency va token log, nhung log mac dinh khi chay local khong hien thi day du log module. Chua co metric theo provider/model/agent, timeout, retry va parse failure.

### P1 - Structured output van phu thuoc model

`openrouter/free` khong bat buoc JSON mode. Parser va retry giam loi nhung khong dam bao schema. Can Pydantic validation va repair/retry co gioi han.

### P2 - Khoi tao embedding lap lai

`get_collection()` tao client va embedding function moi moi lan ingest/search. Nen cache collection/embedding singleton de giam overhead va tranh tranh chap khoi tao.

### P2 - Tai lieu kien truc cu da loi thoi

Tai lieu cu con ghi session in-memory, CORS `*`, khong auth va classifier LLM tren moi chat. Ma hien tai da thay doi; can cap nhat de tranh bao cao sai khi bao ve do an.

## 6. Cham diem

| Tieu chi | Diem |
|---|---:|
| Kien truc va phan tach trach nhiem | 8.5/10 |
| Bao mat noi bo va tenant isolation | 8.0/10 |
| RAG va groundedness design | 7.5/10 |
| Structured output | 7.0/10 |
| Testability va evaluation | 7.5/10 |
| Observability | 6.5/10 |
| Reliability/latency live | 3.5/10 |
| Kha nang scale hien tai | 6.5/10 |

Tong hop co trong so: **7.1/10**.

## 7. Thu tu cai tien de xuat

1. Sua timeout/retry/provider production va dat SLO p95 duoi 15 giay.
2. Them integration test voi fake LLM de test tool loop, retry, parse va error path khong phu thuoc Internet.
3. Chay lai 100-case eval voi model co SLA; luu baseline JSON/Markdown vao CI artifact.
4. Them readiness, metrics va dashboard theo route/agent/provider.
5. Khong dua turn loi vao prompt history.
6. Cache Chroma collection va embedding function.
7. Cap nhat tai lieu kien truc theo ma hien tai.

## 8. Lenh tai lap

```powershell
cd ai_agent
python -m compileall -q .
python -m unittest discover -s tests -v
python evals\run_eval.py --dry-run
```

Live eval can service key va mot instance API dang chay. Nen bat dau bang 4-10 ca smoke test, chi chay full 100 khi latency va error rate dat nguong.
