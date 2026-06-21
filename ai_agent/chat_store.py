import os
import sqlite3
import threading
from contextlib import contextmanager
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
        conn.execute("PRAGMA busy_timeout=30000")
        return conn

    @contextmanager
    def _connection(self):
        conn = self._connect()
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._lock, self._connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
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
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS account_ai_usage (
                    account_id TEXT PRIMARY KEY,
                    successful_requests INTEGER NOT NULL DEFAULT 0,
                    inflight_requests INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def claim_intro_priority(self, account_id: str, limit: int = 3) -> bool:
        account = (account_id or "").strip()
        if not account or limit <= 0:
            return False

        with self._lock, self._connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """
                INSERT OR IGNORE INTO account_ai_usage(account_id)
                VALUES (?)
                """,
                (account,),
            )
            row = conn.execute(
                """
                SELECT successful_requests, inflight_requests
                FROM account_ai_usage
                WHERE account_id = ?
                """,
                (account,),
            ).fetchone()
            eligible = (
                int(row["successful_requests"] or 0)
                + int(row["inflight_requests"] or 0)
                < limit
            )
            if eligible:
                conn.execute(
                    """
                    UPDATE account_ai_usage
                    SET inflight_requests = inflight_requests + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE account_id = ?
                    """,
                    (account,),
                )
            conn.commit()
        return eligible

    def finish_intro_priority(self, account_id: str, success: bool) -> None:
        account = (account_id or "").strip()
        if not account:
            return
        with self._lock, self._connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """
                UPDATE account_ai_usage
                SET inflight_requests = MAX(0, inflight_requests - 1),
                    successful_requests = successful_requests + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE account_id = ?
                """,
                (1 if success else 0, account),
            )
            conn.commit()

    def intro_priority_status(self, account_id: str, limit: int = 3) -> dict:
        account = (account_id or "").strip()
        if not account:
            return {"used": 0, "remaining": 0}
        with self._lock, self._connection() as conn:
            row = conn.execute(
                """
                SELECT successful_requests
                FROM account_ai_usage
                WHERE account_id = ?
                """,
                (account,),
            ).fetchone()
        used = int(row["successful_requests"] or 0) if row else 0
        return {"used": used, "remaining": max(0, limit - used)}

    def get_history(self, session_id: str, limit: int | None = None) -> list[dict]:
        safe_limit = max(1, min(limit or self.max_messages, self.max_messages))
        with self._lock, self._connection() as conn:
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
        with self._lock, self._connection() as conn:
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

    def list_sessions(self, tenant_id: str, limit: int = 5) -> list[dict]:
        """Return the most recently active chat sessions owned by one tenant."""
        tenant = (tenant_id or "").strip()
        if not tenant:
            return []
        safe_limit = max(1, min(limit, 20))
        prefix = f"{tenant}::"
        with self._lock, self._connection() as conn:
            rows = conn.execute(
                """
                SELECT m.session_id,
                       MAX(m.id) AS last_message_id,
                       MAX(m.created_at) AS updated_at,
                       COUNT(*) AS message_count,
                       COALESCE((
                           SELECT first_user.content
                           FROM chat_messages first_user
                           WHERE first_user.session_id = m.session_id
                             AND first_user.role = 'user'
                           ORDER BY first_user.id ASC
                           LIMIT 1
                       ), 'Cuộc trò chuyện AI') AS title
                FROM chat_messages m
                WHERE substr(m.session_id, 1, ?) = ?
                GROUP BY m.session_id
                ORDER BY last_message_id DESC
                LIMIT ?
                """,
                (len(prefix), prefix, safe_limit),
            ).fetchall()

        return [
            {
                "session_id": row["session_id"][len(prefix):],
                "title": str(row["title"] or "Cuộc trò chuyện AI").strip()[:80],
                "updated_at": row["updated_at"],
                "message_count": int(row["message_count"] or 0),
            }
            for row in rows
        ]
    def remember_turn(self, session_id: str, user_text: str, assistant_text: str) -> None:
        with self._lock, self._connection() as conn:
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
        with self._lock, self._connection() as conn:
            if session_id:
                cur = conn.execute(
                    "DELETE FROM chat_messages WHERE session_id = ?",
                    (session_id,),
                )
            else:
                cur = conn.execute("DELETE FROM chat_messages")
            return cur.rowcount

    def stats(self) -> dict:
        with self._lock, self._connection() as conn:
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
