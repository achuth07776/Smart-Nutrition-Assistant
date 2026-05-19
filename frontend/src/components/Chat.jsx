import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { api } from '../api/client'

const SUGGESTIONS = [
  "Am I hitting my protein goal?",
  "What are good iron-rich foods?",
  "How much fiber should I eat daily?",
  "What should I eat next?",
]

export default function Chat({ userId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm NutriVoice 🥗 Ask me anything about nutrition — I'll pull answers from your textbook and track your daily intake." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    if (!text.trim()) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.filter(m => m.role !== 'system').slice(-10)
      const res = await api.chat(text, userId, history)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      <div className="page-header">
        <h1>💬 Chat</h1>
      </div>
      <div className="page-content">
        <div className="chip-container">
          {SUGGESTIONS.map(s => (
            <button key={s} className="chip" onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>

        <div className="chat-container">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant">
              <div className="loading-dots"><span /><span /><span /></div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          <input
            className="retro-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about nutrition..."
            disabled={loading}
          />
          <button type="submit" className="retro-btn retro-btn-primary" disabled={loading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  )
}
