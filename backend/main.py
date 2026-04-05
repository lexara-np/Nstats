"""
Backend FastAPI — NationRP Analytics v2
Optimisé pour Railway.app — Dev Tier Groq
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sys, os, aiosqlite

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

app = FastAPI(title="NationRP Analytics API", version="2.0.0")
db  = Database(DB_PATH)
ai  = AIClient()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

@app.on_event("startup")
async def startup():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    await db.init()
    log.info(f"✅ API v2 démarrée — DB: {DB_PATH}")

# ═══════════════════════════════════════════
#  MODÈLES
# ═══════════════════════════════════════════

class RapportRequest(BaseModel):
    channel_id:   str
    channel_name: str

class RapportTypeRequest(BaseModel):
    type: str

class ChatRequest(BaseModel):
    question: str
    context:  str = ""
    history:  list = []

# ═══════════════════════════════════════════
#  ROUTES — DONNÉES
# ═══════════════════════════════════════════

@app.get("/api/stats")
async def get_stats():
    return await db.get_stats()

@app.get("/api/channels")
async def get_channels():
    return await db.get_all_channels()

@app.get("/api/channels/{channel_id}/messages")
async def get_channel_messages(channel_id: str, limit: int = 200):
    msgs = await db.get_messages_for_channel(channel_id, limit)
    if not msgs:
        raise HTTPException(404, "Salon non trouvé ou vide")
    return msgs

@app.get("/api/messages")
async def get_messages(limit: int = 15000, channel: str = None):
    if channel:
        async with aiosqlite.connect(DB_PATH) as conn:
            conn.row_factory = aiosqlite.Row
            cur = await conn.execute(
                "SELECT * FROM messages WHERE channel LIKE ? ORDER BY timestamp DESC LIMIT ?",
                (f"%{channel}%", limit)
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
    return await db.get_all_messages(limit)

@app.get("/api/rapports")
async def get_rapports(limit: int = 50):
    return await db.get_rapports(limit)

@app.get("/api/members")
async def get_members():
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("""
            SELECT author, author_id,
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

@app.get("/api/timeline")
async def get_timeline():
    """Événements majeurs RP détectés (messages longs dans salons clés)."""
    SALONS_EVENEMENTS = [
        "diplomatie", "action-guerre", "déclaration-guerre", "traité-de-paix",
        "annonce-rp", "tribunal", "séance-tribunal", "worldvision",
        "sommet-de-la-paix", "résumé-rp"
    ]
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        placeholders = ",".join("?" * len(SALONS_EVENEMENTS))
        conditions = " OR ".join([f"channel LIKE ?" for _ in SALONS_EVENEMENTS])
        cur = await conn.execute(f"""
            SELECT * FROM messages
            WHERE ({conditions})
            AND LENGTH(content) > 100
            AND content NOT LIKE 'http%'
            AND content NOT LIKE '!%'
            ORDER BY timestamp DESC
            LIMIT 100
        """, [f"%{s}%" for s in SALONS_EVENEMENTS])
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

@app.get("/api/alliances")
async def get_alliances():
    """Messages des salons d'organisations internationales."""
    ORGS = ["onu", "otsc", "apu", "acse", "aei", "pgai", "les-alliances", "diplomatie", "traité-de-paix"]
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        conditions = " OR ".join([f"channel LIKE ?" for _ in ORGS])
        cur = await conn.execute(f"""
            SELECT * FROM messages
            WHERE ({conditions})
            AND LENGTH(content) > 20
            ORDER BY timestamp DESC
            LIMIT 200
        """, [f"%{o}%" for o in ORGS])
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

@app.get("/api/conflits")
async def get_conflits():
    """Messages des salons militaires."""
    MILITARY = ["action-guerre", "déclaration-guerre", "propagande", "rumeur"]
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        conditions = " OR ".join([f"channel LIKE ?" for _ in MILITARY])
        cur = await conn.execute(f"""
            SELECT * FROM messages
            WHERE ({conditions})
            AND LENGTH(content) > 20
            ORDER BY timestamp DESC
            LIMIT 200
        """, [f"%{m}%" for m in MILITARY])
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

