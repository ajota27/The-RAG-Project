import { useState } from 'react'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    try {
      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Credenciales inválidas')
      }

      const data = await res.json()
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>RAG Pro</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Inicia sesión para continuar</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input 
              type="text" 
              className="chat-input login-input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              className="chat-input login-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="login-error">{error}</p>}
          
          <button className="new-chat-btn login-btn" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: Usa ajota1427 para admin o user_1 para usuario regular.
        </div>
      </div>
    </div>
  )
}

export default Login
