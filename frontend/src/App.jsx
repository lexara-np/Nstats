import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom"
import Overview   from "./pages/Overview"
import Nations    from "./pages/Nations"
import Timeline   from "./pages/Timeline"
import Diplomatie from "./pages/Diplomatie"
import Conflits   from "./pages/Conflits"
import Messages   from "./pages/Messages"
import Members    from "./pages/Members"
import Rapports   from "./pages/Rapports"
import "./styles/global.css"

const NAV = [
  { to: "/",           label: "Vue d'ensemble", icon: "◈" },
  { to: "/nations",    label: "Nations",         icon: "🌍" },
  { to: "/timeline",   label: "Timeline RP",     icon: "📜" },
  { to: "/diplomatie", label: "Diplomatie",       icon: "🤝" },
  { to: "/conflits",   label: "Conflits",         icon: "⚔️" },
  { to: "/messages",   label: "Messages RP",      icon: "◇" },
  { to: "/members",    label: "Membres",          icon: "◉" },
  { to: "/rapports",   label: "Rapports IA",      icon: "✦" },
]

export default function App() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
    const i = setInterval(() => {
      fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
    }, 30000)
    return () => clearInterval(i)
  }, [])

  return (
    <Router>
      <div className="app">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">⬡</div>
            <div>
              <div className="brand-name">Pax Historia</div>
              <div className="brand-sub">Analytics v2</div>
            </div>
          </div>

          <nav className="nav">
            {NAV.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === "/"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="status-dot" />
            <span>{stats ? `${stats.total_messages?.toLocaleString("fr-FR")} msgs` : "Connexion…"}</span>
          </div>
        </aside>

        <main className="main">
          <Routes>
            <Route path="/"           element={<Overview   stats={stats} />} />
            <Route path="/nations"    element={<Nations />} />
            <Route path="/timeline"   element={<Timeline />} />
            <Route path="/diplomatie" element={<Diplomatie />} />
            <Route path="/conflits"   element={<Conflits />} />
            <Route path="/messages"   element={<Messages />} />
            <Route path="/members"    element={<Members />} />
            <Route path="/rapports"   element={<Rapports />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
                }
