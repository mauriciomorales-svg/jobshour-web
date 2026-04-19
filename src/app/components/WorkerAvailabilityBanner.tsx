'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Retención trabajador: con categorías pero modo inactivo (plomo) — invita a activar disponibilidad en el mapa.
 * Eventos: `worker_availability_banner_view` | `worker_availability_banner_activate` | `worker_availability_banner_dismiss`
 */
export function WorkerAvailabilityBanner({
  hidden,
  stackAboveOtherBanner,
  onActivate,
  onDismiss,
}: {
  hidden: boolean
  /** Si hay otro cintillo (solicitudes), subimos este para no solapar */
  stackAboveOtherBanner: boolean
  onActivate: () => void
  onDismiss: () => void
}) {
  const wasVisibleRef = useRef(false)

  useEffect(() => {
    const visible = !hidden
    if (visible && !wasVisibleRef.current) {
      trackEvent('worker_availability_banner_view', {})
    }
    wasVisibleRef.current = visible
  }, [hidden])

  if (hidden) return null

  const bottom = stackAboveOtherBanner
    ? 'bottom-[220px] sm:bottom-[230px]'
    : 'bottom-[130px] sm:bottom-[140px]'

  return (
    <div
      className={`fixed left-1/2 z-[91] w-[min(92vw,420px)] -translate-x-1/2 px-2 ${bottom}`}
      role="status"
    >
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/35 bg-slate-900/95 px-3 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <span className="text-lg" aria-hidden>🟢</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-amber-200">¿Listo para trabajar?</p>
          <p className="text-[11px] text-slate-400">Activa disponibilidad para salir en el mapa</p>
        </div>
        <button
          type="button"
          onClick={() => {
            trackEvent('worker_availability_banner_activate', {})
            onActivate()
          }}
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 active:scale-[0.98]"
        >
          Activar
        </button>
        <button
          type="button"
          onClick={() => {
            trackEvent('worker_availability_banner_dismiss', {})
            onDismiss()
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-slate-300"
          aria-label="Ocultar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
