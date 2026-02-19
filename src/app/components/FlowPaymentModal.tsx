'use client'

import { useState } from 'react'

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

  const handlePay = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError('Debes iniciar sesión para realizar el pago')
        setLoading(false)
        return
      }

      const response = await fetch('/api/v1/payments/flow/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_request_id: serviceRequestId,
          amount: amount,
        }),
      })

      const data = await response.json()

      if (data.success && data.url && data.token) {
        // Redirigir a Flow
        window.location.href = data.url + '?token=' + data.token
      } else {
        setError(data.message || 'Error al crear el pago')
        setLoading(false)
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta nuevamente.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl">Pagar Servicio</h3>
              <p className="text-white/90 text-sm mt-1">Pago seguro con Flow</p>
            </div>
            <button
              onClick={onClose}
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

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <span className="text-gray-700 font-semibold">Total a pagar:</span>
            <span className="text-2xl font-black text-green-600">
              ${amount.toLocaleString('es-CL')}
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div>
                <p className="font-bold text-blue-900 text-sm mb-1">Pago Seguro</p>
                <p className="text-xs text-blue-700">
                  Serás redirigido a Flow para completar el pago de forma segura. 
                  Aceptamos WebPay, tarjetas de crédito y débito.
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
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
