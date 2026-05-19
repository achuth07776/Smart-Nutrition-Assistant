import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Home, MessageCircle, Clock, User, Camera } from 'lucide-react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Chat from './components/Chat'
import VoiceLogger from './components/VoiceLogger'
import History from './components/History'
import Profile from './components/Profile'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('nutrivoice_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('nutrivoice_user')
      }
    }
  }, [])

  function handleLogin(userData) {
    setUser(userData)
  }

  function handleLogout() {
    localStorage.removeItem('nutrivoice_user')
    setUser(null)
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />
  }

  const userId = user.user_id

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard userId={userId} />} />
          <Route path="/chat" element={<Chat userId={userId} />} />
          <Route path="/log" element={<VoiceLogger userId={userId} />} />
          <Route path="/history" element={<History userId={userId} />} />
          <Route path="/profile" element={<Profile userId={userId} userName={user.name} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageCircle size={20} />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/log" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Camera size={20} />
            <span>Log</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Clock size={20} />
            <span>History</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  )
}
