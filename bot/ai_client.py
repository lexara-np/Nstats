"""
AI Module — Groq Llama 3.3 70B — Dev Tier
Prompts optimisés pour PAX HISTORIA FR
Contexte maximal exploité sur chaque requête
"""

import os
import aiohttp
import logging
from datetime import datetime

log = logging.getLogger("NationRP.AI")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"

# ─── CONTEXTE SERVEUR PERMANENT ──────────────────────────────────────────────
# Injecté dans TOUS les prompts pour que l'IA comprenne l'univers
WORLD_CONTEXT = """
═══════════════════════════════════════════════════════
  PAX HISTORIA FR — CONTEXTE PERMANENT DU MONDE RP
═══════════════════════════════════════════════════════

SERVEUR : NationRP moderne français | ~155 membres | Année RP : 2036

NATIONS ACTIVES (avec leurs joueurs Discord entre crochets) :
Europe : France, Allemagne, Italie, Suède, Danemark, Norvège, Pays-Bas, Suisse, Grèce, Portugal, Espagne, Belgique, Irlande, Islande
Amériques : USA, Brésil, Canada, Pérou
Eurasie : URSS
Asie : Chine, Japon, Inde, Mongolie, RPU-Goryeo
Océanie : Australie
Moyen-Orient : Arabie Saoudite, Fédération Sainte de Jérusalem
Afrique : Nigéria, Côte d'Ivoire, Sénégal, Égypte

ORGANISATIONS INTERNATIONALES :
- ONU : Organisation des Nations Unies — diplomatie mondiale, résolutions, maintien de la paix
- OTSC : Organisation du Traité de Sécurité Collective — alliance militaire défensive
- APU : Alliance du Pacifique Uni
- ACSE : Alliance Culturelle et Sociale Européenne
- AEI : Alliance Économique Internationale
- PGAI : Pacte de Gouvernance et d'Aide Internationale

SALONS RP CLÉS :
- #diplomatie : négociations, traités, échanges diplomatiques officiels
- #action-guerre : déclarations de guerre, batailles, rapports militaires
- #propagande : messages officiels des gouvernements au monde
- #rumeur : informations non officielles, espionnage, fuites
- #worldvision : émissions TV mondiales RP, discours publics
- #tribunal : procès internationaux, jugements
- #séance-tribunal : audiences officielles
- #traité-de-paix : négociations de paix, armistices
- #vente-territoire : transactions territoriales
- #ventes : commerce international
- #résumé-rp : résumés officiels des événements par les admins
- #annonce-rp : annonces officielles du serveur
- #classement : classements officiels (PIB, militaire, technologie, etc.)
- #sommet-de-la-paix : sommets diplomatiques majeurs
- #les-alliances : état des alliances entre nations
- #pays-libres : nations sans joueur disponibles
- Salons pays (ex: #france, #allemagne) : actions internes de chaque nation

RÈGLES RP IMPORTANTES :
- Tout conflit militaire doit être déclaré officiellement dans #déclaration-guerre
- Les traités sont officialisés dans #traité-de-paix ou #diplomatie
- Les ventes de territoire nécessitent une transaction dans #vente-territoire
- Les jugements sont rendus par le tribunal international
- Le staff génère des classements officiels dans #classement

═══════════════════════════════════════════════════════
"""

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def compress_messages(messages: list, max_chars: int = 20000, fmt: str = "full") -> str:
    """
    Compresse une liste de messages en texte exploitable.
    fmt="full"    → [date] auteur: contenu
    fmt="channel" → [#salon][date] auteur: contenu
    fmt="compact" → auteur: contenu (sans date)
    """
    lines = []
    for m in messages:
        content = (m.get("content") or "").strip()
        if not content or content.startswith("!") or content.startswith("http"):
            continue
        if len(content) < 5:
            continue

        ts      = m.get("timestamp", "")[:10]
        author  = m.get("author", "?")
        channel = m.get("channel", "")

        if fmt == "channel":
            lines.append(f"[#{channel}][{ts}] {author}: {content}")
        elif fmt == "compact":
            lines.append(f"{author}: {content}")
        else:
            lines.append(f"[{ts}] {author}: {content}")

    text = "\n".join(lines)
    return text[:max_chars]


