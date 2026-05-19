import { useState, useRef } from 'react'
import { Mic, MicOff, Check, X, Keyboard, Camera, Image, UploadCloud } from 'lucide-react'
import { api } from '../api/client'

const LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'en-IN', name: 'English' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'mr-IN', name: 'Marathi' },
]

// Input mode tabs
const INPUT_MODES = [
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'image', label: 'Photo', icon: Camera },
  { id: 'text',  label: 'Text',  icon: Keyboard },
]

function encodeWav(audioBuffer) {
  const numChannels = 1
  const sampleRate = 16000
  const bitsPerSample = 16
  const numFrames = audioBuffer.length

  const buffer = new ArrayBuffer(44 + numFrames * 2)
  const view = new DataView(buffer)

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numFrames * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true)
  view.setUint16(32, numChannels * (bitsPerSample / 8), true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, numFrames * 2, true)

  for (let i = 0; i < numFrames; i++) {
    const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
  }

  return buffer
}

export default function VoiceLogger({ userId }) {
  const [mode, setMode] = useState('idle')
  const [inputMode, setInputMode] = useState('voice')  // 'voice' | 'image' | 'text'
  const [language, setLanguage] = useState('hi-IN')
  const [textInput, setTextInput] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Image-specific state
  const [imagePreview, setImagePreview] = useState(null)  // data URL for <img>
  const [imageBase64, setImageBase64] = useState(null)    // raw base64 (no prefix)
  const [imageMime, setImageMime]     = useState('image/jpeg')
  const cameraInputRef = useRef(null)   // <input capture="environment">
  const galleryInputRef = useRef(null)  // <input type="file">

  const mediaRecorder = useRef(null)
  const audioContext = useRef(null)
  const mediaStream = useRef(null)
  const audioChunks = useRef([])

  // ── Image helpers ──────────────────────────────────────────────────────────

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = file.type || 'image/jpeg'
    setImageMime(mime)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result              // "data:image/jpeg;base64,..."
      setImagePreview(dataUrl)
      const base64 = dataUrl.split(',')[1]          // strip the data-URL prefix
      setImageBase64(base64)
    }
    reader.readAsDataURL(file)
    // Reset the input so the same file can be re-selected
    e.target.value = ''
  }

  async function processImage() {
    if (!imageBase64) return
    setMode('processing')
    setError('')
    try {
      const res = await api.imageLog(imageBase64, userId, imageMime)
      setResult(res)
      setMode('confirm')
    } catch (err) {
      setError(err.message)
      setMode('idle')
    }
  }

  function clearImage() {
    setImagePreview(null)
    setImageBase64(null)
  }

  // ── Voice helpers ──────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
      })
      mediaStream.current = stream
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })

      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = async () => {
        try {
          const blob = new Blob(audioChunks.current, { type: mediaRecorder.current.mimeType })
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer)
          const pcmData = audioBuffer.getChannelData(0)

          // Resample to 16kHz if needed
          let resampled = pcmData
          if (audioBuffer.sampleRate !== 16000) {
            const ratio = 16000 / audioBuffer.sampleRate
            const newLength = Math.round(pcmData.length * ratio)
            resampled = new Float32Array(newLength)
            for (let i = 0; i < newLength; i++) {
              const srcIdx = i / ratio
              const low = Math.floor(srcIdx)
              const high = Math.min(low + 1, pcmData.length - 1)
              const frac = srcIdx - low
              resampled[i] = pcmData[low] * (1 - frac) + pcmData[high] * frac
            }
          }

          const wavBuffer = encodeWav(resampled)

          // Convert to base64 in chunks to avoid call stack overflow
          const bytes = new Uint8Array(wavBuffer)
          let binary = ''
          const chunkSize = 8192
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize)
            binary += String.fromCharCode.apply(null, chunk)
          }
          const base64 = btoa(binary)

          await processVoice(base64)
        } catch (err) {
          setError('Failed to process audio: ' + err.message)
          setMode('idle')
        } finally {
          stream.getTracks().forEach(t => t.stop())
        }
      }

      mediaRecorder.current.start()
      setMode('recording')
      setError('')
    } catch (err) {
      setError('Microphone access denied. Use text input instead.')
      setInputMode('text')
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
      setMode('processing')
    }
  }

  async function processVoice(audioBase64) {
    try {
      const res = await api.voiceLog(audioBase64, userId, language)
      setResult(res)
      setMode('confirm')
    } catch (err) {
      setError(err.message)
      setMode('idle')
    }
  }

  async function processText() {
    if (!textInput.trim()) return
    setMode('processing')
    setError('')
    try {
      const res = await api.textLog(textInput, userId)
      setResult(res)
      setMode('confirm')
    } catch (err) {
      setError(err.message)
      setMode('idle')
    }
  }

  async function confirmMeal() {
    try {
      await api.confirmMeal(result.meal_log_id, userId)
      setMode('done')
      setTimeout(() => {
        setMode('idle')
        setResult(null)
        setTextInput('')
        clearImage()
      }, 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  function reset() {
    setMode('idle')
    setResult(null)
    setError('')
    setTextInput('')
    clearImage()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file inputs for image capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <div className="page-header">
        <h1>Log Food</h1>
      </div>
      <div className="page-content">
        {error && (
          <div className="retro-card" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        {/* ── Idle state ── */}
        {mode === 'idle' && (
          <>
            {/* Input mode tab switcher */}
            <div className="input-mode-tabs">
              {INPUT_MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`input-mode-tab ${inputMode === id ? 'active' : ''}`}
                  onClick={() => setInputMode(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Voice tab ── */}
            {inputMode === 'voice' && (
              <>
                <div className="retro-card">
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
                    Language
                  </label>
                  <select
                    className="retro-input"
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button className="voice-btn" onClick={startRecording}>
                    <Mic size={36} />
                  </button>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Tap to speak what you ate
                  </p>
                </div>
              </>
            )}

            {/* ── Image tab ── */}
            {inputMode === 'image' && (
              <div className="image-capture-section">
                {!imagePreview ? (
                  <div className="image-placeholder">
                    <Image size={48} color="var(--text-muted)" />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.75rem 0' }}>
                      Take or upload a photo of your meal
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="retro-btn retro-btn-primary"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera size={16} /> Camera
                      </button>
                      <button
                        className="retro-btn retro-btn-outline"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <UploadCloud size={16} /> Gallery
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="Food preview"
                      className="image-preview"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        className="retro-btn retro-btn-primary"
                        style={{ flex: 1 }}
                        onClick={processImage}
                      >
                        <Camera size={16} /> Analyse Food
                      </button>
                      <button
                        className="retro-btn retro-btn-outline"
                        onClick={clearImage}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="retro-btn retro-btn-outline"
                        style={{ flex: 1, fontSize: '0.75rem' }}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera size={14} /> Retake
                      </button>
                      <button
                        className="retro-btn retro-btn-outline"
                        style={{ flex: 1, fontSize: '0.75rem' }}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <UploadCloud size={14} /> Different photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Text tab ── */}
            {inputMode === 'text' && (
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  className="retro-input"
                  rows={3}
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="e.g. 2 roti, dal, rice with chicken curry"
                  style={{ resize: 'vertical' }}
                />
                <button
                  className="retro-btn retro-btn-primary"
                  style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
                  onClick={processText}
                >
                  Log Food
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Recording state ── */}
        {mode === 'recording' && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button className="voice-btn recording" onClick={stopRecording}>
              <MicOff size={36} />
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '1rem', color: '#ef4444' }}>
              Recording... Tap to stop
            </p>
          </div>
        )}

        {/* ── Processing state ── */}
        {mode === 'processing' && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Analysing..."
                style={{ width: '100%', maxWidth: 300, borderRadius: 12, border: '2px solid var(--border)', marginBottom: '1rem', opacity: 0.7 }}
              />
            )}
            <div className="loading-dots" style={{ justifyContent: 'center' }}><span /><span /><span /></div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
              {imagePreview ? 'Recognising food in photo...' : 'Analyzing your food...'}
            </p>
          </div>
        )}

        {/* ── Confirmation card ── */}
        {mode === 'confirm' && result && (
          <div className="confirm-card">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Your meal"
                style={{ width: '100%', borderRadius: 8, border: '2px solid var(--border)', marginBottom: '0.75rem', maxHeight: 200, objectFit: 'cover' }}
              />
            )}
            <div className="confirm-header">
              {imagePreview ? '📷 Food detected:' : '✅ You said:'}
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              "{result.translated_text}"
            </p>

            <ul className="food-list">
              {result.food_items.map((item, i) => (
                <li key={i}>
                  <span>{item.name} ({item.quantity} {item.unit})</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {result.nutrition?.per_item?.[i]?.calories || '—'} kcal
                  </span>
                </li>
              ))}
            </ul>

            {result.nutrition?.total && (
              <div className="retro-badge" style={{ marginBottom: '0.75rem' }}>
                Total: {Math.round(result.nutrition.total.calories)} kcal | {Math.round(result.nutrition.total.protein_g)}g P | {Math.round(result.nutrition.total.carbs_g)}g C | {Math.round(result.nutrition.total.fat_g)}g F
              </div>
            )}

            {result.nutrition?.summary && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {result.nutrition.summary}
              </p>
            )}

            <div className="confirm-actions">
              <button className="retro-btn retro-btn-primary" style={{ flex: 1 }} onClick={confirmMeal}>
                <Check size={16} /> Looks good
              </button>
              <button className="retro-btn retro-btn-outline" onClick={reset}>
                <X size={16} /> Redo
              </button>
            </div>
          </div>
        )}

        {/* ── Done state ── */}
        {mode === 'done' && (
          <div className="retro-card" style={{ textAlign: 'center', background: '#f0fdf4' }}>
            <p style={{ fontSize: '1.5rem' }}>🎉</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Meal logged!</p>
          </div>
        )}
      </div>
    </>
  )
}
