'use client'

import { useState } from 'react'

export type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

interface Props {
  status: WorkerStatus
  loading?: boolean
  onActivate: () => void
  onChangeTo: (next: 'active' | 'intermediate' | 'inactive') => void
  onShowLogin: () => void
}

const STATUS_CONFIG = {
  guest: {
    dot: 'bg-gray-300',
    pill: 'bg-gray-100 text-gray-700 border border-gray-200',
    label: 'Gana dinero extra',
    sublabel: 'Toca para ganar dinero',
    icon: '�',
  },
  inactive: {
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-700 border border-gray-200',
    label: 'Invisible en mapa',
    sublabel: 'Toca para activarte',
    icon: '⚫',
  },
  intermediate: {
    dot: 'bg-amber-400 animate-pulse',
    pill: 'bg-amber-50 text-amber-800 border border-amber-200',
    label: 'Modo Escucha',
    sublabel: 'Visible a 5km — Solo alertas',
    icon: '🟡',
  },
  active: {
    dot: 'bg-green-500 animate-pulse',
    pill: 'bg-green-50 text-green-800 border border-green-200',
    label: 'Disponible Ahora',
    sublabel: 'Visible en mapa completo',
    icon: '🟢',
  },
}

const NEXT: Record<WorkerStatus, 'active' | 'intermediate' | 'inactive' | 'activate' | 'login'> = {
  guest:        'login',
  inactive:     'activate',
  intermediate: 'inactive',
  active:       'intermediate',
}

const CONFIRM_MSG: Partial<Record<WorkerStatus, string>> = {
  active:       '¿Cambiar a Modo Escucha?',
  intermediate: '¿Desconectarte del mapa?',
}

export default function WorkerStatusPill({ status, loading, onActivate, onChangeTo, onShowLogin }: Props) {
  const [confirming, setConfirming] = useState(false)
  const cfg = STATUS_CONFIG[status]
  const next = NEXT[status]

  const handleTap = () => {
    if (loading) return
    if (next === 'login') { onShowLogin(); return }
    if (next === 'activate') { onActivate(); return }
    // Para cambios de estado requiere confirmación inline
    setConfirming(true)
  }

  const handleConfirm = () => {
    setConfirming(false)
    if (next === 'intermediate') onChangeTo('intermediate')
    else if (next === 'inactive') onChangeTo('inactive')
  }

  return (
    <div className="relative">
      {/* Confirmación inline (reemplaza confirm()) */}
      {confirming && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-56 text-center animate-scale-in">
          <p className="text-sm font-bold text-gray-800 mb-3">{CONFIRM_MSG[status]}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition"
            >
              Sí, cambiar
            </button>
          </div>
        </div>
      )}

      {/* Pill principal */}
      <button
        onClick={handleTap}
        disabled={!!loading}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all active:scale-95 ${cfg.pill} ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
      >
        {/* Dot animado */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />

        <div className="text-left">
          <p className="text-xs font-black leading-tight">
            {loading ? 'Actualizando...' : cfg.label}
          </p>
          {!loading && (
            <p className="text-[10px] opacity-70 leading-tight">{cfg.sublabel}</p>
          )}
        </div>

        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
    </div>
  )
}
