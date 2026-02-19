'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Solicitud {
  id: number
  description?: string
  status: string
  offered_price: number
  created_at: string
  category?: { name: string; color: string }
  worker?: { name: string; avatar?: string }
  client?: { name: string; avatar?: string }
}

interface Props {
  user: any | null
  onLoginRequest: () => void
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Esperando',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
  accepted:   { label: 'Aceptada',     color: 'text-blue-700',   bg: 'bg-blue-100'   },
  in_progress:{ label: 'En progreso',  color: 'text-indigo-700', bg: 'bg-indigo-100' },
  completed:  { label: 'Completada',   color: 'text-green-700',  bg: 'bg-green-100'  },
  cancelled:  { label: 'Cancelada',    color: 'text-gray-500',   bg: 'bg-gray-100'   },
  disputed:   { label: 'En disputa',   color: 'text-red-700',    bg: 'bg-red-100'    },
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

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">Mis Solicitudes</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {user ? 'Trabajos que publicaste o tomaste' : 'Inicia sesión para ver tus solicitudes'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-1/2" />
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
                  const st = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'text-gray-400', bg: 'bg-gray-100' }
                  const other = s.worker ?? s.client
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-slate-800 rounded-2xl p-4 border border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {other?.avatar
                            ? <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                            : <span className="text-white font-black">{other?.name?.charAt(0) ?? '?'}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-sm truncate">
                              {s.description ?? s.category?.name ?? 'Servicio'}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          {other?.name && (
                            <p className="text-slate-400 text-xs mt-0.5">{other.name}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-orange-400 font-black text-sm">
                              ${s.offered_price.toLocaleString('es-CL')}
                            </span>
                            <span className="text-slate-500 text-xs">{s.created_at}</span>
                          </div>
                        </div>
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
