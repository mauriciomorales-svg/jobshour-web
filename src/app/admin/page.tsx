'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

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

type Tab = 'dashboard' | 'users' | 'demands' | 'categories'

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

  useEffect(() => {
    if (!token) return
    setError('')
    if (tab === 'dashboard') loadStats()
    else if (tab === 'users') loadUsers()
    else if (tab === 'demands') loadDemands()
    else if (tab === 'categories') loadCategories()
  }, [token, tab, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter, tab])

  const toggleUser = async (id: number) => {
    await api(`/users/${id}/toggle`, 'POST')
    loadUsers()
  }

  const cancelDemand = async (id: number) => {
    if (!confirm('¿Cancelar esta demanda?')) return
    await api(`/demands/${id}/cancel`, 'POST', { reason: 'Cancelado por admin' })
    loadDemands()
  }

  const fmt = (n: number) => n?.toLocaleString('es-CL') ?? '0'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">🔒 Admin Panel</h1>
          <p className="text-gray-400 mb-4">Inicia sesión en JobsHours primero</p>
          <a href="/" className="text-emerald-400 underline">Ir al inicio</a>
        </div>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    taken: 'bg-blue-500/20 text-blue-300',
    accepted: 'bg-blue-500/20 text-blue-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    cancelled: 'bg-red-500/20 text-red-300',
    expired: 'bg-gray-500/20 text-gray-400',
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'users', label: 'Usuarios', icon: '👥' },
    { key: 'demands', label: 'Demandas', icon: '📋' },
    { key: 'categories', label: 'Categorías', icon: '🏷️' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <h1 className="text-xl font-bold">JobsHours Admin</h1>
        </div>
        <a href="/" className="text-sm text-gray-400 hover:text-white">← Volver al mapa</a>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-56 bg-gray-900/50 border-r border-gray-800 min-h-[calc(100vh-65px)] p-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                tab === t.key ? 'bg-emerald-600/20 text-emerald-400 font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
                  { label: 'Usuarios', val: stats.users.total, sub: `+${stats.users.recent_7d} esta semana`, color: 'from-blue-600 to-blue-800' },
                  { label: 'Workers', val: stats.users.workers, sub: `${stats.users.with_fcm} con push`, color: 'from-emerald-600 to-emerald-800' },
                  { label: 'Demandas', val: stats.demands.total, sub: `${stats.demands.today} hoy`, color: 'from-yellow-600 to-yellow-800' },
                  { label: 'Completadas', val: stats.demands.completed, sub: `$${fmt(stats.revenue.total)}`, color: 'from-purple-600 to-purple-800' },
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
                  { label: 'Pendientes', val: stats.demands.pending, color: 'text-yellow-400' },
                  { label: 'Tomadas', val: stats.demands.taken, color: 'text-blue-400' },
                  { label: 'Completadas', val: stats.demands.completed, color: 'text-emerald-400' },
                  { label: 'Canceladas', val: stats.demands.cancelled, color: 'text-red-400' },
                  { label: 'Categorías', val: stats.categories, color: 'text-purple-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{fmt(s.val)}</p>
                  </div>
                ))}
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
                  className="flex-1 max-w-md bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="worker">Workers</option>
                  <option value="client">Clientes</option>
                </select>
                <button onClick={loadUsers} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-bold">Buscar</button>
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
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.type === 'worker' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                            {u.type}
                          </span>
                          {u.is_pioneer && <span className="ml-1 text-yellow-400 text-xs">⭐</span>}
                          {u.is_business && <span className="ml-1 text-purple-400 text-xs">🏢</span>}
                        </td>
                        <td className="px-4 py-3">{u.has_fcm ? '✅' : '❌'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleUser(u.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${u.is_active ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
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
                  className="flex-1 max-w-md bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="taken">Tomada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <button onClick={loadDemands} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-bold">Buscar</button>
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
                          {d.status === 'pending' && (
                            <button onClick={() => cancelDemand(d.id)} className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30">
                              Cancelar
                            </button>
                          )}
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
                      <p className="text-sm font-bold text-emerald-400">{c.workers_count} <span className="text-gray-500 font-normal">workers</span></p>
                      <p className="text-sm font-bold text-yellow-400">{c.service_requests_count} <span className="text-gray-500 font-normal">demandas</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
