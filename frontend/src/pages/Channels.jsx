import { useState, useEffect } from "react"

export default function Channels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")

  useEffect(() => {
    fetch("/api/channels")
      .then(r => r.json())
      .then(data => { setChannels(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = [...new Set(channels.map(c => c.category))]

  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Chargement des salons…</span>
    </div>
  )

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Salons capturés</div>
        <div className="page-sub">{channels.length} salons indexés</div>
      </div>

      <div className="card fade-up" style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Rechercher un salon ou catégorie…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            fontFamily: "var(--font-body)",
          }}
        />
      </div>

      {categories.map(cat => {
        const catChannels = filtered.filter(c => c.category === cat)
        if (!catChannels.length) return null
        return (
          <div key={cat} className="card fade-up" style={{ marginBottom: 20 }}>
            <div className="card-title">{cat}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Salon</th>
                    <th>Description</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {catChannels.map(ch => (
                    <tr key={ch.id}>
                      <td>
                        <span style={{ color: "var(--accent)" }}>#{ch.name}</span>
                      </td>
                      <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ch.topic || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td>
                        {ch.nsfw
                          ? <span className="badge badge-amber">NSFW</span>
                          : <span className="badge badge-violet">Texte</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && !loading && (
        <div className="empty">
          <div className="empty-icon">⬡</div>
          <div>Aucun salon trouvé</div>
        </div>
      )}
    </div>
  )
}
