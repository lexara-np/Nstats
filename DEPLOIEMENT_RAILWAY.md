# ⬡ NationRP Analytics — Guide Railway

## Architecture Railway

2 services séparés dans le même projet Railway :
- **nationrp-api** → FastAPI + Dashboard React (avec domaine public)
- **nationrp-bot** → Bot Discord (pas de port exposé)

Les deux partagent le même **Volume Railway** pour la base SQLite.

---

## 🚀 Déploiement étape par étape

### Étape 1 — Prépare GitHub

```bash
# Dans le dossier du projet
git init
git add .
git commit -m "Initial NationRP bot"

# Crée un repo sur github.com, puis :
git remote add origin https://github.com/TON_PSEUDO/nationrp-bot.git
git push -u origin main
```

### Étape 2 — Crée le projet Railway

1. Va sur https://railway.app → **New Project**
2. Clique **Deploy from GitHub repo**
3. Sélectionne ton repo `nationrp-bot`
4. Railway crée automatiquement un premier service

---

### Étape 3 — Service API (dashboard + backend)

Dans le service créé automatiquement :

**Settings → Build Command :**
```
pip install -r requirements.txt && cd frontend && npm install && npm run build
```

**Settings → Start Command :**
```
python backend/main.py
```

**Settings → Generate Domain** → active le domaine public Railway

**Variables d'environnement à ajouter :**
```
DISCORD_TOKEN      = ton_token_discord
GUILD_ID           = id_de_ton_serveur
GEMINI_API_KEY     = ta_cle_gemini
AI_PROVIDER        = gemini
DB_PATH            = /data/nationrp.db
BACKEND_URL        = https://TON-DOMAINE.railway.app
```

---

### Étape 4 — Ajoute un Volume partagé

Dans Railway → ton projet → **+ New** → **Volume**
- Mount path : `/data`
- Attache ce volume aux **deux services** (API et bot)

Ça permet à l'API et au bot de partager la même base SQLite.

---

### Étape 5 — Service Bot Discord

Dans Railway → **+ New Service** → **GitHub Repo** → même repo

**Settings → Build Command :**
```
pip install -r requirements.txt
```

**Settings → Start Command :**
```
python bot/bot.py
```

**Variables d'environnement :**
```
DISCORD_TOKEN      = ton_token_discord
GUILD_ID           = id_de_ton_serveur
GEMINI_API_KEY     = ta_cle_gemini
AI_PROVIDER        = gemini
DB_PATH            = /data/nationrp.db
BACKEND_URL        = https://TON-DOMAINE.railway.app
CAPTURE_INTERVAL   = 300
HISTORY_LIMIT      = 500
```

Attache le même Volume `/data` à ce service aussi.

---

### Étape 6 — Deploy !

Clique **Deploy** sur les deux services. En 2-3 minutes :
- ✅ Le bot apparaît en ligne sur Discord
- ✅ Le dashboard est accessible sur ton domaine Railway
- ✅ Les slash commands `/rapport`, `/stats`, `/conseil` sont disponibles

---

## 🔑 Où trouver les clés

| Clé | Où la trouver |
|-----|--------------|
| `DISCORD_TOKEN` | discord.com/developers → ton app → Bot → Reset Token |
| `GUILD_ID` | Discord → clic droit sur ton serveur → Copier l'identifiant |
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey → Create API key |

---

## ✅ Vérification

Une fois déployé, visite `https://TON-DOMAINE.railway.app/health`
→ tu dois voir `{"status": "ok"}`

Le dashboard est sur `https://TON-DOMAINE.railway.app`
