'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPublicApiBase } from '@/lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Stats {
  users: { total: number; workers: number; clients: number; recent_7d: number }
  demands: { total: number; pending: number; taken: number; completed: number; cancelled: number; today: number; week: number }
  revenue: { total: number; week: number }
  categories: number
}

interface Transaction {
  id: number
  mp_payment_id: string
  event_type: 'service_payment' | 'boost' | 'credits'
  external_reference: string
  mp_status: string
  result: string
  amount_clp?: number
  created_at: string
}

interface WaitlistEntry {
  id: number
  email: string
  phone: string | null
  lat: number | null
  lng: number | null
  notified: boolean
  created_at: string
}

interface Demand {
  id: number
  description: string
  status: string
  offered_price: number
  urgency: string
  created_at: string
  client?: { name: string; nickname: string | null }
  category?: { display_name: string; color: string }
}

interface Category {
  id: number
  display_name: string
  color: string
  workers_count: number
  service_requests_count: number
}

interface ActiveWorker {
  id: number
  availability_status: string
  lat: number
  lng: number
  updated_at: string
  user?: { name: string; phone: string | null }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat('es-CL').format(n) }
function fmtClp(n?: number) { return n != null ? `$${fmt(Math.round(n))}` : '—' }
function ago(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

const EVENT_LABEL: Record<string, string> = {
  service_payment: '💳 Servicio',
  boost: '⚡ Boost',
  credits: '🪙 Créditos',
}

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-green-500/20 text-green-400',
  authorized: 'bg-blue-500/20 text-blue-400',
  rejected: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
}

