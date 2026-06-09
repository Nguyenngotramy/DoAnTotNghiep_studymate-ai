import os
import sqlite3
import threading
from pathlib import Path


DEFAULT_DB_PATH = "./data/chat_history.sqlite3"
DEFAULT_MAX_MESSAGES = 40


class ChatStore:
    """Persistent chat history store for ai_agent sessions.

    SQLite with WAL is enough for a small deployment because writes are short and
    chat history is read by session_id. The interface stays small so it can be
    swapped for Redis later without changing agent code.
    """

    def __init__(self, db_path: str | None = None, max_messages: int | None = None):
        self.db_path = db_path or os.getenv("CHAT_DB_PATH", DEFAULT_DB_PATH)
        self.max_messages = max_messages or int(
            os.getenv("MAX_SESSION_MESSAGES", str(DEFAULT_MAX_MESSAGES))
        )
        self._lock = threading.RLock()
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=30000")
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id
                ON chat_messages(session_id, id)
                """
            )

    def get_history(self, session_id: str, limit: int | None = None) -> list[dict]:
        safe_limit = max(1, min(limit or self.max_messages, self.max_messages))
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT role, content
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (session_id, safe_limit),
            ).fetchall()

        return [
            {"role": row["role"], "content": row["content"]}
            for row in reversed(rows)
        ]

    def get_messages(self, session_id: str, limit: int = 100) -> list[dict]:
        safe_limit = max(1, min(limit, 500))
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, role, content, created_at
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (session_id, safe_limit),
            ).fetchall()

        return [
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"],
            }
            for row in reversed(rows)
        ]

    def remember_turn(self, session_id: str, user_text: str, assistant_text: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                "INSERT INTO chat_messages(session_id, role, content) VALUES (?, 'user', ?)",
                (session_id, user_text),
            )
            conn.execute(
                "INSERT INTO chat_messages(session_id, role, content) VALUES (?, 'assistant', ?)",
                (session_id, assistant_text),
            )
            conn.execute(
                """
                DELETE FROM chat_messages
                WHERE session_id = ?
                  AND id NOT IN (
                    SELECT id
                    FROM chat_messages
                    WHERE session_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                  )
                """,
                (session_id, session_id, self.max_messages),
            )
            conn.commit()

    def clear(self, session_id: str | None = None) -> int:
        with self._lock, self._connect() as conn:
            if session_id:
                cur = conn.execute(
                    "DELETE FROM chat_messages WHERE session_id = ?",
                    (session_id,),
                )
            else:
                cur = conn.execute("DELETE FROM chat_messages")
            return cur.rowcount

    def stats(self) -> dict:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                """
                SELECT COUNT(DISTINCT session_id) AS sessions,
                       COUNT(*) AS messages
                FROM chat_messages
                """
            ).fetchone()
        return {
            "db_path": self.db_path,
            "max_messages_per_session": self.max_messages,
            "sessions": int(row["sessions"] or 0),
            "messages": int(row["messages"] or 0),
        }


chat_store = ChatStore()
