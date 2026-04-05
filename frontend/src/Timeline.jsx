import { useState, useEffect } from "react"

const CHANNEL_COLORS = {
  "action-guerre":    { color: "#ef4444", label: "⚔️ Guerre",      bg: "rgba(239,68,68,0.1)" },
  "déclaration":      { color: "#ef4444", label: "⚔️ Déclaration", bg: "rgba(239,68,68,0.1)" },
  "diplomatie":       { color: "#60a5fa", label: "🤝 Diplomatie",  bg: "rgba(96,165,250,0.1)" },
  "traité":           { color: "#60a5fa", label: "📜 Traité",      bg: "rgba(96,165,250,0.1)" },
  "sommet":           { color: "#60a5fa", label: "🏛️ Sommet",     bg: "rgba(96,165,250,0.1)" },
  "tribunal":         { color: "#f59e0b", label: "⚖️ Tribunal",   bg: "rgba(245,158,11,0.1)" },
  "séance":           { color: "#f59e0b", label: "⚖️ Jugement",   bg: "rgba(245,158,11,0.1)" },
  "worldvision":      { color: "#a78bfa", label: "📺 Médias",     bg: "rgba(167,139,250,0.1)" },
  "propagande":       { color: "#a78bfa", label: "📢 Propagande", bg: "rgba(167,139,250,0.1)" },
  "annonce-rp":       { color: "#d4a017", label: "📣 Annonce",    bg: "rgba(212,160,23,0.1)" },
  "résumé":           { color: "#34d399", label: "📋 Résumé",     bg: "rgba(52,211,153,0.1)" },
}

const getChannelInfo = (ch) => {
  for (const [key, val] of Object.entries(CHANNEL_COLORS)) {
    if (ch?.toLowerCase().includes(key)) return val
  }
  return { color: "var(--or-400)", label: "📌 RP", bg: "rgba(212,160,23,0.08)" }
}

export default function Timeline() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState("Tous")
  const [search, setSearch]   = useState("")

  useEffect(() => {
    fetch("/api/timeline")
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const types = ["Tous", "⚔️ Guerre", "🤝 Diplomatie", "⚖️ Tribunal", "📢 Propagande", "📣 Annonce"]

  const filtered = events.filter(e => {
    const info = getChannelInfo(e.channel)
    const matchType = filter === "Tous" || info.label.includes(filter.slice(2))
    const matchSearch = !search ||
      e.content?.toLowerCase().includes(search.toLowerCase()) ||
      e.author?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const fmt = ts => {
    try {
      const d = new Date(ts)
      return {
        date: d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }),
        time: d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
      }
    } catch { return { date: ts, time: "" } }
  }

  // Groupe par date
  const grouped = {}
  filtered.forEach(e => {
    const { date } = fmt(e.timestamp)
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  })

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Timeline RP</div>
        <div className="page-sub">{filtered.length} événements majeurs détectés</div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }} className="fade-up">
        <input
          className="input-field"
          placeholder="Rechercher un événement…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:150 }}
        />
        {types.map(t => (
          <button key={t}
            className={`btn ${filter === t ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(t)}
            style={{ padding:"8px 12px", fontSize:11 }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /><span>Chargement de la timeline…</span></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty"><span className="empty-icon">📜</span><div>Aucun événement trouvé</div></div>
      ) : (
        Object.entries(grouped).map(([date, evts]) => (
          <div key={date} style={{ marginBottom:32 }} className="fade-up">
            {/* Date header */}
            <div style={{
              display:"flex", alignItems:"center", gap:12, marginBottom:16,
            }}>
              <div style={{
                fontFamily:"var(--font-display)", fontSize:11,
                letterSpacing:"0.15em", textTransform:"uppercase",
                color:"var(--or-400)", whiteSpace:"nowrap",
              }}>{date}</div>
              <div style={{ flex:1, height:1, background:"var(--border)" }} />
              <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
                {evts.length} événement{evts.length > 1 ? "s" : ""}
              </div>
            </div>

            {/* Events */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {evts.map((e, i) => {
                const info = getChannelInfo(e.channel)
                const { time } = fmt(e.timestamp)
                return (
                  <div key={i} style={{
                    display:"flex", gap:0,
                  }}>
                    {/* Timeline line */}
                    <div style={{
                      display:"flex", flexDirection:"column", alignItems:"center",
                      marginRight:16, flexShrink:0,
                    }}>
                      <div style={{
                        width:10, height:10, borderRadius:"50%",
                        background:info.color,
                        boxShadow:`0 0 8px ${info.color}`,
                        marginTop:12, flexShrink:0,
                      }} />
                      {i < evts.length - 1 && (
                        <div style={{ width:1, flex:1, background:"var(--border)", marginTop:4, minHeight:20 }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{
                      flex:1, background:info.bg,
                      border:`1px solid ${info.color}30`,
                      borderRadius:"var(--radius)",
                      padding:"12px 16px",
                      marginBottom:4,
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{
                            fontSize:9, fontFamily:"var(--font-display)",
                            letterSpacing:"0.1em", textTransform:"uppercase",
                            color:info.color, fontWeight:600,
                          }}>{info.label}</span>
                          <span style={{
                            fontSize:9, fontFamily:"var(--font-display)",
                            color:"var(--text-muted)", letterSpacing:"0.08em",
                          }}>#{e.channel}</span>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:"var(--or-300)", fontWeight:600 }}>{e.author}</span>
                          <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>{time}</span>
                        </div>
                      </div>
                      <div style={{
                        fontSize:14, color:"var(--text-secondary)",
                        lineHeight:1.65, wordBreak:"break-word",
                      }}>
                        {e.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
    }
                          
