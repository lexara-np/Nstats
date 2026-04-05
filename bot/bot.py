"""
NationRP Discord Bot
Capture tous les salons, stocke les messages, envoie à l'IA pour analyse
IA recommandée : Google Gemini 1.5 Pro (1M tokens contexte, gratuit)
"""

import discord
from discord.ext import commands, tasks
import asyncio
import aiohttp
import json
import os
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from database import Database

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("bot.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("NationRP")

# ─────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────
DISCORD_TOKEN    = os.getenv("DISCORD_TOKEN")
GUILD_ID         = int(os.getenv("GUILD_ID", "0"))
BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:8000")
CAPTURE_INTERVAL = int(os.getenv("CAPTURE_INTERVAL", "300"))
HISTORY_LIMIT    = int(os.getenv("HISTORY_LIMIT", "500"))
DB_PATH          = os.getenv("DB_PATH", os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "nationrp.db"
))

# Salons à ignorer (bots, logs système, etc.)
IGNORED_CHANNEL_NAMES = {"bot-logs", "mod-logs", "audit", "welcome", "rules"}
IGNORED_CATEGORIES    = {"📌 ADMINISTRATION", "🔧 SYSTÈME"}

# ─────────────────────────────────────────
#  INTENTS
# ─────────────────────────────────────────
intents = discord.Intents.default()
intents.message_content = True
intents.guilds           = True
intents.members          = True

bot = commands.Bot(command_prefix="!", intents=intents)
db  = Database(DB_PATH)


# ═══════════════════════════════════════════
#  EVENTS
# ═══════════════════════════════════════════

@bot.event
async def on_ready():
    log.info(f"✅ Connecté en tant que {bot.user} (ID: {bot.user.id})")
    await db.init()
    sync = await bot.tree.sync()
    log.info(f"⚡ {len(sync)} slash commands synchronisées")
    capture_loop.start()


@bot.event
async def on_message(message: discord.Message):
    """Capture chaque nouveau message en temps réel."""
    if message.author.bot:
        return
    if not message.guild or message.guild.id != GUILD_ID:
        return

    await db.save_message({
        "id":          str(message.id),
        "channel_id":  str(message.channel.id),
        "channel":     message.channel.name,
        "category":    message.channel.category.name if message.channel.category else "Sans catégorie",
        "author_id":   str(message.author.id),
        "author":      str(message.author.display_name),
        "content":     message.content,
        "attachments": [a.url for a in message.attachments],
        "timestamp":   message.created_at.isoformat(),
    })

    await bot.process_commands(message)


@bot.event
async def on_guild_channel_create(channel):
    log.info(f"🆕 Nouveau salon détecté : #{channel.name}")
    await db.save_channel(channel)


# ═══════════════════════════════════════════
#  TÂCHE DE CAPTURE PÉRIODIQUE
# ═══════════════════════════════════════════

@tasks.loop(seconds=CAPTURE_INTERVAL)
async def capture_loop():
    """Capture l'historique de tous les salons textuels."""
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        log.warning("⚠️ Serveur introuvable.")
        return

    log.info(f"🔄 Début de la capture — {len(guild.text_channels)} salons")
    total = 0

    for channel in guild.text_channels:
        # Filtre
        if channel.name in IGNORED_CHANNEL_NAMES:
            continue
        if channel.category and channel.category.name in IGNORED_CATEGORIES:
            continue

        # Permissions
        perms = channel.permissions_for(guild.me)
        if not perms.read_message_history:
            continue

        # Sauvegarde métadonnées salon
        await db.save_channel({
            "id":       str(channel.id),
            "name":     channel.name,
            "category": channel.category.name if channel.category else "Sans catégorie",
            "topic":    channel.topic or "",
            "nsfw":     channel.is_nsfw(),
        })

        # Récupère les derniers messages non encore capturés
        last_id = await db.get_last_message_id(str(channel.id))
        after   = discord.Object(id=int(last_id)) if last_id else None

        try:
            count = 0
            async for msg in channel.history(limit=HISTORY_LIMIT, after=after, oldest_first=True):
                if msg.author.bot:
                    continue
                await db.save_message({
                    "id":          str(msg.id),
                    "channel_id":  str(channel.id),
                    "channel":     channel.name,
                    "category":    channel.category.name if channel.category else "Sans catégorie",
                    "author_id":   str(msg.author.id),
                    "author":      str(msg.author.display_name),
                    "content":     msg.content,
                    "attachments": [a.url for a in msg.attachments],
                    "timestamp":   msg.created_at.isoformat(),
                })
                count += 1
            total += count
            if count:
                log.info(f"   #{channel.name} → {count} nouveaux messages")
        except discord.Forbidden:
            log.warning(f"   ❌ Accès refusé : #{channel.name}")
        except Exception as e:
            log.error(f"   💥 Erreur #{channel.name} : {e}")

    log.info(f"✅ Capture terminée — {total} messages sauvegardés")

    # Notifie le backend pour régénérer les stats
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{BACKEND_URL}/api/refresh-stats")
        except Exception:
            pass


