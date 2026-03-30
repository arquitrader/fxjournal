import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('¡Revisa tu email para confirmar tu cuenta!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contraseña incorrectos.')
      else router.push('/app')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>
              FX<span style={{ color: '#22c55e' }}>Journal</span>
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: 13 }}>Tu diario de trading Forex</p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid #1e2530' }}>
            {['login', 'register'].map(m => (
              <button key={m} className={`nav-btn ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); setError(''); setMessage('') }} style={{ flex: 1, textAlign: 'center' }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <div>
            <label>EMAIL</label>
            <input type="email" placeholder="trader@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

            <label>CONTRASEÑA</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

            {error && <p className="error-msg">{error}</p>}
            {message && <p className="success-msg">{message}</p>}

            <button className="btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }} onClick={handleSubmit} disabled={loading || !email || !password}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta gratis'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#374151', fontSize: 11, marginTop: 20 }}>
          Sin tarjeta de crédito · Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
