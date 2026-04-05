# ⬡ NationRP Analytics

Système complet de capture, analyse et visualisation pour serveurs Discord NationRP.

```
Discord Server ──→ Bot Python ──→ SQLite DB ──→ FastAPI ──→ React Dashboard
                                              ↓
                                        Gemini 1.5 Pro (IA)
```

---

## 🤖 IA recommandée — Google Gemini 1.5 Pro

| Provider            | Contexte     | Gratuit       | Vitesse   |
|---------------------|-------------|---------------|-----------|
| **Gemini 1.5 Pro**  | **1M tokens**| 1 500 req/jour| Rapide    |
| Groq Llama 3.3 70B  | 128K tokens  | 14 400 req/jour| Ultra rapide |

**Gemini 1.5 Pro est le choix idéal** : 1 million de tokens = tu peux envoyer l'historique complet de tout ton serveur en une seule requête IA.

Clé gratuite : https://aistudio.google.com/app/apikey

---

## 🚀 Installation

### 1. Cloner & configurer

```bash
git clone <repo>
cd nationrp-bot

cp .env.example .env
# Édite .env avec tes clés API
```

### 2. Bot Discord

```bash
# Créer un environnement virtuel
cd bot
python -m venv venv
source venv/bin/activate   # Windows : venv\Scripts\activate

pip install -r ../requirements.txt

python bot.py
```

### 3. Backend API

```bash
cd backend
source ../bot/venv/bin/activate

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Frontend React

```bash
cd frontend
npm install
npm run dev        # Développement → http://localhost:3000
# ou
npm run build      # Production → dossier dist/
```

---

## ⚙️ Configuration Discord

1. Va sur https://discord.com/developers/applications
2. Crée une application → Bot
3. Active les **Privileged Gateway Intents** :
   - ✅ Server Members Intent
   - ✅ Message Content Intent
4. Génère le token → colle dans `.env`
5. Invite le bot avec les permissions :
   - Read Messages / View Channels
   - Read Message History
   - Send Messages
   - Use Slash Commands

---

## 📋 Commandes Discord

| Commande | Description |
|----------|-------------|
| `/rapport [#salon]` | Rapport IA sur un salon (ou le salon actuel) |
| `/stats` | Statistiques d'activité du serveur |
| `/conseil` | 5 conseils IA pour améliorer le RP |
| `/capture` | Force une capture immédiate (admin) |

---

## 🌐 Dashboard Web

| Page | URL | Description |
|------|-----|-------------|
| Vue d'ensemble | `/` | Stats globales + graphiques |
| Salons | `/channels` | Liste des salons capturés |
| Messages | `/messages` | Fil de messages searchable |
| Membres | `/members` | Classement d'activité |
| Rapports IA | `/rapports` | Génération et historique |

---

## 🏗️ Structure

```
nationrp-bot/
├── bot/
│   ├── bot.py          # Bot Discord + slash commands
│   ├── database.py     # SQLite async
│   └── ai_client.py    # Interface Gemini / Groq
├── backend/
│   └── main.py         # API FastAPI
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Overview.jsx
│   │   │   ├── Channels.jsx
│   │   │   ├── Messages.jsx
│   │   │   ├── Members.jsx
│   │   │   └── Rapports.jsx
│   │   └── styles/global.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🚢 Déploiement production

**Option simple — même serveur :**

```bash
# Backend en arrière-plan
nohup uvicorn main:app --host 0.0.0.0 --port 8000 &

# Build frontend et le servir via FastAPI
cd frontend && npm run build
# FastAPI sert automatiquement le dossier dist/

# Bot en arrière-plan
nohup python bot/bot.py &
```

**Option Docker (recommandée) :**

Utilise un `docker-compose.yml` avec 3 services :
- `bot` (Python)
- `api` (FastAPI)  
- `frontend` (Nginx)
