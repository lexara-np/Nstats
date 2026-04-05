import os
import aiohttp
import logging
from datetime import datetime

log = logging.getLogger("NationRP.AI")

# === CONFIGURATION ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY")
AI_PROVIDER    = os.getenv("AI_PROVIDER", "groq").lower()

# On utilise gemini-1.5-flash qui est le standard actuel rapide et très performant
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

# On baisse la température pour forcer la logique et le factuel (fini les hallucinations)
AI_TEMPERATURE = 0.3 

SYSTEM_PROMPT = """Tu es l'analyste stratégique de PAX HISTORIA FR, un serveur Discord NationRP moderne (155 membres).
Rôle : Analyser les échanges (diplomatie, économie, guerre, rp) avec une précision chirurgicale.
Règles absolues :
1. Sois 100% factuel. Si une information n'est pas dans le texte fourni, NE L'INVENTE PAS.
2. N'utilise pas de formulations vagues ("il semblerait que"). Sois direct.
3. Ne génère une section que si les messages justifient son existence.
4. Réponds toujours en français, avec un formatage Markdown propre."""

class AIClient:
    def __init__(self):
        # On garde une seule session ouverte pour ne pas surcharger le réseau
        self.session = None

    async def get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    # ─── UTILITAIRES ─────────────────────────

    def _clean_messages(self, messages: list, max_msgs: int = 100, max_chars: int = 15000) -> str:
        """Nettoie et formate les messages pour éviter le bruit inutile (OOC court, etc.)"""
        if not messages:
            return "Aucun message."
        
        # Filtrer les messages très courts (souvent des "ok", "salut")
        valid_msgs = [m for m in messages if m.get("content") and len(m["content"].strip()) > 10]
        sample = valid_msgs[:max_msgs]
        
        conversation = "\n".join(
            f"[{m.get('timestamp', '')[:10]}] {m.get('author', 'Inconnu')}: {m['content']}"
            for m in sample
        )
        return conversation[:max_chars]

    # ─── APPELS API ─────────────────────────

    async def _call_gemini(self, prompt: str) -> str:
        headers = {"Content-Type": "application/json"}
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": AI_TEMPERATURE,
                "maxOutputTokens": 2048,
            }
        }
        url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"

        session = await self.get_session()
        async with session.post(url, headers=headers, json=payload) as r:
            if r.status != 200:
                err = await r.text()
                log.error(f"Gemini error {r.status}: {err}")
                raise Exception("Erreur API Gemini")
            data = await r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_groq(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type":  "application/json",
        }
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system",  "content": SYSTEM_PROMPT},
                {"role": "user",    "content": prompt},
            ],
            "temperature": AI_TEMPERATURE,
            "max_tokens":  2048,
        }

        session = await self.get_session()
        async with session.post(GROQ_URL, headers=headers, json=payload) as r:
            if r.status != 200:
                err = await r.text()
                log.error(f"Groq error {r.status}: {err}")
                raise Exception("Erreur API Groq")
            data = await r.json()
            return data["choices"][0]["message"]["content"]

    async def call(self, prompt: str) -> str:
        """Appelle l'IA avec un système de Fallback automatique (Secours)."""
        provider = AI_PROVIDER
        
        try:
            if provider == "groq":
                return await self._call_groq(prompt)
            return await self._call_gemini(prompt)
        except Exception as e:
            log.warning(f"Le provider {provider} a échoué ({e}). Basculement sur le fallback...")
            try:
                # Fallback inverse
                if provider == "groq":
                    return await self._call_gemini(prompt)
                return await self._call_groq(prompt)
            except Exception as e2:
                log.error(f"Tous les services IA sont HS : {e2}")
                return "❌ Erreur : Impossible de générer le rapport. Les API IA sont inaccessibles."

    # ─── PROMPTS SPÉCIALISÉS ─────────────────

    async def generate_channel_rapport(self, channel_name: str, messages: list) -> str:
        conversation = self._clean_messages(messages, max_msgs=150)
        if conversation == "Aucun message.":
            return f"Le salon #{channel_name} est vide ou ne contient aucun message pertinent."

        prompt = f"""### CONTEXTE
Analyse du salon : #{channel_name}
Date de l'analyse : {datetime.utcnow().strftime('%d/%m/%Y')}

### DONNÉES BRUTES (MESSAGES RÉCENTS)
{conversation}

### INSTRUCTIONS DE RÉDACTION
Génère un rapport structuré basé **uniquement** sur les données brutes ci-dessus.
Ne remplis pas une section si tu n'as pas l'information. Utilise le format suivant :

🗂️ **RÉSUMÉ EXÉCUTIF**
(2 phrases max résumant l'activité principale)

👥 **ACTEURS IMPLIQUÉS**
(Liste des joueurs/nations actifs dans ces messages)

🎯 **ACTIONS CLÉS & DÉCISIONS**
(Bullet points des traités, déclarations, ventes, ou mouvements constatés)

⚠️ **TENSIONS & HORS-RP (Optionnel)**
(Mentionne uniquement s'il y a des disputes, du méta-gaming, ou du hors-rp évident)

📊 **QUALITÉ DU RP**
(Note sur 10 de l'immersion globale avec 1 phrase de justification)"""

        return await self.call(prompt)

    async def generate_server_rapport(self, stats: dict, recent_messages: list) -> str:
        conversation = self._clean_messages(recent_messages, max_msgs=200)
        
        top_channels = "\n".join(f"- #{c['name']} : {c['count']} msgs" for c in stats.get("top_channels", [])[:5])

        prompt = f"""### CONTEXTE GLOBAL DU SERVEUR
Total messages récents : {stats.get('total_messages', 0)}
Joueurs actifs : {stats.get('active_members', 0)}
Salons les plus actifs :
{top_channels}

### EXTRAIT DES ÉCHANGES MULTI-SALONS
{conversation}

### INSTRUCTIONS
Rédige le bulletin géopolitique global de PAX HISTORIA. 
Ignore les sections si aucune donnée ne s'y rapporte.

🌍 **SITUATION GÉOPOLITIQUE**
(Résumé de l'état du monde selon les messages fournis)

⚔️ **CONFLITS & DIPLOMATIE**
(Guerres en cours, traités majeurs, rôle de l'ONU/OTSC si mentionné)

💰 **MOUVEMENTS ÉCONOMIQUES**
(Achats, ventes de territoires, embargos remarqués)

🚨 **VIGILANCE ADMIN**
(Joueurs problématiques, inactivité dangereuse, ou problèmes OOC)"""

        return await self.call(prompt)

    async def generate_conseils(self, stats: dict, messages: list) -> str:
        conversation = self._clean_messages(messages, max_msgs=100)
        top_channels = stats.get("top_channels", [])
        
        prompt = f"""### DONNÉES DU SERVEUR
Membres actifs : {stats.get('active_members', 0)}
Salons très actifs : {', '.join(c['name'] for c in top_channels[:3]) if top_channels else 'N/A'}
Salons en déclin : {', '.join(c['name'] for c in top_channels[-3:]) if len(top_channels) > 3 else 'N/A'}

### EXTRAIT DES DERNIERS ÉCHANGES
{conversation}

### INSTRUCTIONS
En tant que conseiller Admin, propose **3 actions concrètes et immédiates** pour dynamiser le serveur, basées sur l'activité actuelle.
Pour chaque conseil, utilise ce format strict :

**[Titre de l'action]**
- 🎯 **Objectif** : (Pourquoi faire ça ?)
- 📋 **Comment faire** : (1 étape claire pour les admins)
- 💥 **Impact estimé** : (Faible/Moyen/Élevé)"""

        return await self.call(prompt)

    async def generate_diplomatie_rapport(self, messages: list) -> str:
        conversation = self._clean_messages(messages, max_msgs=150)
        prompt = f"""### DONNÉES DIPLOMATIQUES
{conversation}

### INSTRUCTIONS
Analyse ces échanges diplomatiques et génère ce rapport factuel :

🤝 **NÉGOCIATIONS EN COURS**
(Qui discute avec qui et pourquoi)

📜 **ACCORDS & RUPTURES**
(Traités validés ou rejetés)

⚡ **CLIMAT INTERNATIONAL**
(Ambiance générale : Pacifique, tendue, guerre froide, etc.)"""
        return await self.call(prompt)

    async def generate_guerre_rapport(self, messages: list) -> str:
        conversation = self._clean_messages(messages, max_msgs=150)
        prompt = f"""### DONNÉES MILITAIRES
{conversation}

### INSTRUCTIONS
Analyse les opérations et le RP militaire. Fournis :

⚔️ **FRONTS ACTIFS**
(Qui attaque, qui défend)

🗺️ **MOUVEMENTS STRATÉGIQUES**
(Troupes déplacées, territoires capturés)

⚖️ **RAPPORTS DE FORCE**
(Quel camp prend l'avantage factuellement)"""
        return await self.call(prompt)

    async def generate_economie_rapport(self, messages: list) -> str:
        conversation = self._clean_messages(messages, max_msgs=150)
        prompt = f"""### DONNÉES ÉCONOMIQUES
{conversation}

### INSTRUCTIONS
Analyse les flux financiers et territoriaux :

💰 **TRANSACTIONS MAJEURES**
(Qui achète quoi et à quel prix)

🤝 **PARTENARIATS COMMERCIAUX**
(Nouvelles routes, alliances économiques, ou sanctions)"""
        return await self.call(prompt)
