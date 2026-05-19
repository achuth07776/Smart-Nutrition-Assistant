import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Flame, Drumstick, Wheat, Droplets } from 'lucide-react'
import { api } from '../api/client'

function ProgressRing({ value, max, size = 160, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border-light)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--primary)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-text">
        <div className="value">{Math.round(value)}</div>
        <div className="label">/ {max} kcal</div>
      </div>
    </div>
  )
}

function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="macro-bar">
      <div className="macro-value">{Math.round(value)}g</div>
      <div className="macro-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function MealCard({ meal }) {
  const icons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' }
  const calories = meal.nutrition_data?.total?.calories || 0
  const items = meal.food_items || []
  const name = items.map(i => i.name).join(', ') || 'Meal'
  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="meal-card">
      <div className="meal-icon">{icons[meal.meal_type] || '🍽️'}</div>
      <div className="meal-info">
        <div className="meal-name">{name}</div>
        <div className="meal-time">{time} • {meal.meal_type}</div>
      </div>
      <div className="meal-calories">{Math.round(calories)} kcal</div>
    </div>
  )
}

export default function Dashboard({ userId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    )
  }

  const summary = data?.daily_summary || {}
  const meals = data?.recent_meals || []
  const target = data?.calorie_target || 2000

  return (
    <>
      <div className="page-header">
        <h1>🥗 NutriVoice</h1>
      </div>
      <div className="page-content">
        <div className="retro-card" style={{ textAlign: 'center' }}>
          <ProgressRing value={summary.total_calories || 0} max={target} />
          <div className="macro-bar-container" style={{ marginTop: '1.25rem' }}>
            <MacroBar label="Protein" value={summary.total_protein_g || 0} max={120} color="#ef4444" />
            <MacroBar label="Carbs" value={summary.total_carbs_g || 0} max={300} color="#3b82f6" />
            <MacroBar label="Fat" value={summary.total_fat_g || 0} max={80} color="#f59e0b" />
          </div>
        </div>

        <button className="voice-btn" onClick={() => navigate('/log')}>
          <Camera size={32} />
        </button>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
          Log food (voice, photo, or text)
        </p>

        {meals.length > 0 && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Recent Meals</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {meals.slice(0, 5).map(meal => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
