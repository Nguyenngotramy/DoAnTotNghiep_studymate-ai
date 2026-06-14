# Bao cao danh gia AI Agent sau nang cap

Ngay danh gia lai: 14/06/2026

## 1. Ket luan dieu hanh

AI Agent da cai thien ro ret sau hardening production. Cac loi timeout keo dai, retry ngam, history bi o nhiem, Chroma legacy sai metric, citation bi mat va encoding Windows da duoc xu ly.

Danh gia moi: **8.0/10 - staging-ready, production co dieu kien**.

He thong chua nen mo traffic production cong khai cho den khi xu ly hai blocker:

1. `/ai-agent/*` dang duoc Caddy cong khai va tu chen service key, chua xac thuc/rate-limit theo nguoi dung.
2. Quiz qua `/chat` route dung agent nhung 3/4 ca khong parse duoc output; endpoint `/quiz` chuyen dung lai dat 4/4.

## 2. Pham vi test

- Compile toan bo Python.
- 22 unit/integration tests cho security, tenant RAG, provider, timeout, readiness, history, eval runner va source prefetch.
- Maven test va compile backend.
- Parse YAML Docker Compose va Spring configuration.
- Live routing smoke.
- Live quiz quality.
- Live RAG groundedness.
- Live hallucination/abstention.
- Fast path flashcard vocabulary.
- Health, readiness va capacity sau tai.

## 3. Ket qua tong hop

| Hang muc | Ket qua |
|---|---:|
| Python compile | PASS |
| Python tests | 22/22 PASS |
| Backend tests | 4/4 PASS |
| Backend build | SUCCESS |
| Docker Compose YAML | PASS |
| Spring application YAML | PASS |
| Dataset eval | 100 ca hop le |
| Health/readiness sau tai | PASS |
| Capacity rejected | 0 |

Docker CLI khong co trong PATH cua may test, vi vay chua chay duoc `docker compose build`; chi validate YAML va build backend truc tiep.

## 4. Live evaluation

### Routing

- 4/4 dung route va agent.
- p50: 21.7 giay.
- p95: 36.7 giay.
- Khong timeout.

Tuy nhien chi 1/4 response quiz qua `/chat` co noi dung hop le; 3/4 tra `invalid_model_output`. Routing score khong phan anh diem yeu nay.

### Quiz endpoint

- 4/4 PASS.
- Mean score: 1.0.
- p50: 7.5 giay.
- p95: 10.4 giay.
- Du cau hoi, 4 option rieng biet, correct index, explanation va khong trung.

Ket luan: `/quiz` san sang hon quiz qua `/chat`.

### RAG groundedness

Ket qua ban dau tren volume legacy: 0/4 vi collection cu dung L2 nhung metadata bi sua thanh cosine.

Sau sua:

- Collection moi: `knowledge_v2`.
- Migration sao chep tai lieu, khong xoa collection cu.
- Deterministic prefetch theo tenant/subject.
- Sources tra truc tiep tu endpoint.
- 4/4 PASS, mean score 1.0.
- p50: 3.3 giay.
- p95: 4.3 giay.

### Hallucination / abstention

- 3/4 PASS.
- p95: 4.3 giay.

Ca that bai hoi so hang thu 1000 cua day `a_n = 3n + 2`. Agent tinh ra `3002`. Dataset yeu cau strict abstention, nhung day la suy luan toan hoc hop le tu cong thuc trong tai lieu. Can tach hai policy:

- `extractive_only`: chi tra thong tin viet truc tiep.
- `grounded_reasoning`: duoc phep suy luan co the kiem chung tu tai lieu.

### Flashcard fast path

- Tao du 10 flashcard A2.
- Structured payload hop le.
- Latency: 262 ms.
- Khong goi provider.

## 5. So sanh truoc va sau

