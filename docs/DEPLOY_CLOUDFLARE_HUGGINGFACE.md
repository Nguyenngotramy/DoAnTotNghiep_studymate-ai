# Deploy StudyMate with Cloudflare Pages and Hugging Face Spaces

This setup targets about 100 registered users with low to moderate concurrent
traffic:

- React frontend and gateway: Cloudflare Pages.
- Spring Boot API and WebSocket: one Docker Space.
- FastAPI AI Agent: one Docker Space with persistent storage.
- Database: MongoDB Atlas.
- Uploaded media: Cloudinary.

## 1. Create the AI Agent Space

Create a Docker Space and upload the contents of `ai_agent` as the Space root.
The included `README.md` exposes port `8001`.

Attach persistent storage before production use. Configure variables and
secrets from `ai_agent/huggingface.env.example`.

Recommended starting hardware:

- 2 vCPU and at least 8 GB RAM.
- Persistent storage mounted at `/data`.
- `UVICORN_WORKERS=1`, because SQLite and local ChromaDB are single-node
  stores.
- Upgrade hardware before increasing the worker count.

Verify:

```text
https://your-ai-agent-space.hf.space/health
https://your-ai-agent-space.hf.space/ready
```

`/ready` returns `503` until the LLM provider is configured correctly.

## 2. Create the Spring Boot Space

Create another Docker Space and upload the contents of `backend` as the Space
root. The included `README.md` exposes port `8080`.

Configure variables and secrets from `backend/huggingface.env.example`.
Use a MongoDB Atlas user limited to the `studymate` database.

Recommended starting hardware:

- 2 vCPU and 4 GB RAM.
- Disable automatic sleep for reliable OAuth, payment callbacks and WebSocket.
- `TOMCAT_MAX_THREADS=80`.

Verify:

```text
https://your-spring-space.hf.space/api/actuator/health
```

## 3. Configure Cloudflare Pages

Create a Pages project with:

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Build variable:

```text
VITE_WS_URL=https://your-spring-space.hf.space/api/ws
```

Pages Functions variables:

```text
BACKEND_ORIGIN=https://your-spring-space.hf.space
AI_AGENT_ORIGIN=https://your-ai-agent-space.hf.space
```

Pages Functions secrets:

```text
AI_AGENT_SERVICE_KEY=<same value used by both Spaces>
JWT_SECRET=<same value used by Spring Boot>
```

The functions under `frontend/functions` provide:

- `/api/*` -> Spring Boot.
- `/ai-agent/*` -> authenticated AI Agent requests.

Do not expose `AI_AGENT_SERVICE_KEY` as a `VITE_*` variable.

## 4. External service configuration

Google OAuth authorized redirect URI:

```text
https://your-project.pages.dev/api/login/oauth2/code/google
```

Spring Boot variables:

```text
FRONTEND_URL=https://your-project.pages.dev
APP_PUBLIC_BASE_URL=https://your-project.pages.dev/api
```

AI Agent variables:

```text
BACKEND_API_URL=https://your-project.pages.dev/api
ALLOWED_ORIGINS=https://your-project.pages.dev
ALLOWED_FILE_HOSTS=your-project.pages.dev,res.cloudinary.com
```

Add the custom production domain to these values when switching away from the
`pages.dev` domain.

## 5. Capacity notes

The configuration is suitable for roughly 100 accounts, not 100 simultaneous
LLM generations. `LLM_CONCURRENCY_LIMIT=12` protects the provider and queues
short bursts. If AI latency becomes high, first upgrade the AI Space and LLM
provider quota; do not add multiple workers while SQLite and ChromaDB remain
local.

MongoDB Atlas and Cloudinary must be used for persistent application data.
The AI Space must have persistent `/data` storage, otherwise chat history and
the vector knowledge base are lost on rebuild or restart.
