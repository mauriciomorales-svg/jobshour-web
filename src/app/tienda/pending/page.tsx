'use client'

import Link from 'next/link'
import LegalSupportLinks from '@/app/components/LegalSupportLinks'
import { surfaceCopy } from '@/lib/userFacingCopy'

export default function TiendaPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900/90 shadow-2xl p-7">
        <div className="text-7xl mb-4" aria-hidden>
          ⏳
        </div>
        <h1 className="text-white text-3xl font-black mb-2">Pago pendiente</h1>
        <p className="text-slate-300 text-base mb-2">Tu pago está siendo procesado.</p>
        <p className="text-slate-400 text-sm mb-4">Te notificaremos cuando se confirme y podrás seguir el estado desde la app.</p>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">{surfaceCopy.mvpPaymentDisputeHint}</p>
        <Link
          href="/"
          className="inline-block w-full bg-teal-500 hover:bg-teal-400 text-white px-8 py-3 rounded-xl font-bold transition text-center"
        >
          Volver a JobsHours
        </Link>
        <div className="mt-6 pt-4 border-t border-slate-700/60">
          <LegalSupportLinks variant="dark" className="text-center text-[11px] leading-relaxed" />
        </div>
      </div>
    </div>
  )
}