const DEMAND_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  taken: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'transactions' | 'demands' | 'workers' | 'waitlist' | 'new-demand'>('overview')

  // Data states
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<{ total: number; approved_today: number; data: Transaction[] } | null>(null)
  const [demands, setDemands] = useState<Demand[]>([])
  const [demandsFilter, setDemandsFilter] = useState('pending')
  const [waitlist, setWaitlist] = useState<{ total: number; not_notified: number; data: WaitlistEntry[] } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeWorkers, setActiveWorkers] = useState<{ active_count: number; intermediate_count: number; data: ActiveWorker[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // New demand form
  const [newDemand, setNewDemand] = useState({ description: '', category_id: '', offered_price: '', lat: '-37.6672', lng: '-72.5730', client_name: '', client_phone: '', urgency: 'normal' })
  const [newDemandResult, setNewDemandResult] = useState<string | null>(null)
  const [newDemandLoading, setNewDemandLoading] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('auth_token') || localStorage.getItem('token')
    setToken(t)
  }, [])

  const api = useCallback(async (path: string, opts: RequestInit = {}) => {
    if (!token) return null
    const res = await fetch(`${getPublicApiBase()}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.message ?? `HTTP ${res.status}`)
    }
    return res.json()
  }, [token])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const [s, cats] = await Promise.all([
        api('/api/v1/admin/stats'),
        api('/api/v1/admin/categories'),
      ])
      setStats(s)
      setCategories(cats ?? [])
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try { setTransactions(await api('/api/v1/admin/transactions')) }
    catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api])

  const loadDemands = useCallback(async (status = demandsFilter) => {
    setLoading(true)
    try {
      const d = await api(`/api/v1/admin/demands?status=${status}`)
      setDemands(d?.data ?? [])
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api, demandsFilter])

  const loadWaitlist = useCallback(async () => {
    setLoading(true)
    try { setWaitlist(await api('/api/v1/admin/waitlist')) }
    catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api])

  const loadActiveWorkers = useCallback(async () => {
    setLoading(true)
    try { setActiveWorkers(await api('/api/v1/admin/active-workers')) }
    catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api])

  useEffect(() => {
    if (!token) return
    if (tab === 'overview') loadStats()
    if (tab === 'transactions') loadTransactions()
    if (tab === 'demands') loadDemands()
    if (tab === 'waitlist') loadWaitlist()
    if (tab === 'workers') loadActiveWorkers()
    if (tab === 'new-demand') { loadStats() }
  }, [tab, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelDemand = async (id: number) => {
    if (!confirm(`¿Cancelar demanda #${id}?`)) return
    try {
      await api(`/api/v1/admin/demands/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelado por admin' }) })
      loadDemands()
    } catch (e: any) { alert(e.message) }
  }

  const handleBoostDemand = async (id: number) => {
    try {
      await api(`/api/v1/admin/demands/${id}/boost`, { method: 'POST', body: JSON.stringify({ hours: 24 }) })
      alert(`✅ Demanda #${id} destacada 24h`)
      loadDemands()
    } catch (e: any) { alert(e.message) }
  }

  const handleCreateDemand = async () => {
    setNewDemandLoading(true)
    setNewDemandResult(null)
    try {
      const res = await api('/api/v1/admin/demands/create-for-client', {
        method: 'POST',
        body: JSON.stringify({
          ...newDemand,
          category_id: parseInt(newDemand.category_id),
          offered_price: newDemand.offered_price ? parseFloat(newDemand.offered_price) : 0,
          lat: parseFloat(newDemand.lat),
          lng: parseFloat(newDemand.lng),
        }),
      })
      setNewDemandResult(`✅ ${res.message}`)
      setNewDemand(prev => ({ ...prev, description: '', client_name: '', client_phone: '', offered_price: '' }))
    } catch (e: any) {
      setNewDemandResult(`❌ ${e.message}`)
    }
    setNewDemandLoading(false)
  }

  if (!token) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <p>Debes iniciar sesión en la app primero.</p>
    </div>
  )

  const tabs = [
    { id: 'overview', label: '📊 Resumen' },
    { id: 'transactions', label: '💳 Pagos' },
    { id: 'demands', label: '📋 Demandas' },
    { id: 'workers', label: '👷 Workers' },
    { id: 'waitlist', label: '⏳ Lista espera' },
    { id: 'new-demand', label: '✍️ Crear demanda' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-amber-400">JobsHours Admin</h1>
          <p className="text-xs text-gray-400">Panel de control del fundador</p>
        </div>
        <button onClick={() => { if (tab === 'overview') loadStats(); else if (tab === 'transactions') loadTransactions(); else if (tab === 'demands') loadDemands(); else if (tab === 'waitlist') loadWaitlist(); else if (tab === 'workers') loadActiveWorkers() }} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5">
          {loading ? '⏳' : '↻ Refrescar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white ml-2">×</button>
        </div>
      )}

      <div className="p-4 max-w-6xl mx-auto">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Usuarios total', value: stats.users.total, sub: `+${stats.users.recent_7d} esta semana` },
                { label: 'Workers activos', value: stats.users.workers, sub: 'tipo worker' },
                { label: 'Demandas hoy', value: stats.demands.today, sub: `${stats.demands.week} esta semana` },
                { label: 'Completadas total', value: stats.demands.completed, sub: `Ingresos: ${fmtClp(stats.revenue.total)}` },
              ].map(k => (
                <div key={k.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <p className="text-gray-400 text-xs mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-white">{fmt(k.value)}</p>
                  <p className="text-gray-500 text-xs mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Estado demandas */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Estado de demandas</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { label: 'Pendientes', value: stats.demands.pending, color: 'text-yellow-400' },
                  { label: 'Tomadas', value: stats.demands.taken, color: 'text-blue-400' },
                  { label: 'Completadas', value: stats.demands.completed, color: 'text-green-400' },
                  { label: 'Canceladas', value: stats.demands.cancelled, color: 'text-red-400' },
                  { label: 'Total', value: stats.demands.total, color: 'text-white' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{fmt(s.value)}</p>
                    <p className="text-gray-500 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top categorías */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Top categorías</h3>
              <div className="space-y-2">
                {categories.sort((a, b) => b.workers_count - a.workers_count).slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.color }} />
                      <span className="text-sm text-gray-300">{c.display_name}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>👷 {c.workers_count}</span>
                      <span>📋 {c.service_requests_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === 'transactions' && transactions && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">Total procesados</p>
                <p className="text-2xl font-bold">{transactions.total}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">Aprobados hoy</p>
                <p className="text-2xl font-bold text-green-400">{transactions.approved_today}</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs">
                      <th className="px-4 py-2.5 text-left">Tipo</th>
                      <th className="px-4 py-2.5 text-left">MP ID</th>
                      <th className="px-4 py-2.5 text-left">Estado</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                      <th className="px-4 py-2.5 text-right">Hace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.data.map(t => (
                      <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2.5">{EVENT_LABEL[t.event_type] ?? t.event_type}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{t.mp_payment_id.slice(-8)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[t.mp_status] ?? 'bg-gray-700 text-gray-300'}`}>
                            {t.mp_status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmtClp(t.amount_clp)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{ago(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DEMANDS ── */}
        {tab === 'demands' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['pending', 'taken', 'in_progress', 'completed', 'cancelled'].map(s => (
                <button key={s} onClick={() => { setDemandsFilter(s); loadDemands(s) }} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${demandsFilter === s ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {demands.map(d => (
                <div key={d.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">#{d.id}</span>
                        {d.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: d.category.color + '33', color: d.category.color }}>
                            {d.category.display_name}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${DEMAND_STATUS_BADGE[d.status] ?? 'bg-gray-700 text-gray-300'}`}>
                          {d.status}
                        </span>
                        {d.urgency === 'urgent' && <span className="text-xs text-red-400">🔴 urgente</span>}
                      </div>
                      <p className="text-sm text-gray-200 line-clamp-2">{d.description}</p>
                      {d.client && <p className="text-xs text-gray-500 mt-1">Cliente: {d.client.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-400">{fmtClp(d.offered_price)}</p>
                      <p className="text-xs text-gray-500">{ago(d.created_at)}</p>
                    </div>
                  </div>
                  {['pending', 'taken', 'in_progress'].includes(d.status) && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleBoostDemand(d.id)} className="text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30">
                        ⚡ Boost 24h
                      </button>
                      <button onClick={() => handleCancelDemand(d.id)} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {demands.length === 0 && !loading && (
                <p className="text-center text-gray-500 py-8">Sin demandas con estado "{demandsFilter}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── WORKERS ── */}
        {tab === 'workers' && activeWorkers && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">Activos ahora</p>
                <p className="text-2xl font-bold text-green-400">{activeWorkers.active_count}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">En escucha</p>
                <p className="text-2xl font-bold text-blue-400">{activeWorkers.intermediate_count}</p>
              </div>
            </div>
            <div className="space-y-2">
              {activeWorkers.data.map(w => (
                <div key={w.id} className="bg-gray-900 rounded-xl p-3 border border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{w.user?.name ?? `Worker #${w.id}`}</p>
                    {w.user?.phone && <p className="text-xs text-gray-500">{w.user.phone}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">{w.availability_status}</span>
                    <p className="text-xs text-gray-500 mt-1">{ago(w.updated_at)}</p>
                  </div>
                </div>
              ))}
              {activeWorkers.data.length === 0 && <p className="text-center text-gray-500 py-8">Sin workers activos ahora mismo</p>}
            </div>
          </div>
        )}

        {/* ── WAITLIST ── */}
        {tab === 'waitlist' && waitlist && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">En lista de espera</p>
                <p className="text-2xl font-bold">{waitlist.total}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs">Sin notificar</p>
                <p className="text-2xl font-bold text-amber-400">{waitlist.not_notified}</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    <th className="px-4 py-2.5 text-left">Email</th>
                    <th className="px-4 py-2.5 text-left">Teléfono</th>
                    <th className="px-4 py-2.5 text-left">Estado</th>
                    <th className="px-4 py-2.5 text-right">Hace</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.data.map(e => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2.5 text-gray-200">{e.email}</td>
                      <td className="px-4 py-2.5 text-gray-400">{e.phone ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${e.notified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {e.notified ? 'Notificado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{ago(e.created_at)}</td>
                    </tr>
                  ))}
                  {waitlist.data.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nadie en lista aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CREAR DEMANDA ── */}
        {tab === 'new-demand' && (
          <div className="max-w-lg space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-amber-300 text-sm font-medium">Modo fundador intermediario</p>
              <p className="text-amber-200/70 text-xs mt-0.5">Crea la demanda en nombre del cliente. Luego avísale por WhatsApp que ya está publicada.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 text-xs mb-1 block">Descripción del trabajo *</label>
                <textarea
                  value={newDemand.description}
                  onChange={e => setNewDemand(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Ej: Necesito un gasfiter para cambiar llave de agua en baño..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-xs mb-1 block">Categoría *</label>
                <select
                  value={newDemand.category_id}
                  onChange={e => setNewDemand(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="">— Selecciona —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">Precio ofrecido (CLP)</label>
                  <input type="number" value={newDemand.offered_price} onChange={e => setNewDemand(p => ({ ...p, offered_price: e.target.value }))} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">Urgencia</label>
                  <select value={newDemand.urgency} onChange={e => setNewDemand(p => ({ ...p, urgency: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="normal">Normal</option>
                    <option value="urgent">🔴 Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">Lat *</label>
                  <input type="number" value={newDemand.lat} onChange={e => setNewDemand(p => ({ ...p, lat: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-gray-300 text-xs mb-1 block">Lng *</label>
                  <input type="number" value={newDemand.lng} onChange={e => setNewDemand(p => ({ ...p, lng: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3">
                <p className="text-gray-400 text-xs mb-2">Datos del cliente real (opcional, para recordar)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">Nombre cliente</label>
                    <input type="text" value={newDemand.client_name} onChange={e => setNewDemand(p => ({ ...p, client_name: e.target.value }))} placeholder="Juan Pérez" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">WhatsApp cliente</label>
                    <input type="text" value={newDemand.client_phone} onChange={e => setNewDemand(p => ({ ...p, client_phone: e.target.value }))} placeholder="+56 9..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
              </div>

              {newDemandResult && (
                <div className={`rounded-lg p-3 text-sm ${newDemandResult.startsWith('✅') ? 'bg-green-500/20 text-green-300 border border-green-700' : 'bg-red-500/20 text-red-300 border border-red-700'}`}>
                  {newDemandResult}
                  {newDemand.client_phone && newDemandResult.startsWith('✅') && (
                    <a
                      href={`https://wa.me/${newDemand.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola! Tu pedido ya está publicado en JobsHours. Pronto te contactará un worker. Entra a jobshours.com para ver las respuestas.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block w-full py-2 bg-green-600 hover:bg-green-500 text-white text-center rounded-lg font-medium"
                    >
                      📲 Avisar cliente por WhatsApp
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={handleCreateDemand}
                disabled={newDemandLoading || !newDemand.description || !newDemand.category_id}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {newDemandLoading ? 'Publicando…' : '✍️ Publicar demanda'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
