import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom"
import Overview from "./pages/Overview"
import Channels from "./pages/Channels"
import Messages from "./pages/Messages"
import Rapports from "./pages/Rapports"
import Members from "./pages/Members"
import "./styles/global.css"

const NAV = [
  { to: "/",          label: "Vue d'ensemble", icon: "◈" },
  { to: "/channels",  label: "Salons",          icon: "⬡" },
  { to: "/messages",  label: "Messages",         icon: "◇" },
  { to: "/members",   label: "Membres",          icon: "◉" },
  { to: "/rapports",  label: "Rapports IA",      icon: "✦" },
]

export default function App() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <Router>
      <div className="app">
        {/* Ambient orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">⬡</div>
            <div>
              <div className="brand-name">NationRP</div>
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
            <span>{stats ? `${stats.total_messages?.toLocaleString()} msgs` : "Connexion…"}</span>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <Routes>
            <Route path="/"          element={<Overview  stats={stats} />} />
            <Route path="/channels"  element={<Channels />} />
            <Route path="/messages"  element={<Messages />} />
            <Route path="/members"   element={<Members />} />
            <Route path="/rapports"  element={<Rapports />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
