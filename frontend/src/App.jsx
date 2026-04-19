import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Login from './Login'

function App() {
  const [user, setUser] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [documents, setDocuments] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef(null)

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('rag_pro_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  // Cargar datos cuando el usuario cambie o se loguee
  useEffect(() => {
    if (user) {
      fetchSessions()
      fetchDocuments()
    } else {
      setSessions([])
      setDocuments([])
      setMessages([])
      setActiveSession(null)
    }
  }, [user])

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getHeaders = () => ({
    'Authorization': `Bearer ${user?.access_token}`,
    'Content-Type': 'application/json'
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('rag_pro_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('rag_pro_user')
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:8000/sessions', {
        headers: getHeaders()
      })
      if (res.status === 401) return handleLogout()
      const data = await res.json()
      setSessions(data)
    } catch (err) { console.error("Error fetching sessions", err) }
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/documents', {
        headers: getHeaders()
      })
      const data = await res.json()
      setDocuments(data.documents)
    } catch (err) { console.error("Error fetching documents", err) }
  }

  const selectSession = async (sessionId) => {
    setActiveSession(sessionId)
    try {
      const res = await fetch(`http://localhost:8000/sessions/${sessionId}/messages`, {
        headers: getHeaders()
      })
      const data = await res.json()
      setMessages(data)
    } catch (err) { console.error("Error loading messages", err) }
  }

  const createNewChat = () => {
    setActiveSession("NEW_TEMPORARY_CHAT")
    setMessages([])
    setInput('')
  }

  const deleteChat = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await fetch(`http://localhost:8000/sessions/${sessionId}`, { 
        method: 'DELETE',
        headers: getHeaders()
      })
      if (activeSession === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
      fetchSessions()
    } catch (err) { console.error("Error deleting chat", err) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:8000/upload', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${user.access_token}` },
        body: formData 
      })
      if (res.ok) fetchDocuments()
      else {
        const errData = await res.json()
        alert(errData.detail || "Error al subir")
      }
    } catch (err) { console.error("Upload error", err) }
    finally { setUploading(false) }
  }

  const deleteDocument = async (filename) => {
    try {
      await fetch(`http://localhost:8000/documents/${filename}`, { 
        method: 'DELETE',
        headers: getHeaders()
      })
      fetchDocuments()
    } catch (err) { console.error("Delete doc error", err) }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    // Ya no bloqueamos si activeSession es null, solo si el input está vacío o está cargando
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    let currentSessionId = activeSession

    try {
      // 1. Si es un chat nuevo (o no hay sesión seleccionada), creamos la sesión
      if (!currentSessionId || currentSessionId === "NEW_TEMPORARY_CHAT") {
        const sessRes = await fetch('http://localhost:8000/sessions', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ title: "Iniciando..." })
        })
        const sessData = await sessRes.json()
        currentSessionId = sessData.session_id
        setActiveSession(currentSessionId)
        fetchSessions() // Refrescar lista de chats en la sidebar
      }

      // 2. Enviar el mensaje al chat
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ session_id: currentSessionId, message: userMessage })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      
      if (data.new_title) {
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId ? { ...s, title: data.new_title } : s
        ))
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: No se pudo obtener respuesta." }])
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <span>👤 <strong>{user.username}</strong> ({user.role})</span>
            <button className="logout-btn" onClick={handleLogout}>Salir</button>
          </div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>RAG Pro</h2>
          <button className="new-chat-btn" onClick={createNewChat}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Chat
          </button>
        </div>

        <div className="list-container">
          <h3 className="section-title">Mis Chats</h3>
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`list-item ${activeSession === s.id ? 'active' : ''}`}
              onClick={() => selectSession(s.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </span>
              <button className="delete-icon" onClick={(e) => deleteChat(e, s.id)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="list-container">
          <h3 className="section-title">Documentos ({documents.length})</h3>
          {documents.map(doc => (
            <div key={doc} className="list-item">
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{doc}</span>
              {user.role === 'admin' && (
                <button className="delete-icon" onClick={() => deleteDocument(doc)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {user.role === 'admin' ? (
            <label className="upload-mini">
              {uploading ? 'Subiendo...' : '+ Subir PDF'}
              <input type="file" hidden accept=".pdf" onChange={handleUpload} disabled={uploading} />
            </label>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Solo administradores pueden subir documentos.
            </p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', marginTop: '10%', color: 'var(--text-muted)' }}>
              <h3>¡Hola {user.username}!</h3>
              <p>Selecciona un chat o crea uno nuevo para empezar a analizar documentos.</p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`message ${m.role}`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="dots-loader">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <form className="input-wrapper" onSubmit={sendMessage}>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Haz una pregunta o inicia un chat..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="send-btn" type="submit" disabled={!input.trim() || loading}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default App