def stats_summary(stats: dict) -> str:
    top_ch = "\n".join(
        f"  #{c['name']} : {c['count']:,} messages"
        for c in stats.get("top_channels", [])
    )
    return f"""STATISTIQUES DU SERVEUR :
- Messages totaux capturés : {stats.get('total_messages', 0):,}
- Membres actifs : {stats.get('active_members', 0)}
- Salons indexés : {stats.get('channels', 0)}
- Salon le plus actif : #{stats.get('top_channel', 'N/A')}
- Joueur le plus actif : {stats.get('top_member', 'N/A')}

TOP SALONS PAR ACTIVITÉ :
{top_ch}"""


# ─── CLIENT ──────────────────────────────────────────────────────────────────

class AIClient:

    async def _groq(self, system: str, prompt: str, max_tokens: int = 6000) -> str:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type":  "application/json",
        }
        payload = {
            "model":       GROQ_MODEL,
            "temperature": 0.65,
            "max_tokens":  max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(GROQ_URL, headers=headers, json=payload) as r:
                if r.status != 200:
                    err = await r.text()
                    log.error(f"Groq error {r.status}: {err}")
                    return f"❌ Erreur Groq {r.status}. Réessaie dans quelques secondes."
                data = await r.json()
                return data["choices"][0]["message"]["content"]

    async def call(self, prompt: str, max_tokens: int = 6000) -> str:
        try:
            system = f"""Tu es l'analyste officiel de PAX HISTORIA FR.
{WORLD_CONTEXT}
RÈGLES DE RÉPONSE :
- Réponds TOUJOURS en français
- Sois précis, factuel, basé sur les données fournies
- Cite les joueurs et nations par leur nom exact
- Utilise des emojis pour structurer les sections
- Ne généralise jamais — analyse ce qui est réellement écrit dans les messages
- Si une info est absente des messages, dis-le explicitement"""
            return await self._groq(system, prompt, max_tokens)
        except Exception as e:
            log.error(f"AI call failed: {e}")
            return f"❌ Erreur IA : {e}"


    # ═══════════════════════════════════════════════════════════════════════
    #  RAPPORT SALON
    # ═══════════════════════════════════════════════════════════════════════

    async def generate_channel_rapport(self, channel_name: str, messages: list) -> str:
        if not messages:
            return f"❌ Aucun message capturé pour #{channel_name}."

        # Détecte le type de salon
        name = channel_name.lower()
        if any(x in name for x in ["diplomatie","traité","onu","otsc","apu","acse","aei","alliance","sommet"]):
            canal_type = "diplomatique"
        elif any(x in name for x in ["guerre","action","militaire","déclaration","occupation"]):
            canal_type = "militaire"
        elif any(x in name for x in ["vente","territoire","commerce","économie","réserve","pib"]):
            canal_type = "économique"
        elif any(x in name for x in ["tribunal","séance","jugement","procès"]):
            canal_type = "judiciaire"
        elif any(x in name for x in ["propagande","rumeur","worldvision","citation","média"]):
            canal_type = "médiatique"
        elif any(x in name for x in ["résumé","annonce","classement","histoire"]):
            canal_type = "officiel"
        else:
            canal_type = "national"

        conv = compress_messages(messages, max_chars=22000, fmt="full")
        nb   = len([m for m in messages if (m.get("content") or "").strip()])

        # Sections spécifiques selon le type
        section_specifique = {
            "diplomatique": """
🤝 **ANALYSE DIPLOMATIQUE DÉTAILLÉE**
- Traités signés ou en négociation (cite les textes exacts si présents)
- Alliances formées, renforcées ou rompues
- Positions officielles de chaque nation
- Tensions et désaccords détectés
- Ultimatums ou menaces diplomatiques
- Qui cherche à dominer les organisations internationales ?""",

            "militaire": """
⚔️ **SITUATION MILITAIRE DÉTAILLÉE**
- Conflits déclarés et en cours (belligérants, causes, phase actuelle)
- Actions militaires concrètes (attaques, défenses, avancées)
- Territoires occupés, disputés ou perdus
- Forces en présence de chaque camp
- Stratégies visibles dans les messages
- Qui gagne et qui perd actuellement ?""",

            "économique": """
💰 **ANALYSE ÉCONOMIQUE DÉTAILLÉE**
- Transactions réalisées (vendeur, acheteur, territoire/bien, montant si mentionné)
- Accords commerciaux signés
- Blocus ou embargos actifs
- Nations qui s'enrichissent vs s'appauvrissent
- Déséquilibres économiques détectés""",

            "judiciaire": """
⚖️ **COMPTE-RENDU JUDICIAIRE COMPLET**
- Affaires en cours (parties, accusations, preuves présentées)
- Verdicts rendus avec justification
- Nations ou joueurs condamnés/acquittés
- Respect de la procédure RP
- Précédents juridiques établis""",

            "médiatique": """
📢 **ANALYSE MÉDIATIQUE & PROPAGANDE**
- Messages officiels de chaque gouvernement (résumé + évaluation)
- Rumeurs en circulation (vraies ou fausses selon contexte)
- Narratives dominantes par camp
- Tentatives de désinformation détectées
- Impact sur l'opinion publique RP
- Qui contrôle le récit médiatique ?""",

            "national": """
🏴 **SITUATION NATIONALE DÉTAILLÉE**
- Décisions gouvernementales prises
- Politique intérieure (réformes, crises, stabilité)
- Relations avec les nations voisines et alliées
- Activité et implication du joueur
- Projets nationaux annoncés
- Niveau de puissance actuel de cette nation""",

            "officiel": """
📋 **ANALYSE DU CONTENU OFFICIEL**
- Informations et annonces majeures
- Impact sur l'équilibre du serveur
- Réactions des joueurs aux annonces
- Cohérence avec l'état actuel du RP""",
        }.get(canal_type, "")

        prompt = f"""ANALYSE DU SALON #{channel_name} — Type : {canal_type}
{WORLD_CONTEXT}

MESSAGES ANALYSÉS ({nb} messages, du plus récent au plus ancien) :
{conv}

═══════════════════════════════════════
GÉNÈRE LE RAPPORT COMPLET CI-DESSOUS :
═══════════════════════════════════════

🗂️ **RÉSUMÉ EXÉCUTIF**
En 3-4 phrases : qu'est-ce qui s'est passé dans ce salon ? Quels sont les faits marquants ?

{section_specifique}

👥 **JOUEURS IMPLIQUÉS**
Pour chaque joueur actif dans ce salon :
- Nom Discord et nation représentée
- Rôle joué (leader, négociateur, militaire, juge, etc.)
- Niveau de participation (très actif / actif / peu actif)
- Actions ou décisions notables

⚠️ **ALERTES & ANOMALIES**
- Comportements hors-RP ou OOC (Out Of Character)
- Violations des règles RP
- Incohérences narratives
- Inactivité prolongée
- Abus de pouvoir ou avantages injustifiés

📊 **SCORE D'ACTIVITÉ RP : [X]/10**
Justification détaillée sur :
- Qualité de l'immersion (respect du personnage, cohérence)
- Richesse narrative (profondeur des échanges, créativité)
- Respect des règles RP
- Impact sur l'histoire globale du serveur

💡 **RECOMMANDATIONS POUR LES ADMINS**
3 à 5 actions concrètes et réalistes à prendre concernant ce salon.

📅 Rapport généré le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC"""

        return await self.call(prompt)


    # ═══════════════════════════════════════════════════════════════════════
    #  RAPPORT SERVEUR GLOBAL
    # ═══════════════════════════════════════════════════════════════════════

    async def generate_server_rapport(self, stats: dict, recent_messages: list) -> str:

        # Groupe les messages par catégorie de salon pour couvrir tout le serveur
        rp_channels = {
            "diplomatie":   [],
            "guerre":       [],
            "médias":       [],
            "économie":     [],
            "judiciaire":   [],
            "nations":      [],
            "officiel":     [],
        }

        for m in recent_messages:
            ch = (m.get("channel") or "").lower()
            content = (m.get("content") or "").strip()
            if not content or len(content) < 10:
                continue
            if any(x in ch for x in ["diplomatie","traité","onu","otsc","alliance","sommet","apu","acse","aei"]):
                rp_channels["diplomatie"].append(m)
            elif any(x in ch for x in ["guerre","action","déclaration","militaire"]):
                rp_channels["guerre"].append(m)
            elif any(x in ch for x in ["propagande","rumeur","worldvision","citation"]):
                rp_channels["médias"].append(m)
            elif any(x in ch for x in ["vente","territoire","économie","réserve","pib"]):
                rp_channels["économie"].append(m)
            elif any(x in ch for x in ["tribunal","séance","jugement"]):
                rp_channels["judiciaire"].append(m)
            elif any(x in ch for x in ["résumé","annonce","classement"]):
                rp_channels["officiel"].append(m)
            else:
                rp_channels["nations"].append(m)

        # Compresse chaque section avec un quota de chars
        def section(msgs, max_c=3000):
            return compress_messages(msgs[:500], max_chars=max_c, fmt="channel") or "(Aucun message récent)"

        prompt = f"""RAPPORT GÉOPOLITIQUE GLOBAL — PAX HISTORIA FR
{WORLD_CONTEXT}
{stats_summary(stats)}

════════════════════════════════════
DONNÉES PAR CATÉGORIE DE SALONS
════════════════════════════════════

📜 DIPLOMATIE & ORGANISATIONS ({len(rp_channels['diplomatie'])} messages) :
{section(rp_channels['diplomatie'], 3500)}

⚔️ MILITAIRE & GUERRES ({len(rp_channels['guerre'])} messages) :
{section(rp_channels['guerre'], 3500)}

📢 MÉDIAS & PROPAGANDE ({len(rp_channels['médias'])} messages) :
{section(rp_channels['médias'], 2000)}

💰 ÉCONOMIE & TERRITOIRE ({len(rp_channels['économie'])} messages) :
{section(rp_channels['économie'], 2000)}

⚖️ JUDICIAIRE ({len(rp_channels['judiciaire'])} messages) :
{section(rp_channels['judiciaire'], 1500)}

🏴 NATIONS (salons pays) ({len(rp_channels['nations'])} messages) :
{section(rp_channels['nations'], 2500)}

📋 OFFICIEL & CLASSEMENTS ({len(rp_channels['officiel'])} messages) :
{section(rp_channels['officiel'], 1500)}

════════════════════════════════════
GÉNÈRE LE RAPPORT GÉOPOLITIQUE COMPLET :
════════════════════════════════════

🌍 **ÉTAT DU MONDE PAX HISTORIA — {datetime.utcnow().strftime('%d/%m/%Y')}**
Situation géopolitique globale en 4-5 phrases. Qui domine ? Quelles sont les tensions majeures ?

🏆 **CLASSEMENT DES NATIONS PAR INFLUENCE**
Rank les 10+ nations les plus actives et influentes. Pour chacune : position, points forts, points faibles, tendance (↗️ montante / → stable / ↘️ déclinante).

⚔️ **CONFLITS & TENSIONS ACTIVES**
Liste tous les conflits en cours ou tensions militaires. Pour chacun : belligérants, cause, phase actuelle, pronostic.

🤝 **ÉTAT DES ORGANISATIONS INTERNATIONALES**
ONU, OTSC, APU, ACSE, AEI, PGAI : qui les contrôle, qui est en désaccord, quelle est leur influence réelle actuellement ?

💰 **BILAN ÉCONOMIQUE & TERRITORIAL**
Transactions récentes, équilibre des richesses, nations en expansion/déclin économique.

📺 **OPINION PUBLIQUE & MÉDIAS RP**
Narratives dominantes, propagandes actives, ce que "le monde sait" officiellement vs. les rumeurs.

📈 **ACTIVITÉ & ENGAGEMENT DES JOUEURS**
Qui joue vraiment ? Qui est inactif ? Quels salons sont désertés ? Risques d'abandon de nations ?

🚨 **ALERTES PRIORITAIRES POUR LES ADMINS**
Problèmes urgents à régler (abus, incohérences, déséquilibres, conflits OOC, règles violées).

🎯 **PLAN D'ACTION — 7 PRIORITÉS DE LA SEMAINE**
Actions numérotées, concrètes et réalistes que les admins doivent faire cette semaine.

📊 **SANTÉ GLOBALE DU SERVEUR : [X]/10**
Score avec tendance et justification détaillée.

Rapport du {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')} UTC — NationStats Analytics v2"""

        return await self.call(prompt)


    # ═══════════════════════════════════════════════════════════════════════
    #  CONSEILS STRATÉGIQUES
    # ═══════════════════════════════════════════════════════════════════════

    async def generate_conseils(self, stats: dict, messages: list) -> str:

        top_channels = stats.get("top_channels", [])
        salons_actifs   = [c["name"] for c in top_channels[:8]]
        salons_inactifs = [c["name"] for c in top_channels if c["count"] < 50][:8]

        apercu = compress_messages(
            [m for m in messages if (m.get("content") or "").strip()],
            max_chars=12000, fmt="channel"
        )

        prompt = f"""MISSION : Conseiller stratégique de PAX HISTORIA FR
{WORLD_CONTEXT}
{stats_summary(stats)}

SALONS LES PLUS ACTIFS : {', '.join(f'#{s}' for s in salons_actifs)}
SALONS PEU ACTIFS (<50 msgs) : {', '.join(f'#{s}' for s in salons_inactifs)}

APERÇU DES ÉCHANGES RÉCENTS :
{apercu}

════════════════════════════════════
GÉNÈRE 7 CONSEILS STRATÉGIQUES PRÉCIS
════════════════════════════════════

Chaque conseil DOIT utiliser ce format exact :

**[N°] — [TITRE ACCROCHEUR]**
🎯 **Problème identifié** : [Ce qui ne va pas ou ce qui manque, basé sur les vraies données]
📋 **Action concrète** : [Ce qu'il faut faire, étape par étape, en moins de 5 actions]
👥 **Qui fait quoi** : [Admin / Staff / Joueurs — qui doit agir]
⏱️ **Délai** : [Immédiat (aujourd'hui) / Cette semaine / Ce mois]
💥 **Impact attendu** : [Faible / Moyen / Élevé] — [Pourquoi]

Les 7 conseils DOIVENT couvrir ces axes (dans cet ordre) :
1. 🎭 Un événement RP immédiat à organiser (basé sur les tensions/conflits actuels détectés)
2. 💤 Une nation inactive spécifique à relancer (nomme-la et explique comment)
3. 🌐 Une organisation internationale (ONU/OTSC/etc.) à dynamiser ou restructurer
4. ⚖️ Un déséquilibre de puissance à corriger (militaire, économique ou diplomatique)
5. 🎮 Une mécanique RP à introduire pour enrichir le gameplay
6. 📣 Une action de communication pour attirer de nouveaux joueurs
7. 🔧 Une amélioration de modération ou de règles RP urgente

IMPORTANT : Sois hyper-spécifique à PAX HISTORIA FR. Cite les nations, joueurs et salons par leur nom exact. Aucun conseil générique."""

        return await self.call(prompt)


    # ═══════════════════════════════════════════════════════════════════════
    #  RAPPORT DIPLOMATIE
    # ═══════════════════════════════════════════════════════════════════════

    async def generate_diplomatie_rapport(self, messages: list) -> str:
        if not messages:
            return "❌ Aucun message diplomatique à analyser."

        conv = compress_messages(messages, max_chars=22000, fmt="channel")

        prompt = f"""RAPPORT DIPLOMATIQUE — PAX HISTORIA FR
{WORLD_CONTEXT}

MESSAGES DES SALONS DIPLOMATIQUES ({len(messages)} messages analysés) :
{conv}

════════════════════════════════════
RAPPORT DIPLOMATIQUE COMPLET :
════════════════════════════════════

🌍 **CARTOGRAPHIE DES RELATIONS INTERNATIONALES**
Pour chaque paire de nations qui interagit : état de la relation (alliée / neutre / tendue / en guerre).
Format : 🟢 Nation A ↔ Nation B : [description de la relation]

🏛️ **ÉTAT DES ORGANISATIONS INTERNATIONALES**
Pour chaque organisation active :
- **ONU** : [membres actifs, résolutions récentes, conflits internes, qui la domine]
- **OTSC** : [membres, opérations en cours, cohésion interne]
- **APU** : [activité récente, projets, frictions]
- **ACSE** : [état actuel, décisions majeures]
- **AEI** : [activité économique, accords]
- **PGAI** : [rôle actuel, efficacité]

📜 **TRAITÉS & ACCORDS**
- Traités signés récemment (parties, contenu, date)
- Traités en négociation (parties, points de blocage)
- Traités rompus ou menacés (causes, conséquences)

⚡ **TENSIONS & CRISES DIPLOMATIQUES**
- Conflits diplomatiques actifs (qui s'oppose à qui et pourquoi)
- Ultimatums lancés et leurs délais
-
