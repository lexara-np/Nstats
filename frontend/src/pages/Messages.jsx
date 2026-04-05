import { useState, useEffect } from "react"

export default function Messages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [limit, setLimit]       = useState(200)

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
          type="text"
          placeholder="Rechercher dans les messages…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            fontFamily: "var(--font-body)",
          }}
        />
        <button
          className="btn btn-ghost"
          onClick={() => { setLimit(l => l + 200); load(limit + 200) }}
        >
          Charger +200
        </button>
      </div>

      <div className="card fade-up">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Chargement…</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Salon</th>
                  <th>Auteur</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "var(--text-muted)" }}>
                      {fmt(m.timestamp)}
                    </td>
                    <td>
                      <span className="badge badge-violet">#{m.channel}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--accent)" }}>{m.author}</td>
                    <td style={{ maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.content || <span style={{ opacity: 0.3, fontStyle: "italic" }}>Pièce jointe</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty">
                <div className="empty-icon">◇</div>
                <div>Aucun message trouvé</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
