import { useState, useEffect } from "react"

export default function Messages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [limit, setLimit]       = useState(200)
  const [expanded, setExpanded] = useState(null)

  const load = (l = limit) => {
    setLoading(true)
    fetch(`/api/messages?limit=${l}`)
      .then(r => r.json())
      .then(data => { setMessages(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = messages.filter(m =>
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.author.toLowerCase().includes(search.toLowerCase()) ||
    m.channel.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = ts => {
    try {
      const d = new Date(ts)
      return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    } catch { return ts }
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Messages</div>
        <div className="page-sub">{filtered.length} messages affichés</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }} className="fade-up">
        <input
          className="input-field"
          type="text"
          placeholder="Rechercher dans les messages…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-ghost"
          onClick={() => { setLimit(l => l + 200); load(limit + 200) }}
        >
          +200
        </button>
      </div>

      <div className="card fade-up">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Chargement…</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 1fr",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--or-500)",
            }}>
              <span>Salon</span>
              <span>Auteur</span>
              <span>Message</span>
            </div>

            {filtered.map(m => (
              <div
                key={m.id}
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 1fr",
                  gap: 8,
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(212,160,23,0.04)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  background: expanded === m.id ? "rgba(212,160,23,0.04)" : "transparent",
                  borderRadius: 6,
                }}
              >
                <div>
                  <span className="badge badge-violet" style={{ fontSize: 8, padding: "2px 6px" }}>
                    #{m.channel.length > 10 ? m.channel.slice(0, 10) + "…" : m.channel}
                  </span>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {fmt(m.timestamp).split(" ")[0]}
                  </div>
                </div>
                <div style={{ color: "var(--or-300)", fontSize: 13, fontWeight: 500, alignSelf: "center" }}>
                  {m.author}
                </div>
                <div style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  alignSelf: "center",
                  overflow: "hidden",
                  display: expanded === m.id ? "block" : "-webkit-box",
                  WebkitLineClamp: expanded === m.id ? "none" : 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}>
                  {m.content || <span style={{ opacity: 0.3, fontStyle: "italic" }}>Pièce jointe</span>}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="empty">
                <span className="empty-icon">◇</span>
                <div>Aucun message trouvé</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
