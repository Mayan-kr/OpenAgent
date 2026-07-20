import sqlite3
from pathlib import Path

from app.core.config import get_settings
from app.schemas import PageContext


class PageContextStore:
    """A tiny durable bridge so HTTP and separately launched MCP processes share context."""

    def __init__(self) -> None:
        self._database = Path(get_settings().data_path)
        self._database.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS page_context (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)"
            )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._database)

    def save(self, page: PageContext) -> None:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO page_context (id, payload) VALUES (1, ?) "
                "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
                (page.model_dump_json(by_alias=True),),
            )

    def latest(self) -> PageContext | None:
        with self._connect() as connection:
            row = connection.execute("SELECT payload FROM page_context WHERE id = 1").fetchone()
        return PageContext.model_validate_json(row[0]) if row else None


page_context_store = PageContextStore()
