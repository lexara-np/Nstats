import { useState, useEffect } from "react"

export default function Overview({ stats }) {
  const [activity, setActivity] = useState([])

  useEffect(() => {
    if (stats?.activity_30d) setActivity(stats.activity_30d)
  }, [stats])

  const maxCount = Math.max(...activity.map(a => a.count), 1)

  const STAT_ITEMS = [
    { icon: "◇", label: "Messages totaux",  value: stats?.total_messages?.toLocaleString("fr-FR") ?? "—" },
    { icon: "◉", label: "Membres actifs",   value: stats?.active_members ?? "—" },
    { icon: "⬡", label: "Salons capturés",  value: stats?.channels ?? "—" },
    { icon: "✦", label: "Salon le + actif", value: `#${stats?.top_channel ?? "—"}` },
    { icon: "⬧", label: "Membre le + actif",value: stats?.top_member ?? "—" },
    { icon: "◈", label: "Dernière capture", value: stats?.last_capture ?? "—" },
  ]

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Vue d'ensemble</div>
        <div className="page-sub">Activité globale du serveur NationRP</div>
      </div>

      <div className="stat-grid stagger">
        {STAT_ITEMS.map(({ icon, label, value }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">{icon}</span>
            <div className="stat-value" style={{ fontSize: value?.length > 8 ? "16px" : "24px" }}>
              {value}
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Activité 30 jours */}
        <div className="card fade-up">
          <div className="card-title">Activité — 30 derniers jours</div>
          {activity.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">◇</div>
              <div>Données insuffisantes</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "120px" }}>
              {activity.slice(-30).map((a, i) => (
                <div
                  key={i}
                  title={`${a.day}: ${a.count} messages`}
                  style={{
                    flex: 1,
                    height: `${(a.count / maxCount) * 100}%`,
                    minHeight: "2px",
                    background: `linear-gradient(180deg, var(--or-300), var(--or-700))`,
                    borderRadius: "2px 2px 0 0",
                    opacity: 0.6 + (a.count / maxCount) * 0.4,
                    transition: "opacity 0.2s",
                    cursor: "default",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top salons */}
        <div className="card fade-up">
          <div className="card-title">Top salons</div>
          {!stats?.top_channels?.length ? (
            <div className="empty">
              <div className="empty-icon">⬡</div>
              <div>Aucune donnée</div>
            </div>
          ) : (
            <div className="bar-list">
              {stats.top_channels.slice(0, 7).map((ch, i) => {
                const maxVal = stats.top_channels[0]?.count || 1
                return (
                  <div className="bar-item" key={i}>
                    <div className="bar-label">
                      <span>#{ch.name}</span>
                      <span style={{ color: "var(--accent)" }}>{ch.count.toLocaleString("fr-FR")}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(ch.count / maxVal) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
