/** @deprecated Nombre histórico: delega en MercadoPagoPayment (única pasarela activa). */
'use client'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'
import {
  prefersMercadoPagoGateway,
  getMercadoPagoPublicKeyFromEnv,
  fetchMercadoPagoBrickConfig,
} from '@/lib/paymentGateway'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

const MercadoPagoPayment = dynamic(() => import('./MercadoPagoPayment'), { ssr: false })

interface FlowPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  serviceRequestId: number
  amount: number
  description?: string
  onSuccess?: () => void
}

export default function FlowPaymentModal({
  isOpen,
  onClose,
  serviceRequestId,
  amount,
  description,
  onSuccess,
}: FlowPaymentModalProps) {
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
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
    if (!token) {
      setRemoteMpKey('')
      return
    }
    let cancelled = false
    void fetchMercadoPagoBrickConfig(token).then((k) => {
      if (!cancelled) setRemoteMpKey(k || '')
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, envMpKey])

  if (!isOpen) return null

  if (prefersMercadoPagoGateway()) {
    const mpKey = envMpKey || (remoteMpKey ?? '')
    if (!envMpKey && remoteMpKey === undefined) {
      return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 text-sm text-center">Cargando pago seguro…</p>
            <button type="button" onClick={onClose} className={uiTone.modalCancelLight}>
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
          onSuccess={() => {
            onSuccess?.()
            onClose()
          }}
          onError={(msg) => setError(msg)}
          onClose={onClose}
        />
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${uiTone.paymentHeaderStrip} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl capitalize">{surfaceCopy.paymentTitle}</h3>
              <p className="text-white/90 text-sm mt-1">{surfaceCopy.paymentSecureTagline}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={surfaceCopy.close}
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {description && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          )}

          <div className={uiTone.paymentAmountPanelLight}>
            <span className="text-slate-700 font-semibold">{surfaceCopy.totalToPayColon}</span>
            <span className={uiTone.paymentAmountTextLight}>
              ${amount.toLocaleString('es-CL')}
            </span>
          </div>

          <div className={uiTone.surfaceInfoAmber}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div>
                <p className="font-bold text-amber-950 text-sm mb-1">{surfaceCopy.paymentSecureHeading}</p>
                <p className="text-xs text-amber-900">
                  Mercado Pago no esta disponible en este momento. Intentalo nuevamente en unos segundos.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={uiTone.modalCancelLight}
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
