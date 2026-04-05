import { useState, useEffect } from "react"

// Convertit le markdown basique en HTML
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
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br/>')
}

export default function Rapports() {
  const [channels, setChannels]   = useState([])
  const [rapports, setRapports]   = useState([])
  const [selected, setSelected]   = useState("")
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState("")
  const [mode, setMode]           = useState("channel") // "channel" | "server" | "conseil"
  const [activeRap, setActiveRap] = useState(null)

  useEffect(() => {
    fetch("/api/channels").then(r => r.json()).then(setChannels).catch(() => {})
    fetch("/api/rapports").then(r => r.json()).then(setRapports).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true)
    setResult("")
    try {
      let url, body, method
      if (mode === "server") {
        url = "/api/rapport-serveur"; method = "POST"; body = undefined
      } else if (mode === "conseil") {
        url = "/api/conseil"; method = "GET"; body = undefined
      } else {
        const ch = channels.find(c => c.id === selected)
        if (!ch) { setLoading(false); return }
        url = "/api/rapport"; method = "POST"
        body = JSON.stringify({ channel_id: ch.id, channel_name: ch.name })
      }

      const opts = { method, headers: { "Content-Type": "application/json" } }
      if (body) opts.body = body

      const r    = await fetch(url, opts)
      const data = await r.json()
      const text = data.rapport || data.conseil || "Aucune réponse."
      setResult(text)

      // Refresh historique
      fetch("/api/rapports").then(r => r.json()).then(setRapports).catch(() => {})
    } catch (e) {
      setResult(`❌ Erreur : ${e.message}`)
    }
    setLoading(false)
  }

  const fmt = ts => {
    try { return new Date(ts).toLocaleDateString("fr-FR") + " " + new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }
    catch { return ts }
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Rapports IA</div>
        <div className="page-sub">Analyse de Gemini 1.5 Pro • 1M tokens de contexte</div>
      </div>

      <div className="grid-2 stagger">
        {/* Panneau de génération */}
        <div className="card">
          <div className="card-title">Générer un rapport</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { v: "channel", label: "Par salon" },
              { v: "server",  label: "Serveur entier" },
              { v: "conseil", label: "Conseils IA" },
            ].map(({ v, label }) => (
              <button
                key={v}
                className={`btn ${mode === v ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode(v)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "channel" && (
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                color: "var(--text-primary)",
                fontSize: "13px",
                marginBottom: 16,
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            >
              <option value="">— Choisir un salon —</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name} ({ch.category})</option>
              ))}
            </select>
          )}

          {mode === "server" && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              Analyse complète de tous les salons et membres. Peut prendre 30-60 secondes.
            </p>
          )}

          {mode === "conseil" && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              5 recommandations personnalisées basées sur l'activité actuelle du serveur.
            </p>
          )}

          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading || (mode === "channel" && !selected)}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyse en cours…</>
            ) : "✦ Générer"}
          </button>

          {result && (
            <div style={{ marginTop: 20 }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Résultat</div>
              <div
                className="rapport-box"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
              />
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="card">
          <div className="card-title">Historique ({rapports.length})</div>
          {rapports.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✦</div>
              <div>Aucun rapport généré</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 500, overflowY: "auto" }}>
              {rapports.map(r => (
                <div
                  key={r.id}
                  onClick={() => setActiveRap(activeRap?.id === r.id ? null : r)}
                  style={{
                    background: activeRap?.id === r.id ? "rgba(123,47,190,0.15)" : "var(--bg-elevated)",
                    border: `1px solid ${activeRap?.id === r.id ? "var(--border-glow)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span className={`badge ${r.type === "server" ? "badge-green" : r.type === "conseil" ? "badge-amber" : "badge-violet"}`}>
                      {r.type === "server" ? "Serveur" : r.type === "conseil" ? "Conseils" : "Salon"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(r.created_at)}</span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: activeRap?.id === r.id ? "normal" : "nowrap",
                    maxHeight: activeRap?.id === r.id ? "none" : "1.4em",
                  }}
                    dangerouslySetInnerHTML={{ __html: activeRap?.id === r.id ? renderMarkdown(r.content) : r.content.slice(0, 80) + "…" }}
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
