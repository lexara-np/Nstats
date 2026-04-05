import { useState, useEffect } from "react"

const SALONS_RP = [
  "diplomatie","action-guerre","propagande","rumeur","worldvision",
  "tribunal","séance-tribunal","traité-de-paix","vente-territoire",
  "ventes","citation","sommet-de-la-paix","résumé-rp","annonce-rp",
  "pays-libres","les-alliances","classements","déclaration-guerre",
  "discussion-rp","onu","otsc","apu","acse","aei","pgai",
  "france","allemagne","usa","urss","chine","japon","arabie-saoudite",
  "inde","brésil","italie","suède","danemark","norvège","pays-bas",
  "suisse","nigéria","australie","pérou","grèce","cote-divoire",
  "federation-sainte-de-jeru","rpu-goryeo","irlande","mongolie",
  "islande","sénégal","portugal","espagne","belgique","canada"
]

const isRP = (channel) => SALONS_RP.some(s => channel?.toLowerCase().includes(s))

const CHANNEL_COLORS = {
  guerre: "#ef4444", action: "#ef4444", déclaration: "#ef4444",
  diplomatie: "#60a5fa", traité: "#60a5fa", onu: "#60a5fa", otsc: "#60a5fa",
  apu: "#60a5fa", acse: "#60a5fa", aei: "#60a5fa",
  tribunal: "#f59e0b", séance: "#f59e0b",
  propagande: "#a78bfa", rumeur: "#a78bfa", worldvision: "#a78bfa",
  vente: "#34d399", économie: "#34d399",
}

const getColor = (ch) => {
  for (const [key, color] of Object.entries(CHANNEL_COLORS)) {
    if (ch?.toLowerCase().includes(key)) return color
  }
  return "var(--or-400)"
}

export default function Messages() {
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [limit, setLimit]         = useState(500)
  const [expanded, setExpanded]   = useState(null)
  const [filterRP, setFilterRP]   = useState(true)
  const [filterCh, setFilterCh]   = useState("Tous")

  const load = (l) => {
    setLoading(true)
    fetch(`/api/messages?limit=${l}`)
      .then(r => r.json())
      .then(data => { setMessages(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load(limit) }, [])

  const filtered = messages
    .filter(m => !filterRP || isRP(m.channel))
    .filter(m => filterCh === "Tous" || m.channel === filterCh)
    .filter(m =>
      !search ||
      m.content?.toLowerCase().includes(search.toLowerCase()) ||
      m.author?.toLowerCase().includes(search.toLowerCase()) ||
      m.channel?.toLowerCase().includes(search.toLowerCase())
    )

  // Canaux uniques présents
  const channels = [...new Set(messages.filter(m => !filterRP || isRP(m.channel)).map(m => m.channel))].sort()

  const fmt = ts => {
    try {
      const d = new Date(ts)
      return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
    } catch { return ts }
  }

  return (
    <div>
      <div className="page-header fade-up">
        <div className="page-title">Messages RP</div>
        <div className="page-sub">{filtered.length} messages — salons roleplay uniquement</div>
      </div>

      {/* Barre de filtres */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }} className="fade-up">
        <input
          className="input-field"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:160 }}
        />
        <select
          className="select-field"
          value={filterCh}
          onChange={e => setFilterCh(e.target.value)}
          style={{ width:180 }}
        >
          <option value="Tous">Tous les salons</option>
          {channels.map(c => <option key={c} value={c}>#{c}</option>)}
        </select>
        <button
          className={`btn ${filterRP ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setFilterRP(!filterRP)}
        >
          {filterRP ? "✓ RP seulement" : "Tout afficher"}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => { const nl = limit + 300; setLimit(nl); load(nl) }}
        >
          +300
        </button>
      </div>

      <div className="card fade-up">
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Chargement…</span></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {/* Header */}
            <div style={{
              display:"grid", gridTemplateColumns:"110px 140px 1fr",
              gap:8, padding:"8px 12px",
              borderBottom:"1px solid var(--border)",
              fontFamily:"var(--font-display)", fontSize:9,
              letterSpacing:"0.2em", textTransform:"uppercase",
              color:"var(--or-500)",
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
                  display:"grid", gridTemplateColumns:"110px 140px 1fr",
                  gap:8, padding:"10px 12px",
                  borderBottom:"1px solid rgba(212,160,23,0.04)",
                  cursor:"pointer",
                  background: expanded === m.id ? "rgba(212,160,23,0.04)" : "transparent",
                  borderRadius:6,
                  transition:"background 0.15s",
                }}
              >
                <div>
                  <div style={{
                    fontSize:9, fontFamily:"var(--font-display)",
                    color: getColor(m.channel),
                    letterSpacing:"0.05em", textTransform:"uppercase",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    #{m.channel?.slice(0,14)}
                  </div>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:3, fontFamily:"var(--font-mono)" }}>
                    {fmt(m.timestamp).split(" ")[0]}
                  </div>
                </div>

                <div style={{ color:"var(--or-300)", fontSize:13, fontWeight:500, alignSelf:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {m.author}
                </div>

                <div style={{
                  fontSize:14, color:"var(--text-secondary)",
                  alignSelf:"center", lineHeight:1.5,
                  wordBreak:"break-word",
                  overflow:"hidden",
                  display: expanded === m.id ? "block" : "-webkit-box",
                  WebkitLineClamp: expanded === m.id ? "none" : 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {m.content || <span style={{ opacity:0.3, fontStyle:"italic" }}>Pièce jointe</span>}
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
