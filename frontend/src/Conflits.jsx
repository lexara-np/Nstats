import { useState, useEffect } from "react"

const renderMarkdown = (text) => {
  if (!text) return ""
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^---$/gm,        '<hr/>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/\n/g, '<br/>')
}

const TABS = [
  { id:"action-guerre",    label:"⚔️ Guerre",      color:"#ef4444" },
  { id:"déclaration",      label:"📣 Déclarations", color:"#f97316" },
  { id:"propagande",       label:"📢 Propagande",   color:"#a78bfa" },
  { id:"rumeur",           label:"🕵️ Rumeurs",     color:"#6366f1" },
]

export default function Conflits() {
  const [messages, setMessages] = useState([])
  const [rapport, setRapport]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [loadMsgs, setLoadMsgs] = useState(true)
  const [activeTab, setActiveTab] = useState("action-guerre")
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch("/api/conflits")
      .then(r => r.json())
      .then(data => { setMessages(data); setLoadMsgs(false) })
      .catch(() => setLoadMsgs(false))
  }, [])

  const generateRapport = async () => {
    setLoading(true)
    setRapport("")
    try {
      const r = await fetch("/api/rapport-guerre", { method:"POST" })
      const data = await r.json()
      setRapport(data.rapport || "Aucune donnée.")
    } catch { setRapport("❌ Erreur lors de la génération.") }
    setLoading(false)
  }

  const fmt = ts => {
    try { return new Date(ts).toLocaleDateString("fr-FR") + " " + new Date(ts).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }) }
    catch { return ts }
  }

  const filtered = messages.filter(m => m.channel?.toLowerCase().includes(activeTab))
  const activeColor = TABS.find(t => t.id === activeTab)?.color || "#ef4444"

  // Stats rapides
  const warMsgs   = messages.filter(m => m.channel?.includes("guerre")).length
  const propMsgs  = messages.filter(m => m.channel?.includes("propagande")).length
  const rumorMsgs = messages.filter(m => m.channel?.includes("rumeur")).length
  const declMsgs  = messages.filter(m => m.channel?.includes("déclaration")).length

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Conflits & Guerre</div>
        <div className="page-sub">Situation militaire, propagande et rumeurs</div>
      </div>

      {/* Stats conflits */}
      <div className="stat-grid stagger" style={{ marginBottom:20 }}>
        {[
          { icon:"⚔️", label:"Messages de guerre",     value:warMsgs },
          { icon:"📣", label:"Déclarations",            value:declMsgs },
          { icon:"📢", label:"Messages propagande",     value:propMsgs },
          { icon:"🕵️", label:"Rumeurs",                value:rumorMsgs },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }} className="fade-up">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding:"8px 16px",
              borderRadius:"var(--radius)",
              border:`1px solid ${activeTab === tab.id ? tab.color + "60" : "var(--border)"}`,
              background: activeTab === tab.id ? `${tab.color}15` : "transparent",
              color: activeTab === tab.id ? tab.color : "var(--text-muted)",
              fontFamily:"var(--font-display)",
              fontSize:10, letterSpacing:"0.1em",
              cursor:"pointer", transition:"all 0.2s",
            }}
          >
            {tab.label} ({messages.filter(m => m.channel?.includes(tab.id)).length})
          </button>
        ))}
      </div>

      {/* Messages filtrés */}
      <div className="card fade-up" style={{ marginBottom:24 }}>
        <div className="card-title" style={{ color:activeColor }}>
          {TABS.find(t => t.id === activeTab)?.label} — {filtered.length} messages
        </div>
        {loadMsgs ? (
          <div className="loading"><div className="spinner" /><span>Chargement…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><span className="empty-icon">⚔️</span><div>Aucun message</div></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:450, overflowY:"auto" }}>
            {filtered.map((m, i) => (
              <div key={i}
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  padding:"10px 14px",
                  background:"var(--bg-elevated)",
                  borderRadius:8,
                  borderLeft:`2px solid ${activeColor}`,
                  cursor:"pointer",
                  transition:"background 0.15s",
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:"var(--or-300)", fontSize:12, fontWeight:600 }}>{m.author}</span>
                  <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>{fmt(m.timestamp)}</span>
                </div>
                <div style={{
                  fontSize:14, color:"var(--text-secondary)", lineHeight:1.5,
                  overflow:"hidden",
                  display: expanded === i ? "block" : "-webkit-box",
                  WebkitLineClamp: expanded === i ? "none" : 3,
                  WebkitBoxOrient:"vertical",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rapport IA guerre */}
      <div className="card fade-up">
        <div className="card-title">⚔️ Rapport Militaire IA</div>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>
          Analyse des conflits actifs, propagande, forces en présence et prévisions.
        </p>
        <button className="btn btn-primary" onClick={generateRapport} disabled={loading}
          style={{
            width:"100%", justifyContent:"center", marginBottom:16,
            background:"linear-gradient(135deg,#7f1d1d,#ef4444)",
            borderColor:"rgba(239,68,68,0.4)",
          }}>
          {loading
            ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Analyse militaire…</>
            : "⚔️ Générer le rapport de guerre"}
        </button>
        {rapport && (
          <div className="rapport-box" style={{ maxHeight:"none" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(rapport) }} />
        )}
      </div>
    </div>
  )
    }
          
