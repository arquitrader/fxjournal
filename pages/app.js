import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const EMOTIONS = ['😤 Ansioso', '😌 Calmado', '😎 Confiado', '😨 Miedoso', '🤑 Codicioso', '🧘 Disciplinado', '😤 Frustrado', '🎯 Enfocado']
const PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY']
const DIRECTIONS = ['BUY', 'SELL']

const formatCurrency = (n) => {
  const num = parseFloat(n)
  if (isNaN(num)) return '$0.00'
  return (num >= 0 ? '+' : '-') + '$' + Math.abs(num).toFixed(2)
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

  const emptyForm = { date: new Date().toISOString().slice(0, 10), pair: 'XAU/USD', direction: 'BUY', entry: '', exit: '', lots: '', pnl: '', emotion: EMOTIONS[1], notes: '' }
  const [form, setForm] = useState(emptyForm)

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
      .order('created_at', { ascending: false })
    if (!error) setTrades(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.entry || !form.lots) return alert('Llena los campos básicos')
    setSaving(true)
    
    const newTrade = {
      user_id: user.id,
      date: form.date,
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry),
      exit: parseFloat(form.exit) || 0,
      lots: parseFloat(form.lots),
      pnl: parseFloat(form.pnl) || 0,
      emotion: form.emotion,
      notes: form.notes
    }

    const { data, error } = await supabase.from('trades').insert([newTrade]).select()
    
    if (error) {
      console.error(error)
      alert('Error al guardar: ' + error.message)
    } else if (data) {
      setTrades(prev => [data[0], ...prev])
      setForm(emptyForm)
      setShowForm(false)
      setView('history')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (!error) setTrades(prev => prev.filter(t => t.id !== id))
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

  if (loading) return <div style={{color: 'white', textAlign: 'center', marginTop: '20%'}}>Cargando...</div>

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

{/* SECCIÓN PREMIUM CON LÓGICA DE 15 DÍAS GRATIS */}
        {view === 'premium' && (() => {
          const createdDate = new Date(user?.created_at);
          const now = new Date();
          const diffDays = Math.ceil(Math.abs(now - createdDate) / (1000 * 60 * 60 * 24));
          const isPremium = user?.id === 'b3f9b73f-3485-46ec-bc3f-fa2239ace878' || diffDays <= 15;

          return isPremium ? (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              <div style={{ marginBottom: 24, padding: '16px', background: 'linear-gradient(90deg, #22c55e22, transparent)', borderLeft: '4px solid #22c55e', borderRadius: '4px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                  {user?.id === 'b3f9b73f-3485-46ec-bc3f-fa2239ace878' ? 'Panel de Control Pro' : 'Prueba Gratuita Activa'}
                </h2>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {user?.id === 'b3f9b73f-3485-46ec-bc3f-fa2239ace878' ? 'Acceso de Administrador' : `Te quedan ${15 - diffDays} días de prueba.`}
                </p>
              </div>

              {/* Métricas Reales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
                <div className="stat-card">
                  <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>PROFIT FACTOR</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
                    {stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : stats.wins}
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>EXPECTATIVA (AVG)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>
                    {formatCurrency(stats.count > 0 ? stats.total / stats.count : 0)}
                  </div>
                </div>
              </div>

              {/* Análisis de Emociones Reales */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 16 }}>PSICOLOGÍA DEL TRADER (REAL)</div>
                {EMOTIONS.map(emo => {
                  const emoTrades = trades.filter(t => t.emotion === emo);
                  const winRate = emoTrades.length ? ((emoTrades.filter(t => t.pnl > 0).length / emoTrades.length) * 100).toFixed(0) : 0;
                  return (
                    <div key={emo} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span>{emo}</span>
                        <span style={{ color: '#94a3b8' }}>{winRate}% Win Rate</span>
                      </div>
                      <div style={{ height: 4, background: '#1e2530', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${winRate}%`, background: '#22c55e', borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Próximas Funciones (Los Iconos) */}
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 16, letterSpacing: '0.1em' }}>PRÓXIMAS HERRAMIENTAS PRO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: '📅', title: 'Calendario', desc: 'Rendimiento diario.' },
                  { icon: '📤', title: 'Exportar', desc: 'Descarga tu historial.' },
                  { icon: '🔔', title: 'Alertas', desc: 'Rachas perdedoras.' },
                  { icon: '🤖', title: 'IA Coach', desc: 'Análisis inteligente.' },
                ].map(f => (
                  <div key={f.title} className="premium-card" style={{ padding: '12px' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* VISTA DE PAGO (PARA CUANDO EXPIRE LA PRUEBA) */
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 20 }}>⌛</div>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Prueba Expirada</h2>
              <p style={{ color: '#475569', marginBottom: 24 }}>Activa FXJournal Pro para recuperar tus métricas avanzadas.</p>
              <div className="card" style={{ display: 'inline-block', padding: '32px', border: '1px solid #22c55e33' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>$5<span style={{ fontSize: 14, color: '#475569' }}>/mes</span></div>
                <button className="btn-primary" style={{ width: '100%', marginTop: 20 }}>Activar Acceso Pro</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  )
}