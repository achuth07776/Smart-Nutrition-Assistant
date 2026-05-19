import { useState, useEffect } from 'react'
import { Save, LogOut } from 'lucide-react'
import { api } from '../api/client'

export default function Profile({ userId, userName, onLogout }) {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    weight_kg: '',
    height_cm: '',
    activity_level: 'moderate',
    dietary_goal: 'balanced',
    preferred_language: 'en',
    daily_calorie_target: 2000,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getProfile(userId)
      .then(res => {
        if (res.profile && Object.keys(res.profile).length > 0) {
          setProfile(prev => ({ ...prev, ...res.profile }))
        }
      })
      .catch(console.error)
  }, [userId])

  async function handleSave() {
    setSaving(true)
    try {
      const data = { ...profile, user_id: userId }
      Object.keys(data).forEach(k => {
        if (data[k] === '') data[k] = null
      })
      if (data.age) data.age = parseInt(data.age)
      if (data.weight_kg) data.weight_kg = parseFloat(data.weight_kg)
      if (data.height_cm) data.height_cm = parseFloat(data.height_cm)
      if (data.daily_calorie_target) data.daily_calorie_target = parseInt(data.daily_calorie_target)

      await api.updateProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function update(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <div className="page-header">
        <h1>👤 Profile</h1>
      </div>
      <div className="page-content">
        <div className="retro-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Name</label>
              <input className="retro-input" value={profile.name || ''} onChange={e => update('name', e.target.value)} placeholder="Your name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Age</label>
                <input className="retro-input" type="number" value={profile.age || ''} onChange={e => update('age', e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Weight (kg)</label>
                <input className="retro-input" type="number" value={profile.weight_kg || ''} onChange={e => update('weight_kg', e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Height (cm)</label>
                <input className="retro-input" type="number" value={profile.height_cm || ''} onChange={e => update('height_cm', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Activity Level</label>
              <select className="retro-input" value={profile.activity_level} onChange={e => update('activity_level', e.target.value)}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Dietary Goal</label>
              <select className="retro-input" value={profile.dietary_goal} onChange={e => update('dietary_goal', e.target.value)}>
                <option value="balanced">Balanced</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Daily Calorie Target</label>
              <input className="retro-input" type="number" value={profile.daily_calorie_target || 2000} onChange={e => update('daily_calorie_target', e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Preferred Language</label>
              <select className="retro-input" value={profile.preferred_language} onChange={e => update('preferred_language', e.target.value)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="bn">Bengali</option>
                <option value="mr">Marathi</option>
              </select>
            </div>
          </div>
        </div>

        <button className="retro-btn retro-btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>

        <button className="retro-btn retro-btn-danger" onClick={onLogout} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </>
  )
}
