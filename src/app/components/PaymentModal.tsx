'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

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

  const handlePay = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/v1/payments/flow/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          service_request_id: serviceRequestId,
          amount: Math.round(amount),
        }),
      })
      const data = await res.json()
      if (data.success && data.url) {
        // Redirigir a Flow
        window.location.href = data.url + '?token=' + data.token
      } else {
        setError(data.message || 'Error al iniciar el pago')
      }
    } catch {
      setError(feedbackCopy.networkErrorRetry)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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

          {/* Métodos aceptados */}
          <div className="flex items-center justify-center gap-3 text-slate-500 text-xs">
            <span>💳 Tarjeta</span>
            <span>•</span>
            <span>🏦 Transferencia</span>
            <span>•</span>
            <span>📱 Webpay</span>
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
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className={uiTone.ctaPayFlow}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{surfaceCopy.processing}</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>{surfaceCopy.payWithFlow}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
