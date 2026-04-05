"""
AI Module — Groq (Llama 3.3 70B)
14 400 req/jour | 500 000 tokens/jour GRATUIT
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
AI_PROVIDER    = os.getenv("AI_PROVIDER", "groq")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

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
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system",  "content": SYSTEM_PROMPT},
                {"role": "user",    "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens":  6000,
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
            return await self._call_groq(prompt)
        except Exception as e:
            log.error(f"AI call failed: {e}")
            return f"❌ Erreur IA : {e}"

    # ─── PROMPTS SPÉCIALISÉS ─────────────────

    async def generate_channel_rapport(self, channel_name: str, messages: list) -> str:
        if not messages:
            return "Aucun message à analyser pour ce salon."

        sample = messages[:4000]
        conversation = "\n".join(
            f"[{m['timestamp'][:10]}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:20000]

        # Détecte le type de salon pour adapter l'analyse
        canal_type = "général"
        if any(x in channel_name for x in ["diplomatie", "traité", "alliance", "onu", "otsc", "apu", "acse", "aei"]):
            canal_type = "diplomatique"
        elif any(x in channel_name for x in ["guerre", "action", "militaire", "occupation"]):
            canal_type = "militaire"
        elif any(x in channel_name for x in ["vente", "économie", "territoire", "commerce"]):
            canal_type = "économique"
        elif any(x in channel_name for x in ["tribunal", "séance", "jugement"]):
            canal_type = "judiciaire"
        elif any(x in channel_name for x in ["propagande", "rumeur", "worldvision", "citation"]):
            canal_type = "médiatique"
        elif any(x in channel_name for x in ["france", "allemagne", "usa", "urss", "chine", "japon",
                                               "arabie", "brésil", "inde", "italie", "suède", "danemark",
                                               "norvège", "pays-bas", "suisse", "nigéria", "australie",
                                               "pérou", "grèce", "portugal", "espagne", "belgique",
                                               "canada", "sénégal", "islande", "cote-divoire", "rpu",
                                               "goryeo", "jerusalem"]):
            canal_type = "national"

        prompt = f"""Tu es l'analyste officiel de PAX HISTORIA FR, un serveur Discord de NationRP moderne (155 membres).
Le monde RP est divisé en nations qui interagissent diplomatiquement, économiquement et militairement.
Les organisations internationales actives sont : ONU, OTSC, APU, ACSE, AEI.

Tu analyses le salon #{channel_name} (type : {canal_type}).

RÈGLES D'ANALYSE STRICTES :
- Identifie les nations et joueurs impliqués par leurs noms Discord
- Détecte les tensions, alliances, trahisons, conflits larvés
- Repère les actions RP significatives (déclarations de guerre, traités, ventes de territoire, jugements)
- Évalue la qualité du RP (cohérence, immersion, respect des règles)
- Signale tout abus, hors-RP, ou comportement problématique
- Sois précis et factuel, pas généraliste

MESSAGES À ANALYSER (derniers {len(sample)}) :
{conversation}

RAPPORT STRUCTURÉ OBLIGATOIRE :

