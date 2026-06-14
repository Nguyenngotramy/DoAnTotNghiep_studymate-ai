# Huong dan production AI Agent

## 1. Cau hinh bat buoc

Khong dung `openrouter/free` lam model chinh. Dat model co quota va SLA trong `ai_agent/.env`:

```env
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
AI_AGENT_MODEL=anthropic/claude-haiku-4-5
AI_AGENT_SERVICE_KEY=<chuoi-ngau-nhien-toi-thieu-32-byte>
KB_COLLECTION_NAME=knowledge_v2

LLM_REQUEST_TIMEOUT=20
LLM_TURN_TIMEOUT=35
LLM_MAX_RETRIES=0
PROVIDER_FAILURE_COOLDOWN_SECONDS=60
AI_HTTP_TIMEOUT=40
STRUCTURED_OUTPUT_RETRIES=0
LLM_CONCURRENCY_LIMIT=12
LLM_HEADROOM_PERCENT=25
AI_AGENT_WORKERS=1
```

Backend:

```env
AI_AGENT_URL=http://ai-agent:8001
AI_AGENT_SERVICE_KEY=<cung-gia-tri-voi-ai-agent>
AI_AGENT_TIMEOUT_SECONDS=45
```

## 2. Model va chi phi

- Development: co the dung `openrouter/free`, khong dung de cam ket latency.
- Production nho: model nhanh, gia thap, quota on dinh.
- Production quan trong: co it nhat mot provider/model du phong da kiem thu.
- BYOK chi la lua chon cho nguoi dung, khong thay the system key.

Bien `AI_AGENT_MODEL` da duoc noi vao tat ca specialist agent. Doi bien nay va restart container se doi model system.

## 3. Health va readiness

- `/health`: process, SQLite va capacity noi bo.
- `/ready`: kiem tra co system API key va provider khong vua that bai trong cooldown.

Docker healthcheck dung `/ready`. Neu provider timeout, container tam thoi `unhealthy` thay vi tiep tuc nhan request nhu binh thuong.

## 4. Timeout

Ba lop timeout:

1. Provider request: `LLM_REQUEST_TIMEOUT=20`.
2. Toan bo mot agent turn: `LLM_TURN_TIMEOUT=35`.
3. Toan bo HTTP operation cua AI Agent: `AI_HTTP_TIMEOUT=40`.
4. Backend cho AI Agent: `AI_AGENT_TIMEOUT_SECONDS=45`.

Thu tu phai la provider < agent turn < HTTP operation < backend. Khong tang timeout de che provider cham.

`STRUCTURED_OUTPUT_RETRIES=0` tranh goi lai model trong request tuong tac neu JSON sai schema.

## 5. Bao mat gateway

Hien frontend dang goi truc tiep `/ai-agent/*` va Caddy tu chen service key. Cach nay giu tuong thich nhung **khong xac thuc nguoi dung cuoi**.

Truoc khi mo production cong khai, can hoan thanh mot trong hai phuong an:

1. Khuyen nghi: frontend chi goi backend; backend proxy cac API AI, kiem tra JWT, membership, quota va audit log.
2. Hoac: dat API gateway co JWT verification va distributed rate limit truoc `/ai-agent/*`.

Khong xem `AI_AGENT_SERVICE_KEY` do gateway chen la rate limit hay user authentication.

## 6. Du lieu va scale

- Giu `AI_AGENT_WORKERS=1` khi dung SQLite va local ChromaDB.
- Muon scale ngang: chuyen history/quota sang Redis/PostgreSQL va vector DB sang dich vu chia se.
- Backup hai volume `ai_agent_data` va `ai_agent_db`.
- Dat alert cho disk usage; upload/RAG co the lam volume tang lien tuc.
- Collection `knowledge_v2` dung cosine va tu sao chep tai lieu tu collection legacy `knowledge`; collection cu duoc giu lai de rollback.

## 7. Kiem thu truoc deploy

```powershell
cd ai_agent
python -m compileall -q .
python -m unittest discover -s tests -v
python evals\run_eval.py --dry-run
```

Sau khi khoi dong stack:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs ai-agent --tail 100
```

Chi deploy khi:

- Unit test pass.
- `/ready` tra HTTP 200.
- Smoke eval 10 ca khong co timeout.
- p95 duoi 15 giay cho chat ngan.
- Khong co cross-tenant source trong RAG.
- Backup va restore volume da duoc thu.

## 9. Ket qua smoke hien tai

Ngay 14/06/2026, mot routing case voi model dang cau hinh:

- Truoc hardening: 46.2 giay.
- Sau khi bo structured retry va them deadline tong: 28.4 giay.
- Routing: pass.

Ket qua da cai thien nhung van vuot muc tieu p95 15 giay. Chua nen go-live voi model/provider hien tai cho den khi benchmark staging tim duoc cau hinh nhanh va on dinh hon.

## 8. Lenh deploy

```powershell
docker compose config
docker compose build ai-agent backend
docker compose up -d mongodb ml-service ai-agent backend frontend gateway
docker compose ps
```

Sau deploy, chay smoke eval truoc khi mo traffic:

```powershell
cd ai_agent
python evals\run_eval.py --base-url https://your-domain/ai-agent --limit 10 --concurrency 2
```

Full 100-case evaluation nen chay trong staging voi model va quota giong production.
