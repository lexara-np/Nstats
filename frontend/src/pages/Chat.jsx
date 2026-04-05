import { useState, useEffect, useRef } from "react"

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

const SUGGESTIONS = [
  "Qui sont les nations les plus actives en ce moment ?",
  "Quels conflits sont en cours sur le serveur ?",
  "Quelles alliances existent entre les nations ?",
  "Donne-moi un résumé de la situation diplomatique",
  "Quelles nations sont inactives et risquent d'être abandonnées ?",
  "Que s'est-il passé récemment dans #action-guerre ?",
  "Qui domine économiquement le serveur ?",
  "Quels événements RP devrais-je organiser cette semaine ?",
]

export default function Chat() {
  const [messages, setMessages]   = useState([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'analyste IA de **Pax Historia FR**. J'ai accès à l'historique complet du serveur — messages, nations, organisations, conflits.\n\nPose-moi n'importe quelle question sur l'état du serveur, les nations, la diplomatie ou les événements RP.",
      time: new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
    }
  ])
  const [input, setInput]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [context, setContext]     = useState(null)
  const bottomRef                 = useRef(null)

  // Charge le contexte du serveur au démarrage
  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/messages?limit=500").then(r => r.json()),
      fetch("/api/nations/stats").then(r => r.json()),
    ]).then(([stats, msgs, nations]) => {
      setContext({ stats, msgs, nations })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" })
  }, [messages])

  const send = async (text) => {
    const question = text || input.trim()
    if (!question || loading) return
    setInput("")

    const userMsg = {
      role: "user",
      content: question,
      time: new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Construit le contexte serveur
      const statsText = context ? `
STATISTIQUES :
- Messages totaux : ${context.stats?.total_messages?.toLocaleString("fr-FR")}
- Membres actifs : ${context.stats?.active_members}
- Salons capturés : ${context.stats?.channels}
- Salon le + actif : #${context.stats?.top_channel}
- Membre le + actif : ${context.stats?.top_member}

NATIONS ACTIVES (par messages) :
${(context.nations || []).slice(0,15).map(n => `- ${n.nation} : ${n.messages} msgs`).join("\n")}

DERNIERS MESSAGES DU SERVEUR :
${(context.msgs || [])
  .filter(m => m.content?.length > 20 && !m.content.startsWith("!") && !m.content.startsWith("http"))
  .slice(0, 100)
  .map(m => `[#${m.channel}] ${m.author}: ${m.content?.slice(0, 150)}`)
  .join("\n")}
` : "Contexte en cours de chargement…"

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: statsText,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      const data = await r.json()
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response || "❌ Erreur lors de la réponse.",
        time: new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Erreur : ${e.message}`,
        time: new Date().toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
      }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 72px)" }}>
      <div className="page-header fade-up" style={{ marginBottom:16, flexShrink:0 }}>
        <div className="page-title">Chat IA</div>
        <div className="page-sub">
          {context
            ? `Contexte chargé — ${context.stats?.total_messages?.toLocaleString("fr-FR")} messages analysables`
            : "Chargement du contexte…"}
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16, flexShrink:0 }} className="fade-up">
          {SUGGESTIONS.map((s, i) => (
            <button key={i}
              onClick={() => send(s)}
              style={{
                padding:"8px 14px",
                background:"var(--bg-raised)",
                border:"1px solid var(--border)",
                borderRadius:20,
                color:"var(--text-secondary)",
                fontSize:12,
                cursor:"pointer",
                transition:"all 0.2s",
                fontFamily:"var(--font-body)",
              }}
              onMouseEnter={e => { e.target.style.borderColor="var(--border-glow)"; e.target.style.color="var(--or-200)" }}
              onMouseLeave={e => { e.target.style.borderColor="var(--border)"; e.target.style.color="var(--text-secondary)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex:1, overflowY:"auto", display:"flex", flexDirection:"column",
        gap:12, padding:"4px 0", marginBottom:16,
        scrollbarWidth:"thin", scrollbarColor:"var(--or-700) transparent",
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display:"flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems:"flex-end", gap:8,
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width:32, height:32, borderRadius:"50%", flexShrink:0,
                background:"linear-gradient(135deg,var(--violet-700),var(--or-700))",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, boxShadow:"0 0 12px var(--accent-glow)",
              }}>⬡</div>
            )}

            <div style={{
              maxWidth:"75%",
              background: msg.role === "user"
                ? "linear-gradient(135deg,var(--or-700),var(--or-500))"
                : "var(--bg-raised)",
              border: msg.role === "user"
                ? "1px solid rgba(212,160,23,0.3)"
                : "1px solid var(--border)",
              borderRadius: msg.role === "user"
                ? "16px 16px 4px 16px"
                : "16px 16px 16px 4px",
              padding:"12px 16px",
              position:"relative",
            }}>
              {msg.role === "assistant" ? (
                <div
                  style={{ fontSize:14, color:"var(--text-secondary)", lineHeight:1.7 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              ) : (
                <div style={{ fontSize:14, color:"var(--or-100)", lineHeight:1.6 }}>
                  {msg.content}
                </div>
              )}
              <div style={{
                fontSize:10, color: msg.role === "user" ? "rgba(254,249,195,0.5)" : "var(--text-muted)",
                marginTop:6, textAlign:"right", fontFamily:"var(--font-mono)",
              }}>
                {msg.time}
              </div>
            </div>

            {msg.role === "user" && (
              <div style={{
                width:32, height:32, borderRadius:"50%", flexShrink:0,
                background:"linear-gradient(135deg,var(--or-700),var(--or-400))",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14,
              }}>◉</div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              background:"linear-gradient(135deg,var(--violet-700),var(--or-700))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14,
            }}>⬡</div>
            <div style={{
              background:"var(--bg-raised)", border:"1px solid var(--border)",
              borderRadius:"16px 16px 16px 4px", padding:"14px 18px",
              display:"flex", gap:4, alignItems:"center",
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:6, height:6, borderRadius:"50%",
                  background:"var(--or-400)",
                  animation:"bounce 1.2s ease-in-out infinite",
                  animationDelay:`${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display:"flex", gap:10, flexShrink:0,
        background:"var(--bg-raised)",
        border:"1px solid var(--border)",
        borderRadius:"var(--radius-lg)",
        padding:"8px 8px 8px 16px",
        transition:"border-color 0.2s",
      }}
        onFocus={e => e.currentTarget.style.borderColor = "var(--border-glow)"}
        onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pose une question sur Pax Historia FR…"
          disabled={loading}
          style={{
            flex:1, background:"transparent", border:"none",
            color:"var(--text-primary)", fontSize:15,
            fontFamily:"var(--font-body)", outline:"none",
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding:"8px 16px", borderRadius:10 }}
        >
          ✦
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
