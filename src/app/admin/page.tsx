'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { emptyStateCopy } from '@/lib/userFacingCopy'

interface Stats {
  users: { total: number; workers: number; clients: number; with_fcm: number; recent_7d: number }
  demands: { total: number; pending: number; taken: number; completed: number; cancelled: number; today: number; week: number }
  categories: number
  revenue: { total: number; week: number }
}

interface UserRow {
  id: number; name: string; email: string; phone: string; type: string; nickname: string | null
  is_active: boolean; is_pioneer: boolean; is_business: boolean; has_fcm: boolean; created_at: string
}

interface DemandRow {
  id: number; description: string; status: string; offered_price: number; type: string; urgency: string
  created_at: string; workers_needed: number; recurrence: string
  client: { id: number; name: string; nickname: string | null } | null
  category: { id: number; display_name: string; color: string } | null
}

interface CategoryRow {
  id: number; display_name: string; slug: string; color: string; icon: string
  workers_count: number; service_requests_count: number
}

interface AnalyticsSummary {
  generated_at: string
  windows: { d1: { since: string; until: string }; d7: { since: string; until: string } }
  totals: { events_d1: number; events_d7: number }
  unique_ips: { d1: number; d7: number }
  users_with_events: { distinct_d1: number; distinct_d7: number }
  cohort: {
    label: string
    week_over_week_returning: number
    users_in_previous_window_only: number
    return_rate_vs_previous_window: number | null
  }
  by_name: { name: string; events_d1: number; events_d7: number }[]
}

interface AnalyticsEventRow {
  id: number
  name: string
  payload: Record<string, unknown> | null
  user_id: number | null
  client_ts: number
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
}

