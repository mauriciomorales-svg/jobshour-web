'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { notifyUser } from '@/lib/notifyUser'
import {
  classifyMisSolicitudesTab,
  REQUEST_STATUS_CONFIG,
} from '@/lib/requestFlow'
import {
  clearHiddenRequests,
  readHiddenRequestIds,
  unhideRequestForUser,
} from '@/lib/hiddenRequests'
import TrustPolicyPanel from './TrustPolicyPanel'

interface Solicitud {
  id: number
  description?: string
  status: string
  created_at: string
  expires_at?: string
  offered_price?: number | null
  final_price?: number | null
  client?: { id: number; name: string; avatar?: string }
  worker?: { id: number; user?: { id: number; name: string; avatar?: string } }
  category?: { display_name: string; color: string }
}

interface Props {
  user: { id: number; name?: string } | null
  onClose: () => void
  onOpenChat?: (
    requestId: number,
    otherName: string,
    otherAvatar: string | null,
    myRole: 'cliente' | 'trabajador',
    isSelf: boolean,
  ) => void
}

function timeAgo(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMin < 60) return `hace ${Math.max(1, diffMin)} min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `hace ${h}h`
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export default function RequestHistoryPanel({ user, onClose, onOpenChat }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [hiddenIds, setHiddenIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'archived' | 'hidden'>('archived')

  const reloadHidden = useCallback(() => {
    if (!user?.id) return
    setHiddenIds(readHiddenRequestIds(user.id))
  }, [user?.id])

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token || !user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/requests/mine', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSolicitudes(Array.isArray(data.data) ? data.data : [])
      reloadHidden()
    } catch {
      notifyUser('No se pudo cargar el historial', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, reloadHidden])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    reloadHidden()
    const onChange = () => reloadHidden()
    window.addEventListener('jh-hidden-requests-changed', onChange)
    return () => window.removeEventListener('jh-hidden-requests-changed', onChange)
  }, [reloadHidden])

  const archived = solicitudes.filter(
    (s) => classifyMisSolicitudesTab(s.status, s.created_at, s.expires_at) === 'archived',
  )

  const hiddenItems = solicitudes.filter((s) => hiddenIds.includes(s.id))

  const list = tab === 'archived' ? archived : hiddenItems

  const cancelRequest = async (id: number) => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return
    const res = await apiFetch(`/api/v1/requests/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (data.status === 'success') {
      notifyUser('Solicitud cancelada', 'success')
      await fetchAll()
    } else {
      notifyUser(data?.message || 'No se pudo cancelar', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-[160] bg-slate-900 flex flex-col">
      <div className="border-b border-slate-700 px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">Historial</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Finalizadas, canceladas y solicitudes que ocultaste del mapa
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="px-4 pt-3 grid grid-cols-2 gap-2 shrink-0">
        {([
          { id: 'archived' as const, label: 'Archivadas', count: archived.length },
          { id: 'hidden' as const, label: 'Ocultas', count: hiddenItems.length },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-xs font-bold border ${
              tab === t.id
                ? 'bg-slate-700 text-white border-slate-500'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            {t.label}
            {t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'hidden' && hiddenIds.length > 0 && user && (
        <div className="px-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearHiddenRequests(user.id)
              reloadHidden()
              notifyUser('Lista de ocultas vaciada', 'success')
            }}
            className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600"
          >
            Restaurar todas las ocultas
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-slate-400 text-sm text-center py-12">Cargando…</p>}

        {!loading && list.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            {tab === 'archived'
              ? 'No hay solicitudes archivadas.'
              : 'No ocultaste ninguna solicitud.'}
          </div>
        )}

        <AnimatePresence>
          <div className="space-y-3">
            {list.map((s) => {
              const st = REQUEST_STATUS_CONFIG[s.status] ?? REQUEST_STATUS_CONFIG.pending
              const imWorker = s.worker?.user?.id === user?.id
              const other = imWorker ? s.client : s.worker?.user
              const myRole: 'cliente' | 'trabajador' = imWorker ? 'trabajador' : 'cliente'

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4"
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {s.description || `Solicitud #${s.id}`}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {other?.name ? `${other.name} · ` : ''}
                        {timeAgo(s.created_at)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${st.bg} ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {other?.id && other.id !== user?.id && onOpenChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenChat(s.id, other.name ?? '', other.avatar ?? null, myRole, false)
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      >
                        Chat
                      </button>
                    )}
                    {tab === 'hidden' && user && (
                      <button
                        type="button"
                        onClick={() => {
                          unhideRequestForUser(user.id, s.id)
                          reloadHidden()
                          notifyUser('Solicitud visible de nuevo en Mis solicitudes', 'success')
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-slate-200"
                      >
                        Restaurar
                      </button>
                    )}
                    {['pending', 'accepted', 'in_progress'].includes(s.status) && (
                      <button
                        type="button"
                        onClick={() => void cancelRequest(s.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/25"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>

        <TrustPolicyPanel className="mt-6" />
      </div>
    </div>
  )
}
