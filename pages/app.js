import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const EMOTIONS = ['😤 Ansioso', '😌 Calmado', '😎 Confiado', '😨 Miedoso', '🤑 Codicioso', '🧘 Disciplinado', '😤 Frustrado', '🎯 Enfocado']
const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY']
const DIRECTIONS = ['BUY', 'SELL']

const formatCurrency = (n) => {
  const num = parseFloat(n)
  if (isNaN(num)) return '$0.00'
  return (num >= 0 ? '+' : '') + '$' + Math.abs(num).toFixed(2)
}
const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export default function App() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [filterPair, setFilterPair] = useState('Todos')
  const [filterDir, setFilterDir] = useState('Todos')

  const emptyForm = { date: new Date().toISOString().slice(0, 10), pair: 'EUR/USD', direction: 'BUY', entry: '', exit: '', lots: '', pnl: '', emotion: EMOTIONS[1], notes: '' }
  const [form, setForm] = useState(emptyForm)

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      fetchTrades(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchTrades = async (userId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    if (!error) setTrades(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    setSaving(true)
    const newTrade = {
      user_id: user.id,
      date: form.date,
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry),
      exit: parseFloat(form.exit),
      lots: parseFloat(form.lots),
      pnl: parseFloat(form.pnl) || 0,
      emotion: form.emotion,
      notes: form.notes
    }
    const { data, error } = await supabase.from('trades').insert(newTrade).select()
    if (!error && data) {
      setTrades(prev => [data[0], ...prev])
      setForm(emptyForm)
      setShowForm(false)
      setView('history')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const stats = useMemo(() => {
    const total = trades.reduce((s, t) => s + parseFloat(t.pnl || 0), 0)
    const wins = trades.filter(t => t.pnl > 0).length
    const losses = trades.filter(t => t.pnl <= 0).length
    const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(0) : 0
    const best = trades.length ? Math.max(...trades.map(t => t.pnl)) : 0
    const worst = trades.length ? Math.min(...trades.map(t => t.pnl)) : 0
    return { total, wins, losses, winRate, best, worst, count: trades.length }
  }, [trades])

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (filterPair !== 'Todos' && t.pair !== filterPair) return false
      if (filterDir !== 'Todos' && t.direction !== filterDir) return false
      return true
    })
  }, [trades, filterPair, filterDir])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e', margin: '0 auto 16px' }} />
        <p style={{ color: '#475569', fontSize: 13 }}>Cargando tus trades...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e2530', background: '#0a0c10' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
                FX<span style={{ color: '#22c55e' }}>Journal</span>
              </span>
              <span style={{ fontSize: 10, color: '#374151', border: '1px solid #1e2530', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.1em' }}>BETA</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn-primary" style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => { setView('history'); setShowForm(true) }}>+ Nueva operación</button>
              <button className="btn-ghost" style={{ fontSize: 11, padding: '7px 14px' }} onClick={handleLogout}>Salir</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['dashboard', 'history', 'premium'].map(v => (
              <button key={v} className={`nav-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                {v === 'dashboard' ? 'Dashboard' : v === 'history' ? 'Historial' : '✦ Premium'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Resumen de rendimiento</span>
            </div>
            <p style={{ color: '#475569', fontSize: 13, marginBottom: 28 }}>Todas tus operaciones en un vistazo.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'P&L TOTAL', value: formatCurrency(stats.total), color: stats.total >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'WIN RATE', value: stats.winRate + '%', color: '#f59e0b' },
                { label: 'OPERACIONES', value: stats.count, color: '#e2e8f0' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div className="stat-card">
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', marginBottom: 14 }}>WINS VS LOSSES</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#22c55e' }}>{stats.wins}</div>
                    <div style={{ fontSize: 11, color: '#22c55e66' }}>GANADORAS</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: '#1e2530' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#ef4444' }}>{stats.losses}</div>
                    <div style={{ fontSize: 11, color: '#ef444466' }}>PERDEDORAS</div>
                  </div>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: stats.winRate + '%', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
                </div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', marginBottom: 14 }}>MEJOR / PEOR</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Mejor trade</span>
                    <span className="pnl-pos">{formatCurrency(stats.best)}</span>
                  </div>
                  <div style={{ height: 1, background: '#1e2530' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Peor trade</span>
                    <span className="pnl-neg">{formatCurrency(stats.worst)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', marginBottom: 16 }}>ÚLTIMAS OPERACIONES</div>
              {trades.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <p style={{ color: '#374151', fontSize: 13, marginBottom: 12 }}>Aún no hay operaciones.</p>
                  <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => { setView('history'); setShowForm(true) }}>Registrar primera operación</button>
                </div>
              )}
              {trades.slice(0, 5).map(t => (
                <div key={t.id} className="trade-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="ticker">{t.pair}</span>
                    <span className={t.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.direction}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{formatDate(t.date)}</span>
                  </div>
                  <span className={t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>{formatCurrency(t.pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {view === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>Historial</span>
                <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{filtered.length} operaciones</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={filterPair} onChange={e => setFilterPair(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '7px 12px' }}>
                  <option>Todos</option>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
                <select value={filterDir} onChange={e => setFilterDir(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '7px 12px' }}>
                  <option>Todos</option>
                  <option>BUY</option>
                  <option>SELL</option>
                </select>
              </div>
            </div>

            {showForm && (
              <div className="card" style={{ marginBottom: 20, border: '1px solid #22c55e33' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nueva operación</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div><label>FECHA</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div><label>PAR</label><select value={form.pair} onChange={e => setForm(f => ({ ...f, pair: e.target.value }))}>{PAIRS.map(p => <option key={p}>{p}</option>)}</select></div>
                  <div><label>DIRECCIÓN</label><select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>{DIRECTIONS.map(d => <option key={d}>{d}</option>)}</select></div>
                  <div><label>ENTRADA</label><input type="number" placeholder="1.0820" value={form.entry} onChange={e => setForm(f => ({ ...f, entry: e.target.value }))} /></div>
                  <div><label>SALIDA</label><input type="number" placeholder="1.0875" value={form.exit} onChange={e => setForm(f => ({ ...f, exit: e.target.value }))} /></div>
                  <div><label>LOTES</label><input type="number" placeholder="0.10" value={form.lots} onChange={e => setForm(f => ({ ...f, lots: e.target.value }))} /></div>
                  <div><label>P&L ($)</label><input type="number" placeholder="+27.50" value={form.pnl} onChange={e => setForm(f => ({ ...f, pnl: e.target.value }))} /></div>
                  <div><label>ESTADO EMOCIONAL</label><select value={form.emotion} onChange={e => setForm(f => ({ ...f, emotion: e.target.value }))}>{EMOTIONS.map(em => <option key={em}>{em}</option>)}</select></div>
                </div>
                <div style={{ marginTop: 4 }}><label>NOTAS</label><textarea rows={2} placeholder="¿Qué ocurrió? ¿Qué aprendiste?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Guardando...' : 'Guardar operación'}</button>
                  <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {!showForm && (
              <button className="btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowForm(true)}>+ Nueva operación</button>
            )}

            <div className="card">
              {filtered.length === 0 && <p style={{ color: '#374151', fontSize: 13, textAlign: 'center', padding: 30 }}>No hay operaciones con estos filtros.</p>}
              {filtered.map(t => (
                <div key={t.id} className="trade-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="ticker">{t.pair}</span>
                      <span className={t.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.direction}</span>
                      <span style={{ fontSize: 11, color: '#475569' }}>{formatDate(t.date)}</span>
                      <span style={{ fontSize: 13 }}>{t.emotion}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className={t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'} style={{ fontSize: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{formatCurrency(t.pnl)}</span>
                      <button className="del-btn" onClick={() => handleDelete(t.id)}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    {[['IN', t.entry], ['OUT', t.exit], ['LOTES', t.lots]].map(([lbl, val]) => (
                      <div key={lbl} style={{ fontSize: 11 }}>
                        <span style={{ color: '#374151' }}>{lbl} </span>
                        <span style={{ color: '#94a3b8' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {t.notes && <p style={{ marginTop: 8, fontSize: 12, color: '#64748b', borderLeft: '2px solid #1e2530', paddingLeft: 10 }}>{t.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PREMIUM */}
        {view === 'premium' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 11, color: '#22c55e', letterSpacing: '0.2em', marginBottom: 8 }}>DESBLOQUEA TU POTENCIAL</div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>Pasa a <span style={{ color: '#22c55e' }}>FXJournal Pro</span></span>
              <p style={{ color: '#475569', marginTop: 10, fontSize: 14 }}>Análisis avanzado para traders serios.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
              {[
                { icon: '📊', title: 'Gráficos avanzados', desc: 'Curva de equity, distribución por par y mucho más.' },
                { icon: '🧠', title: 'Análisis de emociones', desc: 'Correlación entre estado emocional y resultados.' },
                { icon: '📅', title: 'Calendario de rendimiento', desc: 'Visualiza tus mejores y peores días del mes.' },
                { icon: '📤', title: 'Exportar a Excel / PDF', desc: 'Comparte tu historial con tu broker o mentor.' },
                { icon: '🔔', title: 'Alertas de racha', desc: 'Notificaciones si entras en racha perdedora.' },
                { icon: '🤖', title: 'IA Coach (próximamente)', desc: 'Retroalimentación personalizada basada en tus datos.' },
              ].map(f => (
                <div key={f.title} className="premium-card">
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="card" style={{ display: 'inline-block', padding: '32px 48px', border: '1px solid #22c55e33' }}>
                <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em', marginBottom: 8 }}>PLAN PRO</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 38, fontWeight: 800, color: '#22c55e' }}>$5<span style={{ fontSize: 16, color: '#475569' }}>/mes</span></div>
                  <div style={{ textDecoration: 'line-through', color: '#374151', fontSize: 18 }}>$9</div>
                </div>
                <div style={{ display: 'inline-block', background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 6, padding: '3px 12px', fontSize: 11, color: '#22c55e', letterSpacing: '0.08em', marginBottom: 6 }}>15 DÍAS GRATIS · LUEGO $5/MES</div>
                <div style={{ fontSize: 12, color: '#374151', marginBottom: 20 }}>Cancela cuando quieras</div>
                <button className="btn-primary" style={{ width: '100%', fontSize: 14, padding: '12px 24px' }}>Comenzar prueba gratis 15 días</button>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 12 }}>Sin tarjeta de crédito requerida</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
