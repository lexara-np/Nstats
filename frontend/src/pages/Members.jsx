import { useState, useEffect } from "react"

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/members")
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const maxMsgs = members[0]?.message_count || 1

  const fmt = ts => {
    if (!ts) return "—"
    try { return new Date(ts).toLocaleDateString("fr-FR") }
    catch { return ts }
  }

  const medal = i => ["🥇", "🥈", "🥉"][i] ?? `${i + 1}`

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Membres</div>
        <div className="page-sub">{members.length} joueurs actifs</div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Chargement…</span>
        </div>
      ) : (
        <div className="grid-2 stagger">
          {/* Podium */}
          <div className="card">
            <div className="card-title">Classement activité</div>
            <div className="bar-list">
              {members.slice(0, 10).map((m, i) => (
                <div className="bar-item" key={m.author_id}>
                  <div className="bar-label">
                    <span>
                      <span style={{ marginRight: 8, fontSize: 14 }}>{medal(i)}</span>
                      {m.author}
                    </span>
                    <span style={{ color: "var(--accent)" }}>
                      {m.message_count.toLocaleString("fr-FR")} msgs
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(m.message_count / maxMsgs) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table détaillée */}
          <div className="card">
            <div className="card-title">Détail — top 20</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Membre</th>
                    <th>Messages</th>
                    <th>Salons</th>
                    <th>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 20).map((m, i) => (
                    <tr key={m.author_id}>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i + 1}</td>
                      <td style={{ color: "var(--accent)", fontWeight: 500 }}>{m.author}</td>
                      <td>{m.message_count.toLocaleString("fr-FR")}</td>
                      <td>
                        <span className="badge badge-violet">{m.channels_used}</span>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(m.last_active)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
