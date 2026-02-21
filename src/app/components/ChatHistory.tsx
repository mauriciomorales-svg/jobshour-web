'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatThread {
  request_id: number
  description?: string
  status: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
  other_person?: { name: string; avatar?: string | null }
}

interface Props {
  onClose: () => void
  onOpenChat: (requestId: number, ctx: { description?: string; name?: string; avatar?: string | null }) => void
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Ahora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-yellow-400',
  accepted: 'bg-blue-400',
  in_progress: 'bg-indigo-400',
  completed: 'bg-green-400',
  cancelled: 'bg-gray-500',
}

export default function ChatHistory({ onClose, onOpenChat }: Props) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const res = await apiFetch('/api/v1/chat/threads', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        setThreads(Array.isArray(data.data) ? data.data : [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-white font-black text-xl">Conversaciones</h2>
          <p className="text-slate-400 text-xs mt-0.5">Historial de chats con clientes y trabajadores</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-slate-300 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-1 p-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-white font-black text-lg mb-2">Sin conversaciones aún</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Cuando tomes o publiques una solicitud, el chat aparecerá aquí
            </p>
          </div>
        )}

        {!loading && threads.length > 0 && (
          <AnimatePresence>
            <div className="divide-y divide-slate-800">
              {threads.map((t, i) => (
                <motion.button
                  key={t.request_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => onOpenChat(t.request_id, {
                    description: t.description,
                    name: t.other_person?.name,
                    avatar: t.other_person?.avatar,
                  })}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800 transition text-left active:bg-slate-700"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {t.other_person?.avatar ? (
                      <img src={t.other_person.avatar} className="w-12 h-12 rounded-full object-cover" alt={t.other_person.name} />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-black text-lg">{t.other_person?.name?.charAt(0) ?? '?'}</span>
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${STATUS_DOT[t.status] ?? 'bg-gray-500'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-white font-bold text-sm truncate">{t.other_person?.name ?? 'Usuario'}</p>
                      <span className="text-slate-500 text-xs shrink-0 ml-2">{timeAgo(t.last_message_at)}</span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{t.last_message ?? t.description ?? 'Sin mensajes aún'}</p>
                  </div>

                  {/* Unread badge */}
                  {(t.unread_count ?? 0) > 0 && (
                    <span className="shrink-0 w-5 h-5 bg-teal-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {t.unread_count}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
