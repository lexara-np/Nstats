"""
Database — SQLite async via aiosqlite
Stocke messages, salons, stats, rapports générés
"""

import aiosqlite
import json
import logging
from datetime import datetime

log = logging.getLogger("NationRP.DB")
DEFAULT_DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "nationrp.db"))


class Database:
    def __init__(self, path: str = DEFAULT_DB_PATH):
        self.path = path
        os.makedirs(os.path.dirname(self.path), exist_ok=True)

    async def init(self):
        async with aiosqlite.connect(self.path) as db:
            await db.executescript("""
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS channels (
                    id       TEXT PRIMARY KEY,
                    name     TEXT NOT NULL,
                    category TEXT DEFAULT 'Sans catégorie',
                    topic    TEXT DEFAULT '',
                    nsfw     INTEGER DEFAULT 0,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id          TEXT PRIMARY KEY,
                    channel_id  TEXT NOT NULL,
                    channel     TEXT NOT NULL,
                    category    TEXT DEFAULT 'Sans catégorie',
                    author_id   TEXT NOT NULL,
                    author      TEXT NOT NULL,
                    content     TEXT NOT NULL,
                    attachments TEXT DEFAULT '[]',
                    timestamp   TEXT NOT NULL,
                    FOREIGN KEY (channel_id) REFERENCES channels(id)
                );

                CREATE INDEX IF NOT EXISTS idx_messages_channel  ON messages(channel_id);
                CREATE INDEX IF NOT EXISTS idx_messages_author   ON messages(author_id);
                CREATE INDEX IF NOT EXISTS idx_messages_ts       ON messages(timestamp);

                CREATE TABLE IF NOT EXISTS rapports (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id  TEXT,
                    type        TEXT DEFAULT 'channel',
                    content     TEXT NOT NULL,
                    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS stats_cache (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            """)
            await db.commit()
        log.info("✅ Base de données initialisée")

    # ─── CHANNELS ───────────────────────────

    async def save_channel(self, ch: dict):
        async with aiosqlite.connect(self.path) as db:
            await db.execute("""
                INSERT INTO channels (id, name, category, topic, nsfw, updated_at)
                VALUES (:id, :name, :category, :topic, :nsfw, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    category=excluded.category,
                    topic=excluded.topic,
                    nsfw=excluded.nsfw,
                    updated_at=CURRENT_TIMESTAMP
            """, {
                "id":       str(ch.get("id", "")),
                "name":     ch.get("name", ""),
                "category": ch.get("category", "Sans catégorie"),
                "topic":    ch.get("topic", ""),
                "nsfw":     int(ch.get("nsfw", False)),
            })
            await db.commit()

    async def get_all_channels(self) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute("SELECT * FROM channels ORDER BY category, name")
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    # ─── MESSAGES ───────────────────────────

    async def save_message(self, msg: dict):
        async with aiosqlite.connect(self.path) as db:
            await db.execute("""
                INSERT OR IGNORE INTO messages
                (id, channel_id, channel, category, author_id, author, content, attachments, timestamp)
                VALUES (:id, :channel_id, :channel, :category, :author_id, :author, :content, :attachments, :timestamp)
            """, {
                "id":          msg["id"],
                "channel_id":  msg["channel_id"],
                "channel":     msg["channel"],
                "category":    msg.get("category", "Sans catégorie"),
                "author_id":   msg["author_id"],
                "author":      msg["author"],
                "content":     msg["content"],
                "attachments": json.dumps(msg.get("attachments", [])),
                "timestamp":   msg["timestamp"],
            })
            await db.commit()

    async def get_last_message_id(self, channel_id: str) -> str | None:
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                "SELECT id FROM messages WHERE channel_id=? ORDER BY timestamp DESC LIMIT 1",
                (channel_id,)
            )
            row = await cur.fetchone()
            return row[0] if row else None

    async def get_messages_for_channel(self, channel_id: str, limit: int = 200) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM messages WHERE channel_id=? ORDER BY timestamp DESC LIMIT ?",
                (channel_id, limit)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def get_all_messages(self, limit: int = 1000) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    # ─── STATS ──────────────────────────────

    async def get_stats(self) -> dict:
        async with aiosqlite.connect(self.path) as db:
            total_msg = (await (await db.execute("SELECT COUNT(*) FROM messages")).fetchone())[0]
            channels  = (await (await db.execute("SELECT COUNT(*) FROM channels")).fetchone())[0]
            members   = (await (await db.execute("SELECT COUNT(DISTINCT author_id) FROM messages")).fetchone())[0]

            top_ch = await (await db.execute("""
                SELECT channel, COUNT(*) as c FROM messages
                GROUP BY channel ORDER BY c DESC LIMIT 1
            """)).fetchone()

            top_mb = await (await db.execute("""
                SELECT author, COUNT(*) as c FROM messages
                GROUP BY author ORDER BY c DESC LIMIT 1
            """)).fetchone()

            activity = await (await db.execute("""
                SELECT DATE(timestamp) as day, COUNT(*) as c
                FROM messages
                WHERE timestamp >= DATE('now', '-30 days')
                GROUP BY day ORDER BY day
            """)).fetchall()

            top_channels = await (await db.execute("""
                SELECT channel, COUNT(*) as c FROM messages
                GROUP BY channel ORDER BY c DESC LIMIT 10
            """)).fetchall()

        return {
            "total_messages": total_msg,
            "channels":       channels,
            "active_members": members,
            "top_channel":    top_ch[0] if top_ch else "N/A",
            "top_member":     top_mb[0] if top_mb else "N/A",
            "last_capture":   datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC"),
            "activity_30d":   [{"day": r[0], "count": r[1]} for r in activity],
            "top_channels":   [{"name": r[0], "count": r[1]} for r in top_channels],
        }

    # ─── RAPPORTS ───────────────────────────

    async def save_rapport(self, channel_id: str | None, type_: str, content: str):
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT INTO rapports (channel_id, type, content) VALUES (?, ?, ?)",
                (channel_id, type_, content)
            )
            await db.commit()

    async def get_rapports(self, limit: int = 20) -> list:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM rapports ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
