import { useState, useEffect } from "react"

// ─── PARSER DE CLASSEMENTS ────────────────────────────────────────────────────
// Parse le texte brut des messages Discord en données structurées
const parseClassements = (messages) => {
  const classements = {}

  messages.forEach(msg => {
    const content = msg.content || ""
    const lines   = content.split("\n")
    let currentTitle = null
    let currentItems = []
    let annee = null

    // Détecte l'année
    const anMatch = content.match(/An\s*[-–]\s*(\d{4})/i)
    if (anMatch) annee = anMatch[1]

    lines.forEach(line => {
      const trimmed = line.trim()

      // Nouvelle section (titre avec #)
      const titleMatch = trimmed.match(/^#+\s+(.+)$/)
      if (titleMatch) {
        // Sauvegarde l'ancienne section
        if (currentTitle && currentItems.length > 0) {
          const key = currentTitle.toLowerCase()
          if (!classements[key] || classements[key].timestamp < msg.timestamp) {
            classements[key] = {
              title:     currentTitle,
              items:     currentItems,
              annee,
              timestamp: msg.timestamp,
              author:    msg.author,
            }
          }
        }
        currentTitle = titleMatch[1].trim()
        currentItems = []
        return
      }

      // Ligne de classement : "1. Pays - valeur" ou "1. Pays – valeur"
      const itemMatch = trimmed.match(/^(\d+)[.)]\s+(.+?)\s*[-–]\s*(.+)$/)
      if (itemMatch && currentTitle) {
        const rawVal = itemMatch[3].trim().replace(/'/g, "")
        const numVal = parseFloat(rawVal.replace(/[^0-9.]/g, "")) || 0
        currentItems.push({
          rank:    parseInt(itemMatch[1]),
          country: itemMatch[2].trim(),
          value:   itemMatch[3].trim(),
          numVal,
        })
      }

      // Ligne "Monde - valeur"
      const mondeMatch = trimmed.match(/^Monde\s*[-–]\s*(.+)$/)
      if (mondeMatch && currentTitle) {
        // On l'ignore dans les items mais on peut l'afficher plus tard
      }
    })

    // Sauvegarde la dernière section
    if (currentTitle && currentItems.length > 0) {
      const key = currentTitle.toLowerCase()
      if (!classements[key] || classements[key].timestamp < msg.timestamp) {
        classements[key] = {
          title:     currentTitle,
          items:     currentItems,
          annee,
          timestamp: msg.timestamp,
          author:    msg.author,
        }
      }
    }
  })

  return Object.values(classements)
}

// ─── COULEURS PAR TYPE ────────────────────────────────────────────────────────
const getConfig = (title) => {
  const t = title.toLowerCase()
  if (t.includes("pib"))         return { color:"#34d399", icon:"💰", unit:"Md USD",  bar:true }
  if (t.includes("population"))  return { color:"#60a5fa", icon:"👥", unit:"Millions", bar:true }
  if (t.includes("réserve"))     return { color:"#f59e0b", icon:"🏦", unit:"Md USD",  bar:true }
  if (t.includes("technolog"))   return { color:"#a78bfa", icon:"🔬", unit:"/100",    bar:true }
  if (t.includes("stabili"))     return { color:"#34d399", icon:"🛡️", unit:"%",       bar:true }
  if (t.includes("offensif"))    return { color:"#ef4444", icon:"⚔️", unit:"/100",   bar:true }
  if (t.includes("défensif") || t.includes("defensif"))
                                  return { color:"#3b82f6", icon:"🛡️", unit:"/100",  bar:true }
  return { color:"var(--or-400)", icon:"📊", unit:"",       bar:true }
}

const FLAGS = {
  "france":"🇫🇷","allemagne":"🇩🇪","usa":"🇺🇸","chine":"🇨🇳","urss":"🇷🇺",
  "japon":"🇯🇵","suisse":"🇨🇭","pays-bas":"🇳🇱","brésil":"🇧🇷","inde":"🇮🇳",
  "italie":"🇮🇹","suède":"🇸🇪","danemark":"🇩🇰","norvège":"🇳🇴","arabie saoudite":"🇸🇦",
  "arabie":"🇸🇦","goryeo":"🇰🇵","goryo":"🇰🇵","jérusalem":"🇵🇸","jerusalem":"🇵🇸",
  "grèce":"🇬🇷","pérou":"🇵🇪","nigeria":"🇳🇬","nigreria":"🇳🇬","côte d'ivoire":"🇨🇮",
  "belgique":"🇧🇪","canada":"🇨🇦","espagne":"🇪🇸","portugal":"🇵🇹","australie":"🇦🇺",
}

const getFlag = (name) => {
  const n = name.toLowerCase()
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (n.includes(key)) return flag
  }
  return "🏳️"
}

