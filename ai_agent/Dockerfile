FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV STUDYMIND_DB_PATH=/app/studymind_db
ENV CHAT_DB_PATH=/app/data/chat_history.sqlite3
ENV MAX_SESSION_MESSAGES=40
ENV CHAT_HISTORY_FOR_LLM=8
ENV MAX_PROMPT_CHARS=14000
ENV MAX_MESSAGE_CHARS=3500
ENV DEFAULT_KB_RESULTS=3
ENV MAX_KB_CONTEXT_CHARS=4500
ENV MAX_KB_SOURCE_CHARS=1200
ENV LLM_MAX_OUTPUT_TOKENS=900
ENV LLM_CONCURRENCY_LIMIT=12
ENV UVICORN_WORKERS=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data /app/studymind_db

EXPOSE 8001
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8001 --workers ${UVICORN_WORKERS}"]
