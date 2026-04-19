'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Cintillo de retención: recuerda solicitudes activas sin ir a otro polling (usa count del hook de sync).
 * Eventos: `open_requests_banner_view` | `open_requests_banner_click` | `open_requests_banner_dismiss`
 */
export function OpenRequestsBanner({
  count,
  onOpen,
  onDismiss,
  hidden,
}: {
  count: number
  onOpen: () => void
  onDismiss: () => void
  hidden: boolean
}) {
  const wasVisibleRef = useRef(false)

  useEffect(() => {
    const visible = !hidden && count >= 1
    if (visible && !wasVisibleRef.current) {
      trackEvent('open_requests_banner_view', { count })
    }
    wasVisibleRef.current = visible
  }, [hidden, count])

  if (hidden || count < 1) return null

  return (
    <div
      className="fixed bottom-[130px] left-1/2 z-[92] w-[min(92vw,420px)] -translate-x-1/2 px-2 sm:bottom-[140px]"
      role="status"
    >
      <div className="flex items-center gap-2 rounded-xl border border-teal-500/35 bg-slate-900/95 px-3 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <span className="text-lg" aria-hidden>📋</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-teal-200">
            {count === 1 ? 'Tienes 1 solicitud activa' : `Tienes ${count} solicitudes activas`}
          </p>
          <p className="text-[11px] text-slate-400">Revisa el chat para no perder el contacto</p>
        </div>
        <button
          type="button"
          onClick={() => {
            trackEvent('open_requests_banner_click', { count })
            onOpen()
          }}
          className="shrink-0 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-black text-slate-950 active:scale-[0.98]"
        >
          Ver
        </button>
        <button
          type="button"
          onClick={() => {
            trackEvent('open_requests_banner_dismiss', { count })
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