@capture_loop.before_loop
async def before_capture():
    await bot.wait_until_ready()


# ═══════════════════════════════════════════
#  SLASH COMMANDS
# ═══════════════════════════════════════════

@bot.tree.command(name="rapport", description="Génère un rapport IA sur un salon ou le serveur")
async def rapport(interaction: discord.Interaction, salon: discord.TextChannel = None):
    await interaction.response.defer(thinking=True)
    target = salon or interaction.channel

    async with aiohttp.ClientSession() as session:
        try:
            r = await session.post(
                f"{BACKEND_URL}/api/rapport",
                json={"channel_id": str(target.id), "channel_name": target.name}
            )
            data = await r.json()
            rapport_text = data.get("rapport", "Aucune donnée disponible.")
        except Exception as e:
            rapport_text = f"❌ Erreur lors de la génération : {e}"

    embed = discord.Embed(
        title=f"📊 Rapport IA — #{target.name}",
        description=rapport_text[:4096],
        color=0x7B2FBE,
        timestamp=datetime.utcnow()
    )
    embed.set_footer(text="NationRP Analytics • Gemini 1.5 Pro")
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="stats", description="Affiche les statistiques d'activité du serveur")
async def stats(interaction: discord.Interaction):
    await interaction.response.defer(thinking=True)

    async with aiohttp.ClientSession() as session:
        try:
            r    = await session.get(f"{BACKEND_URL}/api/stats")
            data = await r.json()
        except Exception as e:
            await interaction.followup.send(f"❌ Erreur : {e}")
            return

    embed = discord.Embed(title="📈 Statistiques NationRP", color=0x5B1FA3, timestamp=datetime.utcnow())
    embed.add_field(name="Messages totaux",    value=f"**{data.get('total_messages', 0):,}**",  inline=True)
    embed.add_field(name="Membres actifs",     value=f"**{data.get('active_members', 0)}**",    inline=True)
    embed.add_field(name="Salons capturés",    value=f"**{data.get('channels', 0)}**",           inline=True)
    embed.add_field(name="Salon le + actif",   value=data.get("top_channel", "N/A"),             inline=True)
    embed.add_field(name="Membre le + actif",  value=data.get("top_member",  "N/A"),             inline=True)
    embed.add_field(name="Dernière capture",   value=data.get("last_capture", "N/A"),            inline=True)
    embed.set_footer(text="NationRP Analytics")
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="conseil", description="Obtiens des conseils IA pour améliorer ton rôleplay")
async def conseil(interaction: discord.Interaction):
    await interaction.response.defer(thinking=True)

    async with aiohttp.ClientSession() as session:
        try:
            r    = await session.get(f"{BACKEND_URL}/api/conseil")
            data = await r.json()
            text = data.get("conseil", "Aucun conseil disponible.")
        except Exception as e:
            text = f"❌ Erreur : {e}"

    embed = discord.Embed(
        title="💡 Conseils IA pour ton NationRP",
        description=text[:4096],
        color=0x9B4DCA,
        timestamp=datetime.utcnow()
    )
    embed.set_footer(text="NationRP Analytics • Gemini 1.5 Pro")
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="capture", description="[ADMIN] Force une capture immédiate")
async def capture(interaction: discord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("❌ Accès réservé aux admins.", ephemeral=True)
        return
    await interaction.response.send_message("🔄 Capture en cours...", ephemeral=True)
    capture_loop.restart()


# ─────────────────────────────────────────
if __name__ == "__main__":
    bot.run(DISCORD_TOKEN)
