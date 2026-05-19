import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function History({ userId }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getHistory(userId)
      .then(res => setMeals(res.meals || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const grouped = meals.reduce((acc, meal) => {
    const date = new Date(meal.logged_at).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(meal)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1>📅 History</h1>
      </div>
      <div className="page-content">
        {Object.keys(grouped).length === 0 ? (
          <div className="retro-card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No meals logged yet. Start by logging your first meal!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayMeals]) => {
            const dayTotal = dayMeals.reduce((sum, m) => sum + (m.nutrition_data?.total?.calories || 0), 0)
            return (
              <div key={date}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{date}</h3>
                  <span className="retro-badge">{Math.round(dayTotal)} kcal</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {dayMeals.map(meal => {
                    const items = meal.food_items || []
                    const name = items.map(i => i.name).join(', ') || 'Meal'
                    const cal = meal.nutrition_data?.total?.calories || 0
                    const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const icons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' }

                    return (
                      <div key={meal.id} className="meal-card">
                        <div className="meal-icon">{icons[meal.meal_type] || '🍽️'}</div>
                        <div className="meal-info">
                          <div className="meal-name">{name}</div>
                          <div className="meal-time">{time} • {meal.meal_type}</div>
                        </div>
                        <div className="meal-calories">{Math.round(cal)} kcal</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
