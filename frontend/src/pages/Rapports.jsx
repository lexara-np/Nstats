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

const MODES = [
  { id:"channel",    label:"Par salon",       icon:"⬡", color:"var(--or-400)" },
  { id:"server",     label:"Serveur entier",  icon:"🌍", color:"#60a5fa" },
  { id:"diplomatie", label:"Diplomatie",      icon:"🤝", color:"#60a5fa" },
  { id:"guerre",     label:"Conflits",        icon:"⚔️", color:"#ef4444" },
  { id:"economie",   label:"Économie",        icon:"💰", color:"#34d399" },
  { id:"conseil",    label:"Conseils IA",     icon:"💡", color:"var(--or-300)" },
]

const BADGE_COLORS = {
  channel:    "badge-violet",
  server:     "badge-green",
  conseil:    "badge-amber",
  diplomatie: "badge-or",
  guerre:     "badge-violet",
  economie:   "badge-green",
}

export default function Rapports() {
  const [channels, setChannels] = useState([])
  const [rapports, setRapports] = useState([])
  const [selected, setSelected] = useState("")
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState("")
  const [mode, setMode]         = useState("channel")
  const [activeRap, setActiveRap] = useState(null)
  const [searchHist, setSearchHist] = useState("")

  useEffect(() => {
    fetch("/api/channels").then(r => r.json()).then(setChannels).catch(() => {})
    fetch("/api/rapports?limit=50").then(r => r.json()).then(setRapports).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setResult("")
    try {
      let url, body, method = "POST"

      switch (mode) {
        case "server":     url = "/api/rapport-serveur";  body = undefined; break
        case "diplomatie": url = "/api/rapport-diplomatie"; body = undefined; break
        case "guerre":     url = "/api/rapport-guerre";   body = undefined; break
        case "economie":   url = "/api/rapport-economie"; body = undefined; break
        case "conseil":    url = "/api/conseil"; method = "GET"; body = undefined; break
        default: {
          const ch = channels.find(c => c.id === selected)
          if (!ch) { setLoading(false); return }
          url = "/api/rapport"
          body = JSON.stringify({ channel_id: ch.id, channel_name: ch.name })
        }
      }

      const opts = { method, headers: { "Content-Type": "application/json" } }
      if (body) opts.body = body

      const r    = await fetch(url, opts)
      const data = await r.json()
      const text = data.rapport || data.conseil || "Aucune réponse."
      setResult(text)
      fetch("/api/rapports?limit=50").then(r => r.json()).then(setRapports).catch(() => {})
    } catch (e) {
      setResult(`❌ Erreur : ${e.message}`)
    }
    setLoading(false)
  }

  const fmt = ts => {
    try { return new Date(ts).toLocaleDateString("fr-FR") + " " + new Date(ts).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" }) }
    catch { return ts }
  }

  const currentMode = MODES.find(m => m.id === mode)

  const filteredHist = rapports.filter(r =>
    !searchHist || r.content?.toLowerCase().includes(searchHist.toLowerCase())
  )

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Rapports IA</div>
        <div className="page-sub">Groq Llama 3.3 70B • Pax Historia FR • Dev Tier</div>
      </div>

      <div className="grid-2 stagger">
        {/* Panneau de génération */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="card">
            <div className="card-title">Type de rapport</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {MODES.map(m => (
                <button key={m.id}
                  onClick={() => { setMode(m.id); setResult("") }}
                  style={{
                    padding:"10px 8px",
                    borderRadius:"var(--radius)",
                    border:`1px solid ${mode === m.id ? m.color + "60" : "var(--border)"}`,
                    background: mode === m.id ? `${m.color}15` : "transparent",
                    color: mode === m.id ? m.color : "var(--text-muted)",
                    fontFamily:"var(--font-display)",
                    fontSize:9, letterSpacing:"0.08em",
                    cursor:"pointer", transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:6, justifyContent:"center",
                  }}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {mode === "channel" && (
              <select className="select-field" value={selected}
                onChange={e => setSelected(e.target.value)}
                style={{ marginBottom:12 }}
              >
                <option value="">— Choisir un salon —</option>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>#{ch.name} ({ch.category})</option>
                ))}
              </select>
            )}

            {mode !== "channel" && (
              <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:12 }}>
                {mode === "server"     && "Analyse complète du serveur — toutes les nations et organisations."}
                {mode === "diplomatie" && "État des alliances, organisations internationales et tensions diplomatiques."}
                {mode === "guerre"     && "Conflits actifs, propagande, forces militaires et prévisions."}
                {mode === "economie"   && "Transactions, territoires, richesses et déséquilibres économiques."}
                {mode === "conseil"    && "7 recommandations personnalisées pour améliorer Pax Historia FR."}
              </p>
            )}

            <button className="btn btn-primary" onClick={generate}
              disabled={loading || (mode === "channel" && !selected)}
              style={{
                width:"100%", justifyContent:"center",
                background: mode === "guerre"
                  ? "linear-gradient(135deg,#7f1d1d,#ef4444)"
                  : mode === "diplomatie"
                  ? "linear-gradient(135deg,#1e3a5f,#60a5fa)"
                  : mode === "economie"
                  ? "linear-gradient(135deg,#065f46,#34d399)"
                  : undefined
              }}
            >
              {loading
                ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Analyse en cours…</>
                : `${currentMode?.icon} Générer`}
            </button>
          </div>

          {/* Résultat */}
          {result && (
            <div className="card fade-up">
              <div className="card-title" style={{ color: currentMode?.color }}>
                {currentMode?.icon} Résultat — {currentMode?.label}
              </div>
              <div className="rapport-box" style={{ maxHeight:"none" }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="card">
          <div className="card-title">Historique ({rapports.length})</div>
          <input
            className="input-field"
            placeholder="Rechercher dans l'historique…"
            value={searchHist}
            onChange={e => setSearchHist(e.target.value)}
            style={{ marginBottom:12 }}
          />
          {filteredHist.length === 0 ? (
            <div className="empty"><span className="empty-icon">✦</span><div>Aucun rapport</div></div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:600, overflowY:"auto" }}>
              {filteredHist.map(r => (
                <div key={r.id}
                  onClick={() => setActiveRap(activeRap?.id === r.id ? null : r)}
                  style={{
                    background: activeRap?.id === r.id ? "rgba(212,160,23,0.08)" : "var(--bg-elevated)",
                    border:`1px solid ${activeRap?.id === r.id ? "var(--border-glow)" : "var(--border)"}`,
                    borderRadius:"var(--radius)", padding:"12px 14px",
                    cursor:"pointer", transition:"all 0.2s",
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span className={`badge ${BADGE_COLORS[r.type] || "badge-violet"}`}>
                      {r.type === "server" ? "🌍 Serveur"
                       : r.type === "conseil" ? "💡 Conseils"
                       : r.type === "diplomatie" ? "🤝 Diplomatie"
                       : r.type === "guerre" ? "⚔️ Guerre"
                       : r.type === "economie" ? "💰 Économie"
                       : "⬡ Salon"}
                    </span>
                    <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
                      {fmt(r.created_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize:12, color:"var(--text-secondary)",
                    overflow:"hidden",
                    display: activeRap?.id === r.id ? "block" : "-webkit-box",
                    WebkitLineClamp: activeRap?.id === r.id ? "none" : 2,
                    WebkitBoxOrient:"vertical",
                  }}
                    dangerouslySetInnerHTML={{
                      __html: activeRap?.id === r.id
                        ? renderMarkdown(r.content)
                        : r.content?.slice(0,100) + "…"
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
                                              }
