import { useState } from 'react'
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react'
import { api } from '../api/client'

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let result
      if (mode === 'login') {
        result = await api.login(email, password)
      } else {
        result = await api.signup(email, password, name)
      }
      localStorage.setItem('nutrivoice_user', JSON.stringify(result))
      onLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container" style={{ justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          🥗 NutriVoice
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Your AI nutrition companion
        </p>
      </div>

      <div className="retro-card">
        <div style={{ display: 'flex', marginBottom: '1.5rem', gap: '0.5rem' }}>
          <button
            className={`retro-btn ${mode === 'login' ? 'retro-btn-primary' : 'retro-btn-outline'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { setMode('login'); setError('') }}
            type="button"
          >
            <LogIn size={16} /> Login
          </button>
          <button
            className={`retro-btn ${mode === 'signup' ? 'retro-btn-primary' : 'retro-btn-outline'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { setMode('signup'); setError('') }}
            type="button"
          >
            <UserPlus size={16} /> Sign Up
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <User size={14} /> Name
              </label>
              <input
                className="retro-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <Mail size={14} /> Email
            </label>
            <input
              className="retro-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <Lock size={14} /> Password
            </label>
            <input
              className="retro-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="retro-btn retro-btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
