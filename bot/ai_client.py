"""
AI Module — Google Gemini 1.5 Pro
1 000 000 tokens de contexte | 1500 requêtes/jour GRATUIT
https://aistudio.google.com/app/apikey

Alternative : Groq (Llama 3.3 70B) — ultra rapide, gratuit
https://console.groq.com
"""

import os
import aiohttp
import json
import logging
from datetime import datetime

log = logging.getLogger("NationRP.AI")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
AI_PROVIDER    = os.getenv("AI_PROVIDER", "gemini")  # "gemini" ou "groq"

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent"
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """Tu es l'analyste officiel du serveur Discord NationRP.
Tu analyses les messages des joueurs, les échanges diplomatiques, économiques et militaires entre nations fictives.
Tu génères des rapports précis, des conseils stratégiques et des statistiques.
Réponds toujours en français. Sois concis mais complet. Utilise des emojis pertinents.
Format tes réponses avec des sections claires."""


class AIClient:

    async def _call_gemini(self, prompt: str) -> str:
        headers = {"Content-Type": "application/json"}
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
            }
        }
        url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as r:
                if r.status != 200:
                    err = await r.text()
                    log.error(f"Gemini error {r.status}: {err}")
                    return "❌ Erreur Gemini API."
                data = await r.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_groq(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type":  "application/json",
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system",  "content": SYSTEM_PROMPT},
                {"role": "user",    "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens":  2048,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(GROQ_URL, headers=headers, json=payload) as r:
                if r.status != 200:
                    err = await r.text()
                    log.error(f"Groq error {r.status}: {err}")
                    return "❌ Erreur Groq API."
                data = await r.json()
                return data["choices"][0]["message"]["content"]

    async def call(self, prompt: str) -> str:
        try:
            if AI_PROVIDER == "groq" and GROQ_API_KEY:
                return await self._call_groq(prompt)
            elif GEMINI_API_KEY:
                return await self._call_gemini(prompt)
            else:
                return "❌ Aucune clé API configurée (GEMINI_API_KEY ou GROQ_API_KEY)."
        except Exception as e:
            log.error(f"AI call failed: {e}")
            return f"❌ Erreur IA : {e}"

    # ─── PROMPTS SPÉCIALISÉS ─────────────────

    async def generate_channel_rapport(self, channel_name: str, messages: list) -> str:
        if not messages:
            return "Aucun message à analyser pour ce salon."

        sample = messages[:150]
        conversation = "\n".join(
            f"[{m['timestamp'][:10]}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )

        prompt = f"""Analyse le salon Discord #{channel_name} d'un serveur NationRP.

MESSAGES (derniers {len(sample)}) :
{conversation}

Génère un rapport structuré incluant :
1. 📋 **Résumé** — De quoi parle ce salon ? (2-3 phrases)
2. 🎭 **Activité RP** — Niveau d'immersion, qualité des échanges
3. 👥 **Membres actifs** — Qui contribue le plus et comment
4. 📈 **Tendances** — Sujets récurrents, évolutions notables
5. ⚡ **Points chauds** — Conflits, alliances, événements majeurs
6. 💡 **Recommandations** — Comment améliorer ce salon

Rapport daté du {datetime.utcnow().strftime('%d/%m/%Y')}."""

        return await self.call(prompt)

    async def generate_server_rapport(self, stats: dict, recent_messages: list) -> str:
        sample = recent_messages[:300]
        conversation = "\n".join(
            f"[#{m['channel']}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:8000]

        prompt = f"""Analyse globale du serveur NationRP.

STATISTIQUES :
- Messages totaux : {stats.get('total_messages', 0):,}
- Membres actifs : {stats.get('active_members', 0)}
- Salons capturés : {stats.get('channels', 0)}
- Salon le plus actif : #{stats.get('top_channel', 'N/A')}

TOP SALONS :
{json.dumps(stats.get('top_channels', []), ensure_ascii=False, indent=2)}

APERÇU DES MESSAGES RÉCENTS :
{conversation}

Génère un rapport de gouvernance complet :
1. 🌍 **État du serveur** — Santé générale de la communauté
2. 🏆 **Nations actives** — Qui joue, qui s'investit
3. ⚔️ **Dynamiques politiques** — Alliances, conflits, diplomatie
4. 📊 **Analyse d'engagement** — Heures de pointe, rétention
5. 🚨 **Alertes** — Inactivité, tensions, problèmes détectés
6. 🎯 **Plan d'action** — 5 recommandations prioritaires pour les admins

Rapport daté du {datetime.utcnow().strftime('%d/%m/%Y')}."""

        return await self.call(prompt)

    async def generate_conseils(self, stats: dict, messages: list) -> str:
        sample = messages[:200]
        activity = "\n".join(
            f"- {c['name']} : {c['count']} messages"
            for c in stats.get("top_channels", [])
        )

        prompt = f"""Tu conseilles les admins d'un serveur NationRP.

DONNÉES ACTUELLES :
{activity}
Membres actifs : {stats.get('active_members', 0)}
Total messages : {stats.get('total_messages', 0):,}

Donne 5 conseils concrets et actionnables pour :
- Augmenter l'engagement des joueurs
- Améliorer la qualité du RP
- Équilibrer l'activité entre nations
- Créer des événements pertinents
- Fidéliser la communauté

Chaque conseil doit avoir : une action précise, pourquoi c'est utile, et comment le mettre en place."""

        return await self.call(prompt)