🗂️ **RÉSUMÉ EXÉCUTIF**
[2-3 phrases sur ce qui s'est passé dans ce salon]

{'🤝 **ANALYSE DIPLOMATIQUE**' if canal_type == 'diplomatique' else ''}
{'[Traités signés, négociations en cours, positions des nations, tensions diplomatiques détectées]' if canal_type == 'diplomatique' else ''}

{'⚔️ **SITUATION MILITAIRE**' if canal_type == 'militaire' else ''}
{'[Actions de guerre, territoires disputés, forces en présence, résultats des conflits]' if canal_type == 'militaire' else ''}

{'💰 **ANALYSE ÉCONOMIQUE**' if canal_type == 'économique' else ''}
{'[Transactions réalisées, territoires vendus/achetés, valeurs échangées, nations impliquées]' if canal_type == 'économique' else ''}

{'⚖️ **COMPTE-RENDU JUDICIAIRE**' if canal_type == 'judiciaire' else ''}
{'[Affaires jugées, verdicts rendus, nations condamnées, respect de la procédure]' if canal_type == 'judiciaire' else ''}

{'📢 **ANALYSE MÉDIATIQUE**' if canal_type == 'médiatique' else ''}
{'[Propagandes diffusées, rumeurs en circulation, opinion publique RP, influence des médias]' if canal_type == 'médiatique' else ''}

{'🏴 **SITUATION NATIONALE**' if canal_type == 'national' else ''}
{'[État intérieur du pays, décisions gouvernementales, relations avec les voisins, niveau d activité du joueur]' if canal_type == 'national' else ''}

👥 **JOUEURS ACTIFS**
[Liste des joueurs impliqués avec leur rôle et niveau de participation]

⚠️ **ALERTES & SIGNALEMENTS**
[Violations du règlement RP, comportements hors-RP, conflits OOC, inactivité prolongée]

📊 **SCORE D'ACTIVITÉ RP**
[Note sur 10 avec justification : qualité de l'immersion, cohérence narrative, respect des règles]

💡 **RECOMMANDATIONS ADMIN**
[Actions concrètes à prendre sur ce salon]

Rapport du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC"""

        return await self.call(prompt)

    async def generate_server_rapport(self, stats: dict, recent_messages: list) -> str:
        sample = recent_messages[:4000]
        conversation = "\n".join(
            f"[#{m['channel']}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:15000]

        top_channels = "\n".join(
            f"  #{c['name']} : {c['count']} messages"
            for c in stats.get("top_channels", [])
        )

        prompt = f"""Tu es l'analyste géopolitique officiel de PAX HISTORIA FR.
Serveur NationRP moderne français — 155 membres — nations du monde entier.

CONTEXTE DU SERVEUR :
- Salons RP principaux : diplomatie, action-guerre, propagande, rumeur, worldvision, tribunal, vente-territoire, traité-de-paix
- Organisations internationales : ONU, OTSC (alliance militaire), APU, ACSE, AEI
- Pays jouables actifs : France, Allemagne, USA, URSS, Chine, Japon, Arabie Saoudite, Inde, Brésil, Italie, Suède, Danemark, Norvège, Pays-Bas, Suisse, Nigéria, Australie, Pérou, Grèce, Fédération Sainte de Jérusalem, RPU-Goryeo, Côte d'Ivoire
- Pays anciennement joués (inactifs) : Belgique, Canada, Égypte, Espagne, Portugal, Sénégal, Islande

STATISTIQUES ACTUELLES :
- Messages totaux capturés : {stats.get('total_messages', 0):,}
- Joueurs actifs : {stats.get('active_members', 0)}
- Salons indexés : {stats.get('channels', 0)}
- Salon le plus actif : #{stats.get('top_channel', 'N/A')}

ACTIVITÉ PAR SALON :
{top_channels}

APERÇU DES ÉCHANGES RÉCENTS :
{conversation}

RAPPORT GÉOPOLITIQUE GLOBAL OBLIGATOIRE :

🌍 **ÉTAT DU MONDE PAX HISTORIA**
[Situation géopolitique globale : qui est en guerre, qui négocie, qui domine]

🏆 **CLASSEMENT DES NATIONS ACTIVES**
[Rank les nations du plus actif au moins actif avec analyse de leur influence RP]

⚔️ **CONFLITS EN COURS**
[Guerres actives, tensions militaires, occupations, résistances]

🤝 **ALLIANCES & BLOCS**
[État des organisations : ONU, OTSC, APU, ACSE, AEI — qui les contrôle, qui est en désaccord]

💰 **ÉCONOMIE & TERRITOIRE**
[Transactions récentes, équilibre des puissances économiques, territoires disputés]

📺 **OPINION PUBLIQUE RP**
[Ce qui circule dans propagande/rumeur/worldvision — narrative dominante]

⚠️ **NATIONS EN DANGER**
[Pays inactifs risquant d'être abandonnés, joueurs absents, nations isolées]

🚨 **ALERTES ADMIN PRIORITAIRES**
[Problèmes urgents : règles violées, conflits OOC, déséquilibres majeurs, abus de pouvoir RP]

🎯 **PLAN D'ACTION — 7 PRIORITÉS CETTE SEMAINE**
[Actions concrètes et numérotées que les admins doivent faire cette semaine pour améliorer le serveur]

📈 **SANTÉ GLOBALE DU SERVEUR**
[Score sur 10 avec tendance : en progression, stable ou en déclin — et pourquoi]

Rapport géopolitique du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC
Généré par le système NationStats Analytics"""

        return await self.call(prompt)

    async def generate_conseils(self, stats: dict, messages: list) -> str:
        sample = messages[:4000]

        # Analyse les salons les moins actifs
        top_channels = stats.get("top_channels", [])
        salons_actifs = [c["name"] for c in top_channels[:5]]
        salons_inactifs = [c["name"] for c in top_channels[-5:]] if len(top_channels) > 5 else []

        activite = "\n".join(f"  #{c['name']} : {c['count']} msgs" for c in top_channels)

        # Extrait un aperçu des derniers échanges
        apercu = "\n".join(
            f"[#{m['channel']}] {m['author']}: {m['content'][:100]}"
            for m in sample[:200] if m["content"].strip()
        )

        prompt = f"""Tu es le conseiller stratégique de PAX HISTORIA FR, serveur NationRP moderne français.

CONTEXTE :
- 155 membres, nations du monde entier
- Organisations : ONU, OTSC, APU, ACSE, AEI
- Salons clés : diplomatie, action-guerre, propagande, rumeur, worldvision, tribunal, vente-territoire, traité-de-paix, classements, sommet-de-la-paix, pays-libres, les-alliances, résumé-rp

DONNÉES D'ACTIVITÉ :
{activite}

Membres actifs : {stats.get('active_members', 0)}
Total messages : {stats.get('total_messages', 0):,}
Salons les + actifs : {', '.join(f'#{s}' for s in salons_actifs)}
Salons peu actifs : {', '.join(f'#{s}' for s in salons_inactifs)}

APERÇU DES ÉCHANGES :
{apercu}

Génère 7 conseils CONCRETS ET SPÉCIFIQUES à Pax Historia FR pour améliorer le serveur.
Chaque conseil doit suivre ce format exact :

**[NUMÉRO] — [TITRE DU CONSEIL]**
🎯 Objectif : [Ce que ça va changer]
📋 Comment faire : [Étapes précises et réalistes]
⏱️ Délai suggéré : [Immédiat / Cette semaine / Ce mois]
💥 Impact attendu : [Faible / Moyen / Élevé]

Les conseils doivent couvrir :
1. Un événement RP spécial à organiser (basé sur l'actualité du serveur)
2. Une nation inactive à relancer ou redistribuer
3. Une amélioration des organisations internationales (ONU/OTSC/etc.)
4. Un équilibrage diplomatique ou militaire nécessaire
5. Une idée pour attirer de nouveaux joueurs
6. Une amélioration du système de classement ou récompenses
7. Un conseil sur la modération ou les règles RP

Sois précis, actionnable, et adapté à ce serveur spécifiquement. Pas de conseils génériques."""

        return await self.call(prompt)

    async def generate_diplomatie_rapport(self, messages: list) -> str:
        if not messages:
            return "Aucun message diplomatique à analyser."
        sample = messages[:4000]
        conversation = "\n".join(
            f"[#{m['channel']}] [{m['timestamp'][:10]}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:20000]

        prompt = f"""Tu es l'analyste diplomatique officiel de PAX HISTORIA FR.

MESSAGES DIPLOMATIQUES RÉCENTS :
{conversation}

RAPPORT DIPLOMATIQUE COMPLET :

🌍 **ÉTAT DES RELATIONS INTERNATIONALES**
[Cartographie complète des alliances et tensions entre nations]

🤝 **ORGANISATIONS ACTIVES**
- ONU : [membres actifs, résolutions récentes, conflits internes]
- OTSC : [membres, opérations militaires, cohésion]
- APU : [activité, projets, tensions]
- ACSE : [état, membres, décisions]
- AEI : [activité récente]

📜 **TRAITÉS & ACCORDS RÉCENTS**
[Liste des traités signés, en négociation, ou rompus]

⚡ **TENSIONS DIPLOMATIQUES**
[Conflits diplomatiques, ruptures de relations, ultimatums]

🏆 **NATIONS LES PLUS INFLUENTES**
[Classement par influence diplomatique avec justification]

🎯 **PRÉVISIONS**
[Quelles alliances vont se former ou se briser prochainement ?]

Rapport du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC"""
        return await self.call(prompt)

    async def generate_guerre_rapport(self, messages: list) -> str:
        if not messages:
            return "Aucun message militaire à analyser."
        sample = messages[:4000]
        conversation = "\n".join(
            f"[#{m['channel']}] [{m['timestamp'][:10]}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:20000]

        prompt = f"""Tu es l'analyste militaire officiel de PAX HISTORIA FR.

MESSAGES MILITAIRES & PROPAGANDE RÉCENTS :
{conversation}

RAPPORT MILITAIRE COMPLET :

⚔️ **CONFLITS ACTIFS**
[Liste de toutes les guerres en cours avec belligérants, causes, état actuel]

🗺️ **TERRITOIRES DISPUTÉS**
[Zones de combat, occupations, résistances]

💣 **ACTIONS MILITAIRES RÉCENTES**
[Attaques, défenses, batailles, résultats]

📢 **PROPAGANDE & DÉSINFORMATION**
[Narratives diffusées par chaque camp, rumeurs, fake news RP]

⚖️ **BILAN DES FORCES**
[Qui domine militairement et pourquoi]

🔮 **PRÉVISIONS MILITAIRES**
[Quels conflits vont éclater ou se terminer prochainement ?]

🚨 **ALERTES**
[Escalades dangereuses, violations de cessez-le-feu, provocations]

Rapport du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC"""
        return await self.call(prompt)

    async def generate_economie_rapport(self, messages: list) -> str:
        if not messages:
            return "Aucun message économique à analyser."
        sample = messages[:4000]
        conversation = "\n".join(
            f"[#{m['channel']}] [{m['timestamp'][:10]}] {m['author']}: {m['content']}"
            for m in sample if m["content"].strip()
        )[:20000]

        prompt = f"""Tu es l'analyste économique officiel de PAX HISTORIA FR.

MESSAGES ÉCONOMIQUES RÉCENTS :
{conversation}

RAPPORT ÉCONOMIQUE COMPLET :

💰 **TRANSACTIONS RÉCENTES**
[Ventes de territoires, achats, échanges commerciaux avec montants]

🗺️ **CARTE DES TERRITOIRES**
[Qui possède quoi, qui a vendu quoi, acquisitions récentes]

📈 **NATIONS LES PLUS RICHES**
[Classement économique avec analyse des ressources et territoires]

🤝 **ACCORDS COMMERCIAUX**
[Partenariats économiques, blocus, embargos]

⚠️ **DÉSÉQUILIBRES ÉCONOMIQUES**
[Nations trop puissantes, trop faibles, risques d'instabilité]

💡 **RECOMMANDATIONS**
[Comment rééquilibrer l'économie du serveur]

Rapport du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC"""
        return await self.call(prompt)
        
