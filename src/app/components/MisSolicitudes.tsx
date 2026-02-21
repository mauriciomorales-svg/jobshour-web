'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Solicitud {
  id: number
  description?: string
  status: string
  offered_price: number
  created_at: string
  expires_at?: string
  pickup_address?: string
  delivery_address?: string
  fuzzed_latitude?: number
  fuzzed_longitude?: number
  type?: string
  payload?: { image?: string; seats?: number; departure_time?: string; destination_name?: string; store_name?: string; items_count?: number; load_type?: string; requires_vehicle?: boolean }
  scheduled_at?: string | null
  workers_needed?: number
  workers_accepted?: number
  recurrence?: string
  recurrence_days?: number[] | null
  category_type?: string
  category?: { id: number; display_name: string; color: string }
  worker?: { id: number; user?: { id: number; name: string; avatar?: string } }
  client?: { id: number; name: string; avatar?: string }
}

interface Props {
  user: any | null
  onLoginRequest: () => void
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:     { label: 'Esperando confirmación', color: 'text-yellow-300', bg: 'bg-yellow-500/20', icon: '⏳' },
  accepted:    { label: 'Aceptada',               color: 'text-blue-300',   bg: 'bg-blue-500/20',   icon: '✅' },
  in_progress: { label: 'En progreso',            color: 'text-indigo-300', bg: 'bg-indigo-500/20', icon: '🔧' },
  completed:   { label: 'Completada',             color: 'text-green-300',  bg: 'bg-green-500/20',  icon: '🎉' },
  cancelled:   { label: 'Cancelada',              color: 'text-gray-400',   bg: 'bg-gray-500/20',   icon: '❌' },
  disputed:    { label: 'En disputa',             color: 'text-red-300',    bg: 'bg-red-500/20',    icon: '⚠️' },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `hace ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `hace ${diffDays}d`
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function formatCLP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CL')
}

function ExpirationTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime()
      const exp = new Date(expiresAt).getTime()
      const diff = exp - now
      if (diff <= 0) {
        setRemaining('Expirado')
        setUrgent(true)
        return
      }
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setRemaining(`${min}:${sec.toString().padStart(2, '0')}`)
      setUrgent(min < 2)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
      urgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-orange-500/20 text-orange-300'
    }`}>
      ⏱ {remaining}
    </span>
  )
}