type Tab = 'dashboard' | 'users' | 'demands' | 'categories' | 'analytics'

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [demands, setDemands] = useState<DemandRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null)
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRow[]>([])
  const [analyticsPage, setAnalyticsPage] = useState(1)
  const [analyticsTotalPages, setAnalyticsTotalPages] = useState(1)
  const [eventNameFilter, setEventNameFilter] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('auth_token')
    if (t) setToken(t)
  }, [])

  const api = useCallback(async (path: string, method = 'GET', body?: any) => {
    const res = await apiFetch(`/api/v1/admin${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (res.status === 403) throw new Error('No autorizado. Solo admin.')
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.json()
  }, [token])

  const loadStats = useCallback(async () => {
    try { setStats(await api('/stats')) } catch (e: any) { setError(e.message) }
  }, [api])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      const data = await api(`/users?${params}`)
      setUsers(data.data)
      setTotalPages(data.last_page)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api, page, search, typeFilter])

  const loadDemands = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const data = await api(`/demands?${params}`)
      setDemands(data.data)
      setTotalPages(data.last_page)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api, page, search, statusFilter, typeFilter])

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try { setCategories(await api('/categories')) } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [api])

  const loadAnalyticsSummary = useCallback(async () => {
    try {
      setAnalyticsSummary(await api('/analytics/summary'))
    } catch (e: any) {
      setError(e.message)
    }
  }, [api])

  const loadAnalyticsEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(analyticsPage), per_page: '25' })
      if (eventNameFilter.trim()) params.set('name', eventNameFilter.trim())
      const data = await api(`/analytics/events?${params}`)
      setAnalyticsEvents(data.data ?? [])
      setAnalyticsTotalPages(data.last_page ?? 1)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [api, analyticsPage, eventNameFilter])

  useEffect(() => {
    if (!token) return
    setError('')
    if (tab === 'dashboard') loadStats()
    else if (tab === 'users') loadUsers()
    else if (tab === 'demands') loadDemands()
    else if (tab === 'categories') loadCategories()
  }, [token, tab, page, loadStats, loadUsers, loadDemands, loadCategories])

  useEffect(() => {
    if (!token || tab !== 'analytics') return
    setError('')
    loadAnalyticsSummary()
  }, [token, tab, loadAnalyticsSummary])

  useEffect(() => {
    if (!token || tab !== 'analytics') return
    loadAnalyticsEvents()
  }, [token, tab, analyticsPage, eventNameFilter, loadAnalyticsEvents])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter, tab])

  useEffect(() => {
    setAnalyticsPage(1)
  }, [eventNameFilter])

  const toggleUser = async (id: number) => {
    await api(`/users/${id}/toggle`, 'POST')
    loadUsers()
  }

  const cancelDemand = async (id: number) => {
    if (!confirm('¿Cancelar esta demanda?')) return
    await api(`/demands/${id}/cancel`, 'POST', { reason: 'Cancelado por admin' })
    loadDemands()
  }

  const boostDemand = async (id: number) => {
    const hoursStr = typeof window !== 'undefined' ? window.prompt('Horas de destacado en mapa (1–336)', '24') : null
    if (hoursStr === null) return
    const hours = parseInt(hoursStr, 10)
    if (!Number.isFinite(hours) || hours < 1 || hours > 336) {
      setError('Horas inválidas (1–336)')
      return
    }
    try {
      await api(`/demands/${id}/boost`, 'POST', { hours })
      loadDemands()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  const fmt = (n: number) => n?.toLocaleString('es-CL') ?? '0'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">🔒 Admin Panel</h1>
          <p className="text-gray-400 mb-4">Inicia sesión en JobsHours primero</p>
          <Link href="/" className="text-amber-400 underline hover:text-amber-300">Ir al inicio</Link>
        </div>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    taken: 'bg-orange-500/20 text-orange-300',
    accepted: 'bg-teal-500/20 text-teal-300',
    completed: 'bg-teal-600/25 text-teal-200',
    cancelled: 'bg-red-500/20 text-red-300',
    expired: 'bg-gray-500/20 text-gray-400',
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'analytics', label: 'Analytics', icon: '📈' },
    { key: 'users', label: 'Usuarios', icon: '👥' },
    { key: 'demands', label: 'Demandas', icon: '📋' },
    { key: 'categories', label: 'Categorías', icon: '🏷️' },
  ]

  const refreshAnalytics = () => {
    loadAnalyticsSummary()
    loadAnalyticsEvents()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <h1 className="text-xl font-bold">JobsHours Admin</h1>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-white">← Volver al mapa</Link>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-56 bg-gray-900/50 border-r border-gray-800 min-h-[calc(100vh-65px)] p-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                tab === t.key ? 'bg-teal-600/20 text-teal-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4">
              {error} <button onClick={() => setError('')} className="ml-2 underline">cerrar</button>
            </div>
          )}

          {/* Dashboard */}
          {tab === 'dashboard' && stats && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Usuarios', val: stats.users.total, sub: `+${stats.users.recent_7d} esta semana`, color: 'from-amber-600 to-orange-800' },
                  { label: 'Workers', val: stats.users.workers, sub: `${stats.users.with_fcm} con push`, color: 'from-teal-600 to-teal-900' },
                  { label: 'Demandas', val: stats.demands.total, sub: `${stats.demands.today} hoy`, color: 'from-orange-600 to-amber-800' },
                  { label: 'Completadas', val: stats.demands.completed, sub: `$${fmt(stats.revenue.total)}`, color: 'from-amber-700 to-orange-900' },
                ].map((s, i) => (
                  <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5`}>
                    <p className="text-sm text-white/70">{s.label}</p>
                    <p className="text-3xl font-bold mt-1">{fmt(s.val)}</p>
                    <p className="text-xs text-white/50 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Pendientes', val: stats.demands.pending, color: 'text-amber-400' },
                  { label: 'Tomadas', val: stats.demands.taken, color: 'text-orange-400' },
                  { label: 'Completadas', val: stats.demands.completed, color: 'text-teal-400' },
                  { label: 'Canceladas', val: stats.demands.cancelled, color: 'text-red-400' },
                  { label: 'Categorías', val: stats.categories, color: 'text-amber-300' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{fmt(s.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product analytics */}
          {tab === 'analytics' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold">Product analytics</h2>
                <button
                  type="button"
                  onClick={refreshAnalytics}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-xl text-sm font-medium"
                >
                  Actualizar
                </button>
              </div>

              {analyticsSummary && (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    Generado: {new Date(analyticsSummary.generated_at).toLocaleString('es-CL')} · D1 = últimas 24 h · D7 = últimos 7 días (servidor)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">Eventos (24 h)</p>
                      <p className="text-2xl font-bold text-teal-400">{fmt(analyticsSummary.totals.events_d1)}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">Eventos (7 días)</p>
                      <p className="text-2xl font-bold text-amber-300">{fmt(analyticsSummary.totals.events_d7)}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">IPs distintas (24 h)</p>
                      <p className="text-2xl font-bold text-amber-400">{fmt(analyticsSummary.unique_ips.d1)}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">IPs distintas (7 días)</p>
                      <p className="text-2xl font-bold text-orange-400">{fmt(analyticsSummary.unique_ips.d7)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">Usuarios logueados (24 h)</p>
                      <p className="text-2xl font-bold text-teal-300">{fmt(analyticsSummary.users_with_events?.distinct_d1 ?? 0)}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <p className="text-xs text-gray-500">Usuarios logueados (7 días)</p>
                      <p className="text-2xl font-bold text-orange-300">{fmt(analyticsSummary.users_with_events?.distinct_d7 ?? 0)}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 rounded-xl border border-gray-700 p-4 mb-8">
                    <p className="text-sm font-bold text-gray-200 mb-1">Cohorte (eventos con user_id)</p>
                    <p className="text-xs text-gray-500 mb-2">{analyticsSummary.cohort?.label}</p>
                    <p className="text-sm text-gray-300">
                      Retornos (7–14 días → últimos 7 días):{' '}
                      <span className="font-mono text-teal-400">{fmt(analyticsSummary.cohort?.week_over_week_returning ?? 0)}</span>
                      {' · '}
                      Usuarios únicos ventana previa: {fmt(analyticsSummary.cohort?.users_in_previous_window_only ?? 0)}
                      {' · '}
                      Tasa:{' '}
                      {analyticsSummary.cohort?.return_rate_vs_previous_window != null
                        ? `${(analyticsSummary.cohort.return_rate_vs_previous_window * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>

                  <h3 className="text-lg font-bold mb-3">Por nombre de evento</h3>
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-10">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-400 font-medium">Evento</th>
                          <th className="text-right px-4 py-3 text-gray-400 font-medium">24 h</th>
                          <th className="text-right px-4 py-3 text-gray-400 font-medium">7 días</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsSummary.by_name.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">{emptyStateCopy.noDataWindow}</td>
                          </tr>
                        ) : (
                          analyticsSummary.by_name.map(row => (
                            <tr key={row.name} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                              <td className="px-4 py-2 font-mono text-xs text-teal-300/90">{row.name}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{fmt(row.events_d1)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(row.events_d7)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 className="text-lg font-bold mb-3">Registros recientes</h3>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Filtrar por nombre (parcial)..."
                  value={eventNameFilter}
                  onChange={e => setEventNameFilter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadAnalyticsEvents()}
                  className="flex-1 min-w-[200px] max-w-md bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <button type="button" onClick={loadAnalyticsEvents} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-amber-500/20">
                  Aplicar
                </button>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Nombre</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Payload</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">IP</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsEvents.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">{emptyStateCopy.noEvents}</td>
                      </tr>
                    ) : (
                      analyticsEvents.map(ev => (
                        <tr key={ev.id} className="border-t border-gray-800/50 hover:bg-gray-800/30 align-top">
                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{ev.id}</td>
                          <td className="px-4 py-2 font-mono text-xs text-teal-300/90 max-w-[180px] break-all">{ev.name}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">{ev.user_id ?? '—'}</td>
                          <td className="px-4 py-2 text-xs text-gray-400 max-w-md">
                            <pre className="whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{ev.payload ? JSON.stringify(ev.payload) : '—'}</pre>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">{ev.ip_address ?? '—'}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                            {ev.created_at ? fmtDate(ev.created_at) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center gap-2 mt-4">
                <button
                  type="button"
                  disabled={analyticsPage <= 1}
                  onClick={() => setAnalyticsPage(p => p - 1)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="px-4 py-2 text-gray-400 text-sm">
                  {analyticsPage} / {analyticsTotalPages}
                </span>
                <button
                  type="button"
                  disabled={analyticsPage >= analyticsTotalPages}
                  onClick={() => setAnalyticsPage(p => p + 1)}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold">Usuarios</h2>
                <input
                  type="text"
                  placeholder="Buscar nombre, email, teléfono..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadUsers()}
                  className="flex-1 max-w-md bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="worker">Workers</option>
                  <option value="client">Clientes</option>
                </select>
                <button onClick={loadUsers} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-amber-500/20">Buscar</button>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Nombre</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Push</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-500">{u.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.name}</div>
                          {u.nickname && <div className="text-xs text-gray-500">@{u.nickname}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.type === 'worker' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-600/50 text-slate-200'}`}>
                            {u.type}
                          </span>
                          {u.is_pioneer && <span className="ml-1 text-yellow-400 text-xs">⭐</span>}
                          {u.is_business && <span className="ml-1 text-amber-400 text-xs">🏢</span>}
                        </td>
                        <td className="px-4 py-3">{u.has_fcm ? '✅' : '❌'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleUser(u.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${u.is_active ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'}`}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">← Anterior</button>
                <span className="px-4 py-2 text-gray-400 text-sm">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">Siguiente →</button>
              </div>
            </div>
          )}

          {/* Demands */}
          {tab === 'demands' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold">Demandas</h2>
                <input
                  type="text"
                  placeholder="Buscar descripción..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadDemands()}
                  className="flex-1 max-w-md bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="taken">Tomada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <button onClick={loadDemands} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-amber-500/20">Buscar</button>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Descripción</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Categoría</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Precio</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map(d => (
                      <tr key={d.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-500">{d.id}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{d.description}</td>
                        <td className="px-4 py-3 text-gray-400">{d.client?.name || '—'}</td>
                        <td className="px-4 py-3">
                          {d.category && (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: d.category.color + '30', color: d.category.color }}>
                              {d.category.display_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">${fmt(d.offered_price)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusColor[d.status] || 'bg-gray-500/20 text-gray-400'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{d.type}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(d.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {d.status === 'pending' && (
                              <button onClick={() => cancelDemand(d.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30">
                                Cancelar
                              </button>
                            )}
                            {d.status === 'pending' && (
                              <button type="button" onClick={() => boostDemand(d.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">
                                Boost mapa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">← Anterior</button>
                <span className="px-4 py-2 text-gray-400 text-sm">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">Siguiente →</button>
              </div>
            </div>
          )}

          {/* Categories */}
          {tab === 'categories' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Categorías ({categories.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map(c => (
                  <div key={c.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: c.color + '20' }}>
                      {c.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{c.display_name}</p>
                      <p className="text-xs text-gray-500">{c.slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-teal-400">{c.workers_count} <span className="text-gray-500 font-normal">workers</span></p>
                      <p className="text-sm font-bold text-yellow-400">{c.service_requests_count} <span className="text-gray-500 font-normal">demandas</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
