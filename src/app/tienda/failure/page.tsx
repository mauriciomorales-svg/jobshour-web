'use client'

import Link from 'next/link'
import LegalSupportLinks from '@/app/components/LegalSupportLinks'
import { surfaceCopy } from '@/lib/userFacingCopy'

export default function TiendaFailure() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900/90 shadow-2xl p-7">
        <div className="text-7xl mb-4" aria-hidden>
          ❌
        </div>
        <h1 className="text-white text-3xl font-black mb-2">Pago rechazado</h1>
        <p className="text-slate-300 text-base mb-2">No se pudo procesar tu pago.</p>
        <p className="text-slate-400 text-sm mb-4">Prueba otro medio o vuelve a intentar en unos minutos.</p>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">{surfaceCopy.mvpPaymentDisputeHint}</p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-xl font-bold transition"
        >
          Volver a la tienda
        </button>
        <Link href="/" className="inline-block mt-3 text-xs font-bold text-teal-400 hover:underline">
          Ir al inicio
        </Link>
        <div className="mt-6 pt-4 border-t border-slate-700/60">
          <LegalSupportLinks variant="dark" className="text-center text-[11px] leading-relaxed" />
        </div>
      </div>
    </div>
  )
}