export default function MisSolicitudes({ user, onLoginRequest, onClose }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/requests/mine', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSolicitudes(Array.isArray(data.data) ? data.data : [])
    } catch (e) {
      setError('No se pudieron cargar tus solicitudes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchSolicitudes()
  }, [user, fetchSolicitudes])

  const isMyWorkerRole = (s: Solicitud) => {
    return s.worker?.user?.id === user?.id
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/95 border-b border-slate-700 px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">Mis Solicitudes</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {user
              ? solicitudes.length > 0
                ? `${solicitudes.length} solicitud${solicitudes.length > 1 ? 'es' : ''}`
                : 'Trabajos que publicaste o tomaste'
              : 'Inicia sesión para ver tus solicitudes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && solicitudes.length > 0 && (
            <button
              onClick={fetchSolicitudes}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300 transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* No logueado */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-16"
          >
            <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-white font-black text-lg mb-2">Tus solicitudes aquí</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
              Cuando publiques o tomes un trabajo, aparecerá aquí con su estado en tiempo real
            </p>
            <button
              onClick={onLoginRequest}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm transition active:scale-95 shadow-lg"
            >
              Ingresar para ver mis solicitudes
            </button>
          </motion.div>
        )}

        {/* Cargando */}
        {user && loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800 rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-700" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {user && !loading && error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchSolicitudes}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista */}
        {user && !loading && !error && (
          <AnimatePresence>
            {solicitudes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-5xl mb-3">📋</div>
                <h3 className="text-white font-bold text-base mb-2">Aún sin solicitudes</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Cuando publiques un trabajo o tomes una demanda del feed, aparecerá aquí
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {solicitudes.map((s, i) => {
                  const st = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '📄' }
                  const imWorker = isMyWorkerRole(s)
                  const otherPerson = imWorker ? s.client : s.worker?.user
                  const myRole = imWorker ? 'Trabajador' : 'Cliente'
                  const categoryName = s.category?.display_name ?? s.category_type ?? ''
                  const categoryColor = s.category?.color ?? '#6b7280'
                  const isPending = s.status === 'pending'
                  const isActive = ['pending', 'accepted', 'in_progress'].includes(s.status)

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-2xl overflow-hidden border ${
                        isActive ? 'border-slate-600 bg-slate-800' : 'border-slate-700/50 bg-slate-800/60'
                      }`}
                    >
                      {/* Top colored accent */}
                      <div className="h-1" style={{ background: categoryColor }} />

                      <div className="p-4">
                        {/* Row 1: Avatar + Info + Price */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ring-slate-600">
                            {otherPerson?.avatar ? (
                              <img src={otherPerson.avatar} alt={otherPerson.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                <span className="text-white font-black text-lg">
                                  {otherPerson?.name?.charAt(0) ?? '?'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight truncate">
                              {s.description ?? 'Servicio'}
                            </p>
                            {s.payload?.image && (
                              <img src={s.payload.image} alt="Foto" className="w-full h-24 object-cover rounded-lg mt-1.5 border border-white/10" />
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {otherPerson?.name && (
                                <span className="text-slate-300 text-xs font-medium">
                                  {otherPerson.name}
                                </span>
                              )}
                              <span className="text-slate-600 text-xs">•</span>
                              <span className="text-slate-500 text-xs">{myRole}</span>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <p className="text-orange-400 font-black text-base">
                              {formatCLP(s.offered_price)}
                            </p>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                              {timeAgo(s.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Row 2: Address + Cómo llegar */}
                        {(s.pickup_address || s.delivery_address || (s.fuzzed_latitude && s.fuzzed_longitude)) && (
                          <div className="mt-2.5 space-y-1.5">
                            {/* Origen → Destino */}
                            {s.pickup_address && s.delivery_address ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.pickup_address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs truncate text-blue-400 hover:text-blue-300 underline">{s.pickup_address}</a>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.delivery_address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs truncate text-blue-400 hover:text-blue-300 underline">{s.delivery_address}</a>
                                </div>
                              </div>
                            ) : s.pickup_address ? (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.pickup_address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span className="text-xs truncate underline">{s.pickup_address}</span>
                              </a>
                            ) : null}
                            {/* Payload chips */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {s.payload?.seats && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">👥 {s.payload.seats} asiento{s.payload.seats > 1 ? 's' : ''}</span>}
                              {s.payload?.store_name && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold">🏪 {s.payload.store_name}</span>}
                              {s.payload?.departure_time && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">🕐 {new Date(s.payload.departure_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                              {s.payload?.requires_vehicle && <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold">🚗 Requiere vehículo</span>}
                              {s.scheduled_at && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">📅 {new Date(s.scheduled_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} {new Date(s.scheduled_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
                              {s.workers_needed && s.workers_needed > 1 && <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold">👥 {s.workers_accepted ?? 0}/{s.workers_needed} personas</span>}
                              {s.recurrence && s.recurrence !== 'once' && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">🔄 {s.recurrence === 'daily' ? 'Diario' : s.recurrence === 'weekly' ? 'Semanal' : 'Personalizado'}</span>}
                            </div>
                            {/* Cómo llegar */}
                            {s.fuzzed_latitude && s.fuzzed_longitude && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${s.fuzzed_latitude},${s.fuzzed_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg text-[10px] font-bold transition"
                              >
                                🗺️ Cómo llegar
                              </a>
                            )}
                          </div>
                        )}

                        {/* Row 3: Category + Status + Timer */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {categoryName && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ background: categoryColor }}
                            >
                              {categoryName}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                          {isPending && s.expires_at && (
                            <ExpirationTimer expiresAt={s.expires_at} />
                          )}
                        </div>

                        {/* Row 3: Action buttons (only for active requests) */}
                        {isActive && (
                          <div className="flex gap-2 mt-3">
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/15 hover:bg-green-500/25 text-green-400 rounded-xl text-xs font-bold transition active:scale-95">
                              💬 Chat
                            </button>
                            {isPending && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!confirm('¿Cancelar esta solicitud? La demanda volverá a estar disponible.')) return
                                  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                                  if (!token) return
                                  try {
                                    const res = await fetch(`/cancel_request.php?id=${s.id}`, {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                                    })
                                    const data = await res.json()
                                    if (data.status === 'success') {
                                      setSolicitudes(prev => prev.filter(x => x.id !== s.id))
                                      window.dispatchEvent(new CustomEvent('remove-feed-item', { detail: { id: s.id } }))
                                    } else {
                                      alert(data.message || 'Error al cancelar')
                                    }
                                  } catch {
                                    alert('Error de conexión')
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition active:scale-95"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
