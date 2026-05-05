'use client'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  prefersMercadoPagoGateway,
  getMercadoPagoPublicKeyFromEnv,
  fetchMercadoPagoBrickConfig,
} from '@/lib/paymentGateway'

const MercadoPagoPayment = dynamic(() => import('./MercadoPagoPayment'), { ssr: false })

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  serviceRequestId: number
  amount: number
  workerName: string
  description: string
  userToken: string
}

export default function PaymentModal({
  isOpen,
  onClose,
  serviceRequestId,
  amount,
  workerName,
  description,
  userToken,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const envMpKey = useMemo(() => getMercadoPagoPublicKeyFromEnv(), [])
  const [remoteMpKey, setRemoteMpKey] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) {
      setRemoteMpKey(undefined)
      return
    }
    if (!prefersMercadoPagoGateway() || envMpKey) {
      return
    }
    let cancelled = false
    void fetchMercadoPagoBrickConfig(userToken).then((k) => {
      if (!cancelled) setRemoteMpKey(k || '')
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, userToken, envMpKey])

  if (!isOpen) return null

  // Mercado Pago es la unica pasarela activa.
  if (prefersMercadoPagoGateway()) {
    const mpKey = envMpKey || (remoteMpKey ?? '')
    if (!envMpKey && remoteMpKey === undefined) {
      return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300 text-sm">Cargando pago seguro…</p>
            <button type="button" onClick={onClose} className={uiTone.modalCancelMuted}>
              {surfaceCopy.cancel}
            </button>
          </div>
        </div>
      )
    }
    if (mpKey) {
      return (
        <MercadoPagoPayment
          serviceRequestId={serviceRequestId}
          amount={amount}
          publicKey={mpKey}
          onSuccess={() => onClose()}
          onError={(msg: string) => setError(msg)}
          onClose={onClose}
        />
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-[90%] max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${uiTone.paymentHeaderStrip} p-5`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              💳
            </div>
            <div>
              <h3 className="text-white font-bold text-lg capitalize">{surfaceCopy.paymentTitle}</h3>
              <p className="text-white/80 text-sm">{workerName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Descripción */}
          {description && (
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1 capitalize">{surfaceCopy.serviceShortLabel}</p>
              <p className="text-slate-200 text-sm leading-snug line-clamp-2">{description}</p>
            </div>
          )}

          {/* Monto */}
          <div className={uiTone.paymentAmountPanelDark}>
            <p className="text-slate-400 text-xs mb-1">{surfaceCopy.totalToPayShort}</p>
            <p className={uiTone.paymentAmountTextDark}>
              ${Math.round(amount).toLocaleString('es-CL')}
            </p>
            <p className="text-slate-500 text-xs mt-1">{surfaceCopy.clpViaFlow}</p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
            <p className="text-amber-300 text-sm font-semibold">
              Mercado Pago no esta disponible en este momento.
            </p>
            <p className="text-amber-200/80 text-xs mt-1">
              Intentalo de nuevo en unos segundos.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={uiTone.modalCancelMuted}
          >
            {surfaceCopy.cancel}
          </button>
          <button type="button" onClick={onClose} disabled={loading} className={uiTone.ctaPayFlow}>
            <span>{surfaceCopy.close}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
