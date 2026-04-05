import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom"
import Overview from "./pages/Overview"
import Nations from "./pages/Nations"
import Messages from "./pages/Messages"
import Rapports from "./pages/Rapports"
import Members from "./pages/Members"
import "./styles/global.css"

const NAV = [
  { to: "/",         label: "Vue d'ensemble", icon: "◈" },
  { to: "/nations",  label: "Nations",         icon: "🌍" },
  { to: "/messages", label: "Messages RP",     icon: "◇" },
  { to: "/members",  label: "Membres",         icon: "◉" },
  { to: "/rapports", label: "Rapports IA",     icon: "✦" },
]

export default function App() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
    // Refresh toutes les 30 secondes
    const interval = setInterval(() => {
      fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
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
              <div className="brand-sub">Analytics</div>
            </div>
          </div>

          <nav className="nav">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
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
            <Route path="/"         element={<Overview stats={stats} />} />
            <Route path="/nations"  element={<Nations />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/members"  element={<Members />} />
            <Route path="/rapports" element={<Rapports />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
