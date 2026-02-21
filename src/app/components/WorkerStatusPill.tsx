'use client'

import { useState } from 'react'
import WorkerStatusSemaphore from './WorkerStatusSemaphore'

export type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

interface Props {
  status: WorkerStatus
  loading?: boolean
  isLoggedIn?: boolean
  onActivate: () => void
  onChangeTo: (next: 'active' | 'intermediate' | 'inactive') => void
  onShowLogin: () => void
}

const STATUS_CONFIG: Record<WorkerStatus, { dot: string; pill: string; label: string; sublabel: string }> = {
  guest: {
    dot: 'bg-gray-300',
    pill: 'bg-gray-900/80 text-white border border-white/10 backdrop-blur-sm',
    label: 'Gana dinero extra',
    sublabel: 'Inicia sesión para activarte',
  },
  inactive: {
    dot: 'bg-gray-400',
    pill: 'bg-slate-800/90 text-slate-300 border border-slate-600/50 backdrop-blur-sm',
    label: 'Invisible en mapa',
    sublabel: 'Toca para cambiar estado',
  },
  intermediate: {
    dot: 'bg-sky-300 animate-pulse',
    pill: 'bg-sky-500/90 text-white border border-sky-300/60 backdrop-blur-sm shadow-[0_0_16px_rgba(56,189,248,0.4)]',
    label: 'Disponibilidad Flexible',
    sublabel: 'Visible a 5 km · con aviso previo',
  },
  active: {
    dot: 'bg-green-400 animate-pulse',
    pill: 'bg-green-600/90 text-white border border-green-400/60 backdrop-blur-sm shadow-[0_0_16px_rgba(34,197,94,0.4)]',
    label: 'Disponibilidad Inmediata',
    sublabel: 'Visible en todo el mapa',
  },
}

export default function WorkerStatusPill({ status, loading, isLoggedIn, onActivate, onChangeTo, onShowLogin }: Props) {
  const [semaphoreOpen, setSemaphoreOpen] = useState(false)

  // Usuario logueado sin perfil worker: tratar como inactive visualmente
  const effectiveStatus: WorkerStatus = (status === 'guest' && isLoggedIn) ? 'inactive' : status
  const cfg = STATUS_CONFIG[effectiveStatus]

  const handleTap = () => {
    if (loading) return
    if (!isLoggedIn) { onShowLogin(); return }
    setSemaphoreOpen(true)
  }

  const handleSemaphoreSelect = (next: 'active' | 'intermediate' | 'inactive') => {
    if (next === 'active') { onActivate(); return }
    onChangeTo(next)
  }

  return (
    <>
      {/* Pill principal */}
      <button
        onClick={handleTap}
        disabled={!!loading}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95 ${cfg.pill} ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="text-left">
          <p className="text-xs font-black leading-tight">
            {loading ? 'Actualizando...' : cfg.label}
          </p>
          {!loading && (
            <p className="text-[10px] opacity-60 leading-tight">{cfg.sublabel}</p>
          )}
        </div>
        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin shrink-0 opacity-60" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <span className="text-base leading-none shrink-0 opacity-70">🚦</span>
        )}
      </button>

      {/* Semáforo */}
      {semaphoreOpen && (
        <WorkerStatusSemaphore
          current={effectiveStatus}
          loading={loading}
          onSelect={handleSemaphoreSelect}
          onClose={() => setSemaphoreOpen(false)}
        />
      )}
    </>
  )
}