const medal = (rank) => {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return null
}

// ─── COMPOSANT TABLEAU ────────────────────────────────────────────────────────
function ClassementCard({ data }) {
  const [expanded, setExpanded] = useState(false)
  const cfg     = getConfig(data.title)
  const items   = [...data.items].sort((a,b) => a.rank - b.rank)
  const maxVal  = Math.max(...items.map(i => i.numVal), 1)
  const shown   = expanded ? items : items.slice(0, 10)

  const fmt = ts => {
    try { return new Date(ts).toLocaleDateString("fr-FR") }
    catch { return "" }
  }

  return (
    <div style={{
      background:"var(--bg-raised)",
      border:`1px solid ${cfg.color}25`,
      borderRadius:"var(--radius-lg)",
      overflow:"hidden",
      transition:"box-shadow 0.2s",
    }}>
      {/* Header */}
      <div style={{
        padding:"16px 20px",
        borderBottom:`1px solid ${cfg.color}20`,
        background:`${cfg.color}08`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{
            fontFamily:"var(--font-display)", fontSize:12,
            fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
            color:cfg.color, marginBottom:4,
          }}>
            {cfg.icon} {data.title}
          </div>
          <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
            {data.annee && `An ${data.annee} • `}{items.length} nations • MAJ {fmt(data.timestamp)}
          </div>
        </div>
        <div style={{
          fontFamily:"var(--font-display)", fontSize:10,
          color:"var(--text-muted)", letterSpacing:"0.08em",
        }}>
          {cfg.unit}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding:"8px 0" }}>
        {shown.map((item, i) => {
          const pct = (item.numVal / maxVal) * 100
          const med = medal(item.rank)
          return (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"8px 20px",
              background: item.rank <= 3 ? `${cfg.color}06` : "transparent",
              borderLeft: item.rank <= 3 ? `2px solid ${cfg.color}` : "2px solid transparent",
              transition:"background 0.15s",
            }}>
              {/* Rang */}
              <div style={{
                width:28, textAlign:"center", flexShrink:0,
                fontFamily:"var(--font-display)", fontSize:11,
                color: item.rank <= 3 ? cfg.color : "var(--text-muted)",
                fontWeight:700,
              }}>
                {med || `#${item.rank}`}
              </div>

              {/* Drapeau + nom */}
              <div style={{ display:"flex", alignItems:"center", gap:6, width:150, flexShrink:0 }}>
                <span style={{ fontSize:16 }}>{getFlag(item.country)}</span>
                <span style={{
                  fontFamily:"var(--font-display)", fontSize:11,
                  letterSpacing:"0.05em", textTransform:"uppercase",
                  color: item.rank <= 3 ? "var(--or-200)" : "var(--text-secondary)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {item.country}
                </span>
              </div>

              {/* Barre */}
              <div style={{ flex:1, height:4, background:"var(--bg-elevated)", borderRadius:2, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background:`linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
                  borderRadius:2,
                  transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                  boxShadow:`0 0 6px ${cfg.color}50`,
                }} />
              </div>

              {/* Valeur */}
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:12,
                color:cfg.color, fontWeight:600,
                minWidth:80, textAlign:"right", flexShrink:0,
              }}>
                {item.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Voir plus */}
      {items.length > 10 && (
        <div style={{ padding:"8px 20px 14px", textAlign:"center" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background:"transparent", border:`1px solid ${cfg.color}30`,
              borderRadius:20, padding:"6px 16px",
              color:cfg.color, fontSize:10,
              fontFamily:"var(--font-display)", letterSpacing:"0.1em",
              cursor:"pointer", transition:"all 0.2s",
            }}
          >
            {expanded ? "▲ Réduire" : `▼ Voir les ${items.length - 10} suivants`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function Classements() {
  const [classements, setClassements] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState("Tous")
  const [search, setSearch]           = useState("")
  const [annee, setAnnee]             = useState("Tous")

  useEffect(() => {
    fetch("/api/classements")
      .then(r => r.json())
      .then(data => {
        const parsed = parseClassements(data)
        setClassements(parsed)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const CATEGORIES = ["Tous", "💰 Économie", "⚔️ Militaire", "📊 Social"]
  const getCat = (title) => {
    const t = title.toLowerCase()
    if (t.includes("pib") || t.includes("réserve") || t.includes("population")) return "💰 Économie"
    if (t.includes("offensif") || t.includes("défensif") || t.includes("defensif")) return "⚔️ Militaire"
    return "📊 Social"
  }

  const annees = ["Tous", ...new Set(classements.map(c => c.annee).filter(Boolean))]

  const filtered = classements.filter(c => {
    const matchCat    = filter === "Tous" || getCat(c.title) === filter
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase())
    const matchAnnee  = annee === "Tous" || c.annee === annee
    return matchCat && matchSearch && matchAnnee
  })

  // Trouve le top pays global (score moyen sur tous les classements)
  const topCountries = (() => {
    const scores = {}
    classements.forEach(c => {
      const maxV = Math.max(...c.items.map(i => i.numVal), 1)
      c.items.forEach(i => {
        const normalized = (i.numVal / maxV) * 100
        if (!scores[i.country]) scores[i.country] = { total:0, count:0 }
        scores[i.country].total += normalized
        scores[i.country].count += 1
      })
    })
    return Object.entries(scores)
      .map(([country, s]) => ({ country, avg: Math.round(s.total / s.count) }))
      .sort((a,b) => b.avg - a.avg)
      .slice(0, 5)
  })()

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Classements</div>
        <div className="page-sub">
          {classements.length} classements détectés dans #classement
        </div>
      </div>

      {/* Top nations */}
      {topCountries.length > 0 && (
        <div className="card fade-up" style={{ marginBottom:24 }}>
          <div className="card-title">🏆 Top nations — score global</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {topCountries.map((c, i) => (
              <div key={c.country} style={{
                display:"flex", alignItems:"center", gap:10,
                background:"var(--bg-elevated)",
                border:"1px solid var(--border)",
                borderRadius:"var(--radius)",
                padding:"10px 16px", flex:1, minWidth:120,
              }}>
                <span style={{ fontSize:20 }}>{medal(i+1) || `#${i+1}`}</span>
                <span style={{ fontSize:18 }}>{getFlag(c.country)}</span>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:11, color:"var(--or-200)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    {c.country}
                  </div>
                  <div style={{ fontSize:12, color:"var(--or-500)", fontFamily:"var(--font-mono)" }}>
                    Score : {c.avg}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }} className="fade-up">
        <input
          className="input-field"
          placeholder="Rechercher un classement…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:150 }}
        />
        {annees.length > 1 && annees.map(a => (
          <button key={a}
            className={`btn ${annee === a ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setAnnee(a)}
            style={{ padding:"8px 14px" }}
          >
            {a === "Tous" ? "Toutes années" : `An ${a}`}
          </button>
        ))}
        {CATEGORIES.map(cat => (
          <button key={cat}
            className={`btn ${filter === cat ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(cat)}
            style={{ padding:"8px 14px", fontSize:11 }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Classements */}
      {loading ? (
        <div className="loading"><div className="spinner" /><span>Chargement des classements…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">📊</span>
          <div>Aucun classement trouvé dans #classement</div>
          <div style={{ fontSize:11, marginTop:8, color:"var(--text-muted)" }}>
            Le bot doit avoir capturé les messages du salon #classement
          </div>
        </div>
      ) : (
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))",
          gap:20,
        }} className="stagger">
          {filtered.map((c, i) => (
            <ClassementCard key={i} data={c} />
          ))}
        </div>
      )}
    </div>
  )
}
