'use client'
import { feedbackCopy } from '@/lib/userFacingCopy'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  serviceRequestId: number
  amount: number
  /** Si no se pasa, se usa NEXT_PUBLIC_MP_PUBLIC_KEY */
  publicKey?: string
  onSuccess: (paymentId: string) => void
  onError: (msg: string) => void
  onClose: () => void
}

declare global {
  interface Window {
    MercadoPago: any
  }
}

export default function MercadoPagoPayment({
  serviceRequestId,
  amount,
  publicKey: publicKeyProp,
  onSuccess,
  onError,
  onClose,
}: Props) {
  const brickRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  const effectiveKey = (publicKeyProp ?? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? '').trim()

  useEffect(() => {
    if (!effectiveKey) {
      setLoading(false)
      onErrorRef.current('Mercado Pago no está configurado (falta clave pública).')
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onerror = () => {
      setLoading(false)
      onErrorRef.current(
        'No se pudo cargar el formulario de Mercado Pago. Revisa bloqueadores de anuncios o tu conexión.'
      )
    }
    script.onload = () => {
      void (async () => {
        if (!window.MercadoPago) return
        const mp = new window.MercadoPago(effectiveKey, { locale: 'es-CL' })
        const bricks = mp.bricks()

        brickRef.current = await bricks.create('payment', 'mp-payment-brick', {
          initialization: {
            amount: amount,
            preferenceId: null,
          },
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
            },
            visual: {
              style: { theme: 'default' },
            },
          },
          callbacks: {
            onReady: () => setLoading(false),
            onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
              setProcessing(true)
              try {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
                const resolvedPaymentMethodId =
                  formData?.payment_method_id ||
                  selectedPaymentMethod?.id ||
                  selectedPaymentMethod?.payment_method_id ||
                  ''
                const resolvedInstallments = Number(formData?.installments ?? 1)
                const resolvedIssuerId = formData?.issuer_id ?? selectedPaymentMethod?.issuer_id ?? null
                const resolvedPayer = formData?.payer ?? {}
                const res = await apiFetch('/api/v1/payments/mp/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    service_request_id: serviceRequestId,
                    token: formData?.token,
                    payment_method_id: resolvedPaymentMethodId,
                    installments: Number.isFinite(resolvedInstallments) ? resolvedInstallments : 1,
                    issuer_id: resolvedIssuerId,
                    payer: resolvedPayer,
                  }),
                })
                const data = await res.json()
                if (data.status === 'success') {
                  onSuccessRef.current(data.payment_id)
                } else {
                  onErrorRef.current(data.message || 'Error al procesar el pago')
                }
              } catch (e) {
                onErrorRef.current(feedbackCopy.networkError)
              } finally {
                setProcessing(false)
              }
            },
            onError: (error: any) => {
              console.error('[MP Brick]', error)
              onErrorRef.current('Error en el formulario de pago')
            },
          },
        })
      })()
    }
    document.body.appendChild(script)
    return () => {
      brickRef.current?.unmount?.()
      brickRef.current = null
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [effectiveKey, amount, serviceRequestId])

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Pagar servicio</h2>
            <p className="text-sm text-gray-500">Total: <span className="font-bold text-amber-700">${Math.round(amount).toLocaleString('es-CL')}</span> <span className="text-xs">(incluye comisión 8%)</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brick container */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {processing && (
            <div className="flex items-center justify-center gap-2 py-4 text-amber-700 font-semibold">
              <div className="w-5 h-5 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Procesando pago...
            </div>
          )}
          <div id="mp-payment-brick" ref={containerRef} />
        </div>

        <p className="text-center text-xs text-gray-400 pb-4 px-4">
          🔒 Pago seguro con Mercado Pago. Los fondos se retienen hasta confirmar el servicio.
        </p>
      </div>
    </div>
  )
}