@app.get("/api/nations/stats")
async def get_nations_stats():
    """Stats par nation (messages par salon-pays)."""
    NATIONS = [
        "france","allemagne","usa","urss","chine","japon","arabie-saoudite",
        "inde","brésil","italie","suède","danemark","norvège","pays-bas",
        "suisse","nigéria","australie","pérou","grèce","cote-divoire",
        "federation-sainte","rpu-goryeo","irlande","mongolie","islande",
        "sénégal","portugal","espagne","belgique","canada","égypte"
    ]
    async with aiosqlite.connect(DB_PATH) as conn:
        result = []
        for nation in NATIONS:
            cur = await conn.execute(
                "SELECT COUNT(*) as c, MAX(timestamp) as last FROM messages WHERE channel LIKE ?",
                (f"%{nation}%",)
            )
            row = await cur.fetchone()
            if row and row[0] > 0:
                result.append({
                    "nation": nation,
                    "messages": row[0],
                    "last_active": row[1]
                })
        result.sort(key=lambda x: x["messages"], reverse=True)
        return result

# ═══════════════════════════════════════════
#  ROUTES — IA
# ═══════════════════════════════════════════

@app.post("/api/rapport")
async def generate_rapport(req: RapportRequest):
    msgs = await db.get_messages_for_channel(req.channel_id, 4000)
    rapport = await ai.generate_channel_rapport(req.channel_name, msgs)
    await db.save_rapport(req.channel_id, "channel", rapport)
    return {"rapport": rapport, "channel": req.channel_name}

@app.post("/api/rapport-serveur")
async def generate_server_rapport():
    stats = await db.get_stats()
    msgs  = await db.get_all_messages(4000)
    rapport = await ai.generate_server_rapport(stats, msgs)
    await db.save_rapport(None, "server", rapport)
    return {"rapport": rapport}

@app.get("/api/conseil")
async def get_conseil():
    stats = await db.get_stats()
    msgs  = await db.get_all_messages(1000)
    conseil = await ai.generate_conseils(stats, msgs)
    return {"conseil": conseil}

@app.post("/api/rapport-diplomatie")
async def generate_diplomatie_rapport():
    """Rapport IA sur la situation diplomatique."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("""
            SELECT * FROM messages
            WHERE channel LIKE '%diplomatie%' OR channel LIKE '%traité%'
            OR channel LIKE '%onu%' OR channel LIKE '%otsc%'
            OR channel LIKE '%alliance%' OR channel LIKE '%sommet%'
            ORDER BY timestamp DESC LIMIT 4000
        """)
        rows = await cur.fetchall()
        msgs = [dict(r) for r in rows]
    rapport = await ai.generate_diplomatie_rapport(msgs)
    await db.save_rapport(None, "diplomatie", rapport)
    return {"rapport": rapport}

@app.post("/api/rapport-guerre")
async def generate_guerre_rapport():
    """Rapport IA sur les conflits militaires."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("""
            SELECT * FROM messages
            WHERE channel LIKE '%guerre%' OR channel LIKE '%déclaration%'
            OR channel LIKE '%propagande%' OR channel LIKE '%rumeur%'
            OR channel LIKE '%action%'
            ORDER BY timestamp DESC LIMIT 4000
        """)
        rows = await cur.fetchall()
        msgs = [dict(r) for r in rows]
    rapport = await ai.generate_guerre_rapport(msgs)
    await db.save_rapport(None, "guerre", rapport)
    return {"rapport": rapport}

@app.post("/api/rapport-economie")
async def generate_economie_rapport():
    """Rapport IA sur l'économie et les territoires."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        cur = await conn.execute("""
            SELECT * FROM messages
            WHERE channel LIKE '%vente%' OR channel LIKE '%territoire%'
            OR channel LIKE '%économie%' OR channel LIKE '%classement%'
            ORDER BY timestamp DESC LIMIT 4000
        """)
        rows = await cur.fetchall()
        msgs = [dict(r) for r in rows]
    rapport = await ai.generate_economie_rapport(msgs)
    await db.save_rapport(None, "economie", rapport)
    return {"rapport": rapport}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Chat direct avec l'IA avec contexte du serveur."""
    response = await ai.chat(req.question, req.context, req.history)
    return {"response": response}


@app.post("/api/refresh-stats")
async def refresh_stats():
    log.info("🔄 Refresh stats déclenché par le bot")
    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0"}

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "API NationRP v2 opérationnelle."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
