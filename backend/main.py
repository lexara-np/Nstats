"""
Backend FastAPI — NationRP Analytics
Optimisé pour Railway.app
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sys, os

# Chemins absolus compatibles Railway
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOT_DIR      = os.path.join(BASE_DIR, "bot")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend", "dist")
DB_PATH      = os.getenv("DB_PATH", os.path.join(BASE_DIR, "data", "nationrp.db"))

sys.path.insert(0, BOT_DIR)

from database import Database
from ai_client import AIClient
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("NationRP.API")

app = FastAPI(title="NationRP Analytics API", version="1.0.0")
db  = Database(DB_PATH)
ai  = AIClient()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sert le frontend buildé
if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")


@app.on_event("startup")
async def startup():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    await db.init()
    log.info(f"✅ API démarrée — DB: {DB_PATH}")


# ═══════════════════════════════════════════
#  MODÈLES
# ═══════════════════════════════════════════

class RapportRequest(BaseModel):
    channel_id:   str
    channel_name: str


# ═══════════════════════════════════════════
#  ROUTES — DONNÉES
# ═══════════════════════════════════════════

@app.get("/api/stats")
async def get_stats():
    """Statistiques générales du serveur."""
    return await db.get_stats()


@app.get("/api/channels")
async def get_channels():
    """Liste tous les salons capturés."""
    return await db.get_all_channels()


@app.get("/api/channels/{channel_id}/messages")
async def get_channel_messages(channel_id: str, limit: int = 100):
    """Messages d'un salon spécifique."""
    msgs = await db.get_messages_for_channel(channel_id, limit)
    if not msgs:
        raise HTTPException(404, "Salon non trouvé ou vide")
    return msgs


@app.get("/api/messages")
async def get_messages(limit: int = 200):
    """Derniers messages globaux."""
    return await db.get_all_messages(limit)


@app.get("/api/rapports")
async def get_rapports(limit: int = 20):
    """Historique des rapports générés."""
    return await db.get_rapports(limit)


@app.get("/api/members")
async def get_members():
    """Top membres par activité."""
    import aiosqlite
    async with aiosqlite.connect(DB_PATH) as db_conn:
        db_conn.row_factory = aiosqlite.Row
        cur = await db_conn.execute("""
            SELECT
                author,
                author_id,
                COUNT(*) as message_count,
                COUNT(DISTINCT channel_id) as channels_used,
                MAX(timestamp) as last_active,
                MIN(timestamp) as first_seen
            FROM messages
            GROUP BY author_id
            ORDER BY message_count DESC
            LIMIT 50
        """)
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


# ═══════════════════════════════════════════
#  ROUTES — IA
# ═══════════════════════════════════════════

@app.post("/api/rapport")
async def generate_rapport(req: RapportRequest):
    """Génère un rapport IA pour un salon."""
    msgs = await db.get_messages_for_channel(req.channel_id, 200)
    rapport = await ai.generate_channel_rapport(req.channel_name, msgs)
    await db.save_rapport(req.channel_id, "channel", rapport)
    return {"rapport": rapport, "channel": req.channel_name}


@app.post("/api/rapport-serveur")
async def generate_server_rapport():
    """Génère un rapport IA global du serveur."""
    stats = await db.get_stats()
    msgs  = await db.get_all_messages(500)
    rapport = await ai.generate_server_rapport(stats, msgs)
    await db.save_rapport(None, "server", rapport)
    return {"rapport": rapport}


@app.get("/api/conseil")
async def get_conseil():
    """Génère des conseils IA pour améliorer le serveur."""
    stats = await db.get_stats()
    msgs  = await db.get_all_messages(300)
    conseil = await ai.generate_conseils(stats, msgs)
    return {"conseil": conseil}


@app.post("/api/refresh-stats")
async def refresh_stats():
    """Déclenché par le bot après chaque capture."""
    log.info("🔄 Refresh stats déclenché par le bot")
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── SPA fallback ────────────────────────
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "API NationRP opérationnelle. Frontend non buildé."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
