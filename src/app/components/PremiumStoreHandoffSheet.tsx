'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, Store, X } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { withShareUtm } from '@/lib/marketingShare'
import { surfaceCopy } from '@/lib/userFacingCopy'

export type PremiumStoreHandoff = {
  storeName: string
  externalUrl: string
  linkedWorkerId: number | null
}

export default function PremiumStoreHandoffSheet({
  state,
  onClose,
}: {
  state: PremiumStoreHandoff | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!state) return
    trackEvent('premium_store_handoff_open', {
      store: state.storeName,
      has_linked_worker: !!state.linkedWorkerId,
    })
  }, [state])

  if (!state) return null

  const openExternal = () => {
    const url = withShareUtm(state.externalUrl, 'premium_store_map')
    trackEvent('premium_store_external_click', { store: state.storeName })
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      /* */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-handoff-title"
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300/95">
              {surfaceCopy.premiumStoreHandoffBadge}
            </p>
            <h2 id="premium-handoff-title" className="text-lg font-black leading-tight mt-1 truncate">
              {state.storeName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
            aria-label={surfaceCopy.premiumStoreHandoffClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-white">{surfaceCopy.premiumStoreHandoffTitle}</span>{' '}
            <span className="text-slate-400">{surfaceCopy.premiumStoreHandoffBody}</span>
          </p>

          <button
            type="button"
            onClick={openExternal}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm shadow-lg shadow-orange-900/30 transition touch-manipulation"
          >
            <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
            {surfaceCopy.premiumStoreHandoffExternalCta}
          </button>

          {state.linkedWorkerId != null && state.linkedWorkerId > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-[11px] text-slate-400 leading-snug">{surfaceCopy.premiumStoreHandoffJobsHoursHint}</p>
              <Link
                href={`/tienda/${state.linkedWorkerId}`}
                onClick={() => {
                  trackEvent('premium_store_jobshours_tienda_click', {
                    worker_id: state.linkedWorkerId,
                    store: state.storeName,
                  })
                  onClose()
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition touch-manipulation"
              >
                <Store className="w-4 h-4 shrink-0" aria-hidden />
                {surfaceCopy.premiumStoreHandoffJobsHoursCta}
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition"
          >
            {surfaceCopy.premiumStoreHandoffClose}
          </button>
        </div>
      </div>
    </div>
  )
}
