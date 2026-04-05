import { useState, useEffect } from "react"

// Salons RP uniquement
const SALONS_RP = [
  "diplomatie", "action-guerre", "propagande", "rumeur", "worldvision",
  "tribunal", "séance-tribunal", "traité-de-paix", "vente-territoire",
  "ventes", "citation", "sommet-de-la-paix", "résumé-rp", "annonce-rp",
  "pays-libres", "les-alliances", "classements", "déclaration-guerre",
  "discussion-rp", "onu", "otsc", "apu", "acse", "aei", "pgai",
  "france", "allemagne", "usa", "urss", "chine", "japon", "arabie-saoudite",
  "inde", "brésil", "italie", "suède", "danemark", "norvège", "pays-bas",
  "suisse", "nigéria", "australie", "pérou", "grèce", "cote-divoire",
  "federation-sainte-de-jeru", "rpu-goryeo", "irlande", "mongolie",
  "islande", "sénégal", "portugal", "espagne", "belgique", "canada"
]

const isRP = (channel) => SALONS_RP.some(s => channel?.toLowerCase().includes(s))

export default function Overview({ stats }) {
  const [activity, setActivity]   = useState([])
  const [actualite, setActualite] = useState([])
  const [loading, setLoading]     = useState(true)
  const [now, setNow]             = useState(new Date())

  useEffect(() => {
    if (stats?.activity_30d) setActivity(stats.activity_30d)
  }, [stats])

  useEffect(() => {
    // Charge le fil d'actualité RP (derniers messages des salons RP importants)
    fetch("/api/messages?limit=500")
      .then(r => r.json())
      .then(data => {
        const rp = data.filter(m =>
          isRP(m.channel) &&
          m.content?.length > 30 &&
          !m.content.startsWith("http") &&
          !m.content.startsWith("!")
        ).slice(0, 30)
        setActualite(rp)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Horloge live
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const maxCount = Math.max(...activity.map(a => a.count), 1)

  const fmt = ts => {
    try {
      const d = new Date(ts)
      const diff = Math.floor((now - d) / 60000)
      if (diff < 1) return "à l'instant"
      if (diff < 60) return `il y a ${diff}min`
      if (diff < 1440) return `il y a ${Math.floor(diff/60)}h`
      return d.toLocaleDateString("fr-FR")
    } catch { return "" }
  }

  const channelColor = (ch) => {
    if (["action-guerre","déclaration-guerre"].some(s => ch?.includes(s))) return "#ef4444"
    if (["diplomatie","traité","onu","otsc","apu","acse","aei"].some(s => ch?.includes(s))) return "#60a5fa"
    if (["tribunal","séance"].some(s => ch?.includes(s))) return "#f59e0b"
    if (["propagande","rumeur","worldvision"].some(s => ch?.includes(s))) return "#a78bfa"
    if (["vente","économie"].some(s => ch?.includes(s))) return "#34d399"
    return "var(--or-400)"
  }

  const STAT_ITEMS = [
    { icon: "◇", label: "Messages totaux",  value: stats?.total_messages?.toLocaleString("fr-FR") ?? "—" },
    { icon: "◉", label: "Membres actifs",   value: stats?.active_members ?? "—" },
    { icon: "⬡", label: "Salons capturés",  value: stats?.channels ?? "—" },
    { icon: "✦", label: "Salon le + actif", value: `#${stats?.top_channel ?? "—"}` },
    { icon: "⬧", label: "Joueur le + actif",value: stats?.top_member ?? "—" },
    { icon: "🕐", label: "Heure UTC",        value: now.toUTCString().slice(17,22) },
  ]

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Pax Historia FR</div>
        <div className="page-sub">Tableau de bord géopolitique — mis à jour en temps réel</div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger">
        {STAT_ITEMS.map(({ icon, label, value }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">{icon}</span>
            <div className="stat-value" style={{ fontSize: String(value).length > 10 ? "14px" : "22px" }}>
              {value}
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Activité 30 jours */}
        <div className="card fade-up">
          <div className="card-title">Activité — 30 derniers jours</div>
          {activity.length === 0 ? (
            <div className="empty"><span className="empty-icon">◇</span><div>Données insuffisantes</div></div>
          ) : (
            <div style={{ display:"flex", alignItems:"flex-end", gap:"3px", height:"100px" }}>
              {activity.slice(-30).map((a, i) => (
                <div key={i} title={`${a.day}: ${a.count} msgs`} style={{
                  flex: 1,
                  height: `${(a.count / maxCount) * 100}%`,
                  minHeight: "2px",
                  background: `linear-gradient(180deg, var(--or-300), var(--or-700))`,
                  borderRadius: "2px 2px 0 0",
                  opacity: 0.5 + (a.count / maxCount) * 0.5,
                  cursor: "default",
                  transition: "opacity 0.2s",
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Top salons RP */}
        <div className="card fade-up">
          <div className="card-title">Top salons RP</div>
          <div className="bar-list">
            {(stats?.top_channels || [])
              .filter(c => isRP(c.name))
              .slice(0, 7)
              .map((ch, i) => {
                const maxVal = stats.top_channels[0]?.count || 1
                return (
                  <div className="bar-item" key={i}>
                    <div className="bar-label">
                      <span style={{ color: channelColor(ch.name) }}>#{ch.name}</span>
                      <span style={{ color:"var(--accent)" }}>{ch.count.toLocaleString("fr-FR")}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width:`${(ch.count/maxVal)*100}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Fil d'actualité RP */}
      <div className="card fade-up">
        <div className="card-title">📡 Fil d'actualité RP — derniers événements</div>
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Chargement…</span></div>
        ) : actualite.length === 0 ? (
          <div className="empty"><span className="empty-icon">◇</span><div>Aucun événement récent</div></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {actualite.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 12,
                padding: "10px 14px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                borderLeft: `3px solid ${channelColor(m.channel)}`,
                alignItems: "flex-start",
              }}>
                <div style={{ flexShrink:0, minWidth:90 }}>
                  <div style={{ fontSize:10, color: channelColor(m.channel), fontFamily:"var(--font-display)", letterSpacing:"0.05em" }}>
                    #{m.channel?.slice(0, 12)}
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{fmt(m.timestamp)}</div>
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ color:"var(--or-300)", fontSize:12, fontWeight:600 }}>{m.author} </span>
                  <span style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.5 }}>
                    {m.content?.slice(0, 200)}{m.content?.length > 200 ? "…" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
