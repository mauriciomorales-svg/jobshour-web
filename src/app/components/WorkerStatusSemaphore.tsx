'use client'

import { useEffect } from 'react'
import { WorkerStatus } from './WorkerStatusPill'

interface Props {
  current: WorkerStatus
  loading?: boolean
  isSeller?: boolean
  onSelect: (next: 'active' | 'intermediate' | 'inactive') => void
  onToggleSeller?: () => void
  onClose: () => void
}

const LAMPS = [
  {
    status: 'inactive' as const,
    label: 'Invisible',
    sublabel: 'No apareces en el mapa',
    color: {
      border: 'border-slate-600/50',
      bg: 'bg-slate-800/60',
      glow: '',
      dot: 'bg-slate-500',
      text: 'text-slate-400',
      active: {
        border: 'border-slate-400',
        bg: 'bg-slate-700',
        glow: 'shadow-[0_0_28px_rgba(148,163,184,0.35)]',
        text: 'text-slate-200',
      },
    },
  },
  {
    status: 'intermediate' as const,
    label: 'Disponibilidad Flexible',
    sublabel: 'Visible a 5 km · con aviso previo',
    color: {
      border: 'border-amber-500/35',
      bg: 'bg-amber-950/35',
      glow: '',
      dot: 'bg-amber-600',
      text: 'text-amber-600',
      active: {
        border: 'border-amber-400',
        bg: 'bg-amber-950/55',
        glow: 'shadow-[0_0_32px_rgba(245,158,11,0.4)]',
        text: 'text-amber-100',
      },
    },
  },
  {
    status: 'active' as const,
    label: 'Disponibilidad Inmediata',
    sublabel: 'Visible en todo el mapa',
    color: {
      border: 'border-teal-500/35',
      bg: 'bg-teal-950/40',
      glow: '',
      dot: 'bg-teal-600',
      text: 'text-teal-500',
      active: {
        border: 'border-teal-400',
        bg: 'bg-teal-900/60',
        glow: 'shadow-[0_0_36px_rgba(45,212,191,0.45)]',
        text: 'text-teal-100',
      },
    },
  },
]

export default function WorkerStatusSemaphore({ current, loading, isSeller, onSelect, onToggleSeller, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const effectiveCurrent = (current === 'guest') ? 'inactive' : current

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-start" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel — bottom-left, above pill */}
      <div
        className="relative mb-[76px] ml-4 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Carcasa del semáforo */}
        <div className="relative w-[120px] rounded-[2.5rem] bg-gradient-to-b from-slate-800 to-slate-950 p-4 shadow-[0_0_60px_rgba(0,0,0,0.9),inset_0_2px_2px_rgba(255,255,255,0.05)] border border-slate-700/40">
          <div className="flex flex-col gap-5 py-1">
            {LAMPS.map((lamp) => {
              const isActive = lamp.status === effectiveCurrent
              const c = isActive ? lamp.color.active : lamp.color
              return (
                <button
                  key={lamp.status}
                  disabled={!!loading}
                  onClick={() => { onSelect(lamp.status); onClose() }}
                  className="group relative flex flex-col items-center focus:outline-none"
                >
                  {/* Glow halo detrás */}
                  {isActive && (
                    <div className={`absolute inset-0 scale-125 rounded-full blur-2xl opacity-60 ${
                      lamp.status === 'inactive' ? 'bg-slate-500/20' :
                      lamp.status === 'intermediate' ? 'bg-amber-500/20' : 'bg-teal-500/20'
                    } ${isActive ? 'animate-pulse' : ''}`} />
                  )}

                  {/* Lente */}
                  <div className={`relative h-16 w-16 rounded-full border-2 overflow-hidden transition-all duration-300 ${c.border} ${isActive ? (lamp.color.active.bg + ' ' + lamp.color.active.glow) : lamp.color.bg} ${!isActive ? 'opacity-40 group-hover:opacity-70 group-hover:scale-105' : ''}`}>
                    {/* Reflejo interior */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${
                      lamp.status === 'inactive' ? 'from-slate-400/15' :
                      lamp.status === 'intermediate' ? 'from-amber-400/25' : 'from-teal-400/30'
                    } to-transparent`} />
                    {/* Brillo especular */}
                    <div className="absolute top-2 left-3 h-4 w-7 rounded-full bg-white/10 blur-[2px] -rotate-12" />
                    {/* Núcleo luminoso */}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`h-8 w-8 rounded-full blur-xl ${
                          lamp.status === 'inactive' ? 'bg-slate-300/30' :
                          lamp.status === 'intermediate' ? 'bg-amber-300/40' : 'bg-teal-300/50'
                        } animate-pulse`} />
                      </div>
                    )}
                  </div>

                  {/* Label flotante a la derecha */}
                  <div className="absolute left-[72px] top-1/2 -translate-y-1/2 w-36 text-left pointer-events-none">
                    <p className={`text-[10px] font-black tracking-wide leading-tight ${isActive ? c.text : lamp.color.text} transition-colors`}>
                      {lamp.label}
                    </p>
                    <p className={`text-[9px] leading-tight mt-0.5 ${isActive ? 'text-white/60' : 'text-slate-600'} transition-colors`}>
                      {lamp.sublabel}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Toggle tienda */}
          {onToggleSeller && (
            <button
              onClick={() => { onToggleSeller(); onClose() }}
              className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl border transition-all text-[10px] font-black tracking-wide ${
                isSeller
                  ? 'border-orange-400 bg-orange-900/40 text-orange-300 shadow-[0_0_16px_rgba(251,146,60,0.3)]'
                  : 'border-slate-600/50 bg-slate-800/40 text-slate-500 hover:text-orange-400 hover:border-orange-500/50'
              }`}
            >
              <span>🛒</span>
              <span>{isSeller ? 'Tienda ON' : 'Tienda OFF'}</span>
            </button>
          )}

          {/* Pie del semáforo */}
          <div className="mt-3 flex justify-center">
            <span className="text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase italic">JobsHours</span>
          </div>
        </div>

        {/* Poste */}
        <div className="mx-auto h-6 w-3 bg-gradient-to-b from-slate-700 to-transparent opacity-50 rounded-b-sm" />
      </div>
    </div>
  )
}
