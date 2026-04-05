import { useState, useEffect } from "react"

const NATIONS = [
  { name: "france",                      flag: "🇫🇷", region: "Europe" },
  { name: "allemagne",                   flag: "🇩🇪", region: "Europe" },
  { name: "italie",                      flag: "🇮🇹", region: "Europe" },
  { name: "suède",                       flag: "🇸🇪", region: "Europe" },
  { name: "danemark",                    flag: "🇩🇰", region: "Europe" },
  { name: "norvège",                     flag: "🇳🇴", region: "Europe" },
  { name: "pays-bas",                    flag: "🇳🇱", region: "Europe" },
  { name: "suisse",                      flag: "🇨🇭", region: "Europe" },
  { name: "grèce",                       flag: "🇬🇷", region: "Europe" },
  { name: "portugal",                    flag: "🇵🇹", region: "Europe" },
  { name: "espagne",                     flag: "🇪🇸", region: "Europe" },
  { name: "belgique",                    flag: "🇧🇪", region: "Europe" },
  { name: "irlande",                     flag: "🇮🇪", region: "Europe" },
  { name: "islande",                     flag: "🇮🇸", region: "Europe" },
  { name: "usa",                         flag: "🇺🇸", region: "Amériques" },
  { name: "brésil",                      flag: "🇧🇷", region: "Amériques" },
  { name: "canada",                      flag: "🇨🇦", region: "Amériques" },
  { name: "pérou",                       flag: "🇵🇪", region: "Amériques" },
  { name: "urss",                        flag: "🇷🇺", region: "Eurasie" },
  { name: "chine",                       flag: "🇨🇳", region: "Asie" },
  { name: "japon",                       flag: "🇯🇵", region: "Asie" },
  { name: "inde",                        flag: "🇮🇳", region: "Asie" },
  { name: "mongolie",                    flag: "🇲🇳", region: "Asie" },
  { name: "rpu-goryeo",                  flag: "🇰🇵", region: "Asie" },
  { name: "australie",                   flag: "🇦🇺", region: "Océanie" },
  { name: "arabie-saoudite",             flag: "🇸🇦", region: "Moyen-Orient" },
  { name: "federation-sainte-de-jeru",   flag: "🇵🇸", region: "Moyen-Orient" },
  { name: "nigéria",                     flag: "🇳🇬", region: "Afrique" },
  { name: "cote-divoire",                flag: "🇨🇮", region: "Afrique" },
  { name: "sénégal",                     flag: "🇸🇳", region: "Afrique" },
  { name: "égypte",                      flag: "🇪🇬", region: "Afrique" },
]

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

export default function Nations() {
  const [channels, setChannels]     = useState([])
  const [members, setMembers]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [rapport, setRapport]       = useState("")
  const [loading, setLoading]       = useState(false)
  const [filter, setFilter]         = useState("Tous")
  const [search, setSearch]         = useState("")

  useEffect(() => {
    fetch("/api/channels").then(r => r.json()).then(setChannels).catch(() => {})
    fetch("/api/members").then(r => r.json()).then(setMembers).catch(() => {})
  }, [])

  // Trouve le joueur d'une nation par le nombre de messages dans son salon
  const getPlayer = (nationName) => {
    const ch = channels.find(c => c.name?.toLowerCase().includes(nationName.toLowerCase()))
    if (!ch) return null
    // Le joueur le plus actif dans ce salon
    return members.find(m => m.channels_used > 0) || null
  }

  // Compte les messages d'un salon
  const getMsgCount = (nationName) => {
    // On utilise les stats depuis les top_channels si dispo
    return null
  }

  const generateRapport = async (nation) => {
    if (selected?.name === nation.name && rapport) {
      setSelected(null)
      setRapport("")
      return
    }
    setSelected(nation)
    setRapport("")
    setLoading(true)

    const ch = channels.find(c => c.name?.toLowerCase().includes(nation.name.toLowerCase()))
    if (!ch) {
      setRapport("Salon non trouvé pour cette nation.")
      setLoading(false)
      return
    }

    try {
      const r = await fetch("/api/rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: ch.id, channel_name: ch.name })
      })
      const data = await r.json()
      setRapport(data.rapport || "Aucune donnée.")
    } catch (e) {
      setRapport("❌ Erreur lors de la génération.")
    }
    setLoading(false)
  }

  const regions = ["Tous", ...new Set(NATIONS.map(n => n.region))]

  const filtered = NATIONS.filter(n => {
    const matchRegion = filter === "Tous" || n.region === filter
    const matchSearch = n.name.includes(search.toLowerCase())
    const hasChannel  = channels.some(c => c.name?.toLowerCase().includes(n.name.toLowerCase()))
    return matchRegion && matchSearch && hasChannel
  })

  const inactive = NATIONS.filter(n =>
    !channels.some(c => c.name?.toLowerCase().includes(n.name.toLowerCase()))
  )

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Nations</div>
        <div className="page-sub">{filtered.length} nations actives — clique pour générer un rapport IA</div>
      </div>

      {/* Filtres */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }} className="fade-up">
        <input
          className="input-field"
          placeholder="Rechercher une nation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:150 }}
        />
        {regions.map(r => (
          <button
            key={r}
            className={`btn ${filter === r ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(r)}
            style={{ padding:"8px 14px" }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Grille nations */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }} className="stagger">
        {filtered.map(nation => {
          const isSelected = selected?.name === nation.name
          return (
            <div
              key={nation.name}
              onClick={() => generateRapport(nation)}
              style={{
                background: isSelected ? "rgba(212,160,23,0.12)" : "var(--bg-raised)",
                border: `1px solid ${isSelected ? "var(--border-glow)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "16px 14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Ligne dorée top si sélectionné */}
              {isSelected && (
                <div style={{
                  position:"absolute", top:0, left:0, right:0, height:2,
                  background:"linear-gradient(90deg,transparent,var(--or-400),transparent)"
                }} />
              )}
              <div style={{ fontSize:28, marginBottom:8 }}>{nation.flag}</div>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:11,
                letterSpacing:"0.08em",
                textTransform:"uppercase",
                color: isSelected ? "var(--or-200)" : "var(--text-secondary)",
                marginBottom:4,
              }}>
                {nation.name}
              </div>
              <div style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"var(--font-display)", letterSpacing:"0.1em" }}>
                {nation.region}
              </div>
              {isSelected && loading && (
                <div style={{ position:"absolute", bottom:8, right:8 }}>
                  <div className="spinner" style={{ width:14, height:14, borderWidth:2 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rapport généré */}
      {selected && !loading && rapport && (
        <div className="card fade-up" style={{ marginBottom:24 }}>
          <div className="card-title">
            {selected.flag} Rapport — {selected.name}
          </div>
          <div
            className="rapport-box"
            style={{ maxHeight:"none" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(rapport) }}
          />
        </div>
      )}

      {selected && loading && (
        <div className="card fade-up">
          <div className="loading">
            <div className="spinner" />
            <span>Analyse de {selected.flag} {selected.name} en cours…</span>
          </div>
        </div>
      )}

      {/* Nations inactives */}
      {inactive.length > 0 && (
        <div className="card fade-up">
          <div className="card-title">⚠️ Nations sans salon actif</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {inactive.map(n => (
              <span key={n.name} className="badge badge-amber">
                {n.flag} {n.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
