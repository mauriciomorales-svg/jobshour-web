'use client'

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
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-[90%] max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              💳
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Pagar Servicio</h3>
              <p className="text-white/80 text-sm">{workerName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Descripción */}
          {description && (
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Servicio</p>
              <p className="text-slate-200 text-sm leading-snug line-clamp-2">{description}</p>
            </div>
          )}

          {/* Monto */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Total a pagar</p>
            <p className="text-3xl font-black text-emerald-400">
              ${Math.round(amount).toLocaleString('es-CL')}
            </p>
            <p className="text-slate-500 text-xs mt-1">CLP · vía Flow</p>
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
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>Pagar con Flow</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