| Tieu chi | Truoc | Sau |
|---|---:|---:|
| Python tests | 17/17 | 22/22 |
| Routing live | 1/4 | 4/4 |
| Routing timeout | 3 ca vuot 120 giay | 0 |
| Routing p50 | ~120 giay | 21.7 giay |
| Quiz quality endpoint | Chua do | 4/4 |
| RAG groundedness | Khong chay duoc / 0/4 legacy | 4/4 |
| RAG p95 | Khong co | 4.3 giay |
| Hallucination | Chua do | 3/4 |
| Readiness | Khong co | Co `/ready` |
| Provider retry | Retry ngam | `max_retries=0` |
| History loi | Co luu | Khong luu |
| Chroma collection | Legacy metric sai | `knowledge_v2` cosine |
| SQLite connection | Co ResourceWarning | Da dong dung cach |

## 6. Diem manh sau nang cap

1. Timeout nhieu lop: provider, agent turn, HTTP operation va backend.
2. `AI_AGENT_MODEL` thuc su dieu khien tat ca specialist agent.
3. Tenant isolation va subject filter van giu dung.
4. RAG deterministic, co source va khong phu thuoc model co goi tool hay khong.
5. Migration Chroma khong pha huy du lieu legacy.
6. Endpoint chuyen dung `/quiz` va vocabulary fast path co chat luong tot.
7. Readiness ghi nhan provider failure gan nhat.
8. Eval runner ghi dung timeout va ho tro UTF-8 tren Windows.
9. SQLite WAL va connection lifecycle phu hop deployment mot worker.
10. Backend khong con block vo han khi AI Agent cham.

## 7. Rui ro con lai

### P0 - Gateway AI chua co user authentication

Frontend goi truc tiep `/ai-agent/*`; Caddy tu chen service key. Nguoi ngoai co the goi AI ngoai cac luong JWT/quota cua backend.

Khuyen nghi: proxy AI qua backend hoac gateway xac minh JWT va distributed rate limit.

### P1 - Quiz qua chat khong on dinh

3/4 routing case dung `QuizAgent` nhung structured output rong. Can dung chung pipeline cua endpoint `/quiz` thay vi prompt/parser rieng trong `_run_fast_chat_route`.

### P1 - Routing latency con cao

p95 36.7 giay vuot muc tieu 15 giay. Model/provider hien tai chua phu hop SLO chat production.

### P1 - Readiness la passive readiness

`/ready` dua vao system key va failure gan nhat; khi process moi khoi dong, no chua chung minh provider dang truy cap duoc. Nen co probe nen co cache.

### P1 - Chinh sach suy luan chua ro

Dataset dang xem suy luan `a_1000=3002` la hallucination. San pham giao duc can khai bao ro khi nao duoc reasoning va khi nao chi extract.

### P2 - Gioi han scale

SQLite va local Chroma phu hop `AI_AGENT_WORKERS=1`. Scale ngang can Redis/PostgreSQL va vector database dung chung.

### P2 - Cold start migration/embedding

Lan dau mo collection v2 co the mat thoi gian de embed lai tai lieu legacy. Nen chay migration trong maintenance job truoc khi nhan traffic.

## 8. Cham diem moi

| Tieu chi | Truoc | Sau |
|---|---:|---:|
| Kien truc | 8.5 | 8.8 |
| Bao mat va tenant isolation | 8.0 | 8.0 |
| RAG/groundedness | 7.5 | 8.8 |
| Structured output | 7.0 | 7.8 |
| Testability/evaluation | 7.5 | 8.7 |
| Observability/readiness | 6.5 | 7.5 |
| Reliability/latency | 3.5 | 7.0 |
| Scale | 6.5 | 6.5 |

Tong hop: **7.1/10 -> 8.0/10**.

## 9. Quyet dinh deploy

Trang thai: **du dieu kien staging, production co dieu kien**.

Bat buoc truoc go-live:

1. Khoa `/ai-agent/*` bang JWT/rate limit hoac proxy qua backend.
2. Cho chat quiz dung chung implementation `/quiz`.
3. Benchmark model dat p95 duoi 15 giay.
4. Chay full 100-case eval tren staging.
5. Test backup/restore hai volume AI.
6. Warm-up/migrate `knowledge_v2` truoc khi mo traffic.
