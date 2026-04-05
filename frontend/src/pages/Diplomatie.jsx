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

const ORGS = [
  { id:"onu",        name:"ONU",   color:"#60a5fa", desc:"Organisation des Nations Unies — diplomatie mondiale" },
  { id:"otsc",       name:"OTSC",  color:"#ef4444", desc:"Alliance militaire défensive" },
  { id:"apu",        name:"APU",   color:"#34d399", desc:"Alliance du Pacifique Uni" },
  { id:"acse",       name:"ACSE",  color:"#f59e0b", desc:"Alliance Culturelle et Sociale Européenne" },
  { id:"aei",        name:"AEI",   color:"#a78bfa", desc:"Alliance Économique Internationale" },
  { id:"pgai",       name:"PGAI",  color:"#d4a017", desc:"Pacte de Gouvernance et d'Aide Internationale" },
]

export default function Diplomatie() {
  const [messages, setMessages] = useState([])
  const [rapport, setRapport]   = useState("")
  const [loading, setLoading]   = useState(false)
  const [loadMsgs, setLoadMsgs] = useState(true)
  const [activeOrg, setActiveOrg] = useState(null)
  const [orgMsgs, setOrgMsgs]   = useState([])

  useEffect(() => {
    fetch("/api/alliances")
      .then(r => r.json())
      .then(data => { setMessages(data); setLoadMsgs(false) })
      .catch(() => setLoadMsgs(false))
  }, [])

  const generateRapport = async () => {
    setLoading(true)
    setRapport("")
    try {
      const r = await fetch("/api/rapport-diplomatie", { method:"POST" })
      const data = await r.json()
      setRapport(data.rapport || "Aucune donnée.")
    } catch { setRapport("❌ Erreur lors de la génération.") }
    setLoading(false)
  }

  const showOrg = (org) => {
    if (activeOrg?.id === org.id) { setActiveOrg(null); setOrgMsgs([]); return }
    setActiveOrg(org)
    const filtered = messages.filter(m => m.channel?.toLowerCase().includes(org.id))
    setOrgMsgs(filtered)
  }

  const fmt = ts => {
    try { return new Date(ts).toLocaleDateString("fr-FR") + " " + new Date(ts).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }) }
    catch { return ts }
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Diplomatie</div>
        <div className="page-sub">Organisations internationales & relations diplomatiques</div>
      </div>

      {/* Organisations */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))",
        gap:12, marginBottom:24,
      }} className="stagger">
        {ORGS.map(org => (
          <div key={org.id}
            onClick={() => showOrg(org)}
            style={{
              background: activeOrg?.id === org.id ? `${org.color}15` : "var(--bg-raised)",
              border:`1px solid ${activeOrg?.id === org.id ? org.color + "60" : "var(--border)"}`,
              borderRadius:"var(--radius-lg)",
              padding:"16px",
              cursor:"pointer",
              transition:"all 0.2s ease",
              position:"relative",
            }}
          >
            {activeOrg?.id === org.id && (
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                background:`linear-gradient(90deg,transparent,${org.color},transparent)` }} />
            )}
            <div style={{
              fontFamily:"var(--font-display)", fontSize:16, fontWeight:700,
              color:org.color, marginBottom:6, letterSpacing:"0.1em",
            }}>{org.name}</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.4 }}>{org.desc}</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:8, fontFamily:"var(--font-mono)" }}>
              {messages.filter(m => m.channel?.includes(org.id)).length} messages
            </div>
          </div>
        ))}
      </div>

      {/* Messages de l'org sélectionnée */}
      {activeOrg && (
        <div className="card fade-up" style={{ marginBottom:24 }}>
          <div className="card-title" style={{ color:activeOrg.color }}>
            {activeOrg.name} — {orgMsgs.length} messages récents
          </div>
          {orgMsgs.length === 0 ? (
            <div className="empty"><span className="empty-icon">🤝</span><div>Aucun message récent</div></div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:400, overflowY:"auto" }}>
              {orgMsgs.slice(0,50).map((m,i) => (
                <div key={i} style={{
                  padding:"10px 14px",
                  background:"var(--bg-elevated)",
                  borderRadius:8,
                  borderLeft:`2px solid ${activeOrg.color}`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:"var(--or-300)", fontSize:12, fontWeight:600 }}>{m.author}</span>
                    <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>{fmt(m.timestamp)}</span>
                  </div>
                  <div style={{ fontSize:14, color:"var(--text-secondary)", lineHeight:1.5 }}>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rapport IA diplomatie */}
      <div className="card fade-up">
        <div className="card-title">🤝 Rapport Diplomatique IA</div>
        <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>
          Analyse complète de la situation diplomatique — alliances, tensions, organisations.
        </p>
        <button className="btn btn-primary" onClick={generateRapport} disabled={loading}
          style={{ width:"100%", justifyContent:"center", marginBottom:16 }}>
          {loading
            ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Analyse diplomatique…</>
            : "✦ Générer le rapport diplomatique"}
        </button>
        {rapport && (
          <div className="rapport-box" style={{ maxHeight:"none" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(rapport) }} />
        )}
      </div>
    </div>
  )
                                                                                           }
            
