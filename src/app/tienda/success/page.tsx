'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { buyerQuoteTimelineSteps, feedbackCopy } from '@/lib/userFacingCopy'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api'

function SuccessContent() {
  const params = useSearchParams()
  const orderIdFromUrl = params.get('external_reference')
  const confirmationCodeFromUrl = params.get('confirmation_code')

  const [code, setCode] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(orderIdFromUrl)
  const [resolvedConfirmationCode, setResolvedConfirmationCode] = useState<string | null>(confirmationCodeFromUrl)
  const [timeline, setTimeline] = useState<{
    order: {
      id: number
      status: string
      mp_status: string | null
      total: number
      delivery: boolean
      delivery_address: string | null
      items: any[]
      integrated_quote_id: number | null
      confirmed_at: string | null
      created_at: string
    }
    integrated_quote: {
      id: number
      status: string
      total_amount: number
      service_amount: number
      materials_amount: number
      delivery_amount: number
      tool_wear_amount: number
      service_type?: string | null
      service_description?: string | null
      wants_delivery: boolean
      items?: any[]
    } | null
    service_request: {
      id: number
      status: string
      offered_price: number | null
      completed_at: string | null
    } | null
  } | null>(null)

  const loadTimeline = async () => {
    if (!resolvedOrderId) return
    try {
      const r = await fetch(`${API_BASE}/v1/store/orders/${resolvedOrderId}`, {
        headers: { Accept: 'application/json' },
      })
      const data = await r.json()
      if (r.ok && data?.data?.order) setTimeline(data.data)
    } catch {
      // best-effort: si falla, igual deja que el usuario confirme con PIN
    }
  }

  const isClosed = timeline?.integrated_quote?.status === 'closed'
  const hasService = !!timeline?.integrated_quote && (
    (timeline.integrated_quote.service_amount ?? 0) > 0 ||
    !!timeline.integrated_quote.service_type ||
    !!timeline.integrated_quote.service_description
  )

  useEffect(() => {
    // fallback: permitir abrir /tienda/success sin query, usando último pedido local
    if (!resolvedOrderId && typeof window !== 'undefined') {
      try {
        const lastId = localStorage.getItem('last_store_order_id')
        const lastCode = localStorage.getItem('last_store_confirmation_code')
        if (lastId) setResolvedOrderId(lastId)
        if (lastCode && !resolvedConfirmationCode) setResolvedConfirmationCode(lastCode)
      } catch {}
    }
    if (!resolvedOrderId) return
    trackEvent('tienda_success_view', { order_id: resolvedOrderId })
    loadTimeline()

    const interval = window.setInterval(() => {
      if (!isClosed) loadTimeline()
    }, 5000)
    return () => window.clearInterval(interval)
  }, [resolvedOrderId, isClosed])

  const paymentDone = timeline?.order?.status === 'paid' || timeline?.integrated_quote?.status === 'paid'
  const materialsDone = timeline?.order?.status === 'confirmed' || timeline?.integrated_quote?.status === 'materials_confirmed' || timeline?.integrated_quote?.status === 'closed'
  const serviceDone = hasService && (
    timeline?.integrated_quote?.status === 'service_completed' ||
    timeline?.integrated_quote?.status === 'closed'
  )

  const canConfirm = !!timeline && ['pending', 'paid'].includes(timeline.order.status) && !materialsDone

  const handleConfirm = async () => {
    if (!resolvedOrderId) { setError('Pedido no válido'); return }
    if (code.length !== 4) { setError('Ingresa el código de 4 dígitos'); return }
    setConfirming(true)
    setError('')
    try {
      const r = await fetch(`${API_BASE}/v1/store/orders/${resolvedOrderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (r.ok) {
        setCode('')
        await loadTimeline()
      } else {
        setError(data.message || 'Código incorrecto')
      }
    } catch {
      setError(feedbackCopy.networkError)
    } finally {
      setConfirming(false)
    }
  }

  const Step = ({ done, title, desc }: { done: boolean, title: string, desc?: string }) => (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-teal-500/15 text-teal-300' : 'bg-slate-700/50 text-slate-300'}`}>
        <span className="text-xl">{done ? '✅' : '⏳'}</span>
      </div>
      <div>
        <p className="text-white font-black text-sm">{title}</p>
        {desc && <p className="text-slate-400 text-xs mt-0.5">{desc}</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
      <div className="w-full max-w-md">
        <div className="text-7xl mb-3">{isClosed ? '🎉' : paymentDone ? '✅' : '⏳'}</div>
        <h1 className="text-white text-2xl sm:text-3xl font-black mb-2">
          {isClosed ? 'Cotización cerrada' : paymentDone ? 'Pago aprobado' : 'Procesando pago'}
        </h1>
        <p className="text-slate-300 text-sm sm:text-base mb-6">
          {hasService
            ? 'Materiales + servicio coordinados por el trabajador.'
            : 'Materiales listos. Solo confirma con PIN cuando recibas.'}
        </p>

        <div className="bg-slate-800 rounded-2xl p-5 text-left">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Total</p>
              <p className="text-white font-black text-lg mt-1">
                ${Math.round(timeline?.integrated_quote?.total_amount ?? timeline?.order?.total ?? 0).toLocaleString('es-CL')}
              </p>
            </div>
            {resolvedConfirmationCode && !materialsDone && (
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Tu código</p>
                <div className="text-3xl font-black text-teal-400 tracking-widest mt-1">
                  {resolvedConfirmationCode}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Step
              done={paymentDone}
              title={buyerQuoteTimelineSteps.payment.title}
              desc={paymentDone ? buyerQuoteTimelineSteps.payment.done : buyerQuoteTimelineSteps.payment.pending}
            />
            <Step
              done={materialsDone}
              title={buyerQuoteTimelineSteps.materials.title}
              desc={materialsDone ? buyerQuoteTimelineSteps.materials.done : buyerQuoteTimelineSteps.materials.pending}
            />
            {hasService && (
              <Step
                done={serviceDone}
                title={buyerQuoteTimelineSteps.service.title}
                desc={serviceDone ? buyerQuoteTimelineSteps.service.done : buyerQuoteTimelineSteps.service.pending}
              />
            )}
            <Step
              done={isClosed}
              title={buyerQuoteTimelineSteps.closed.title}
              desc={isClosed ? buyerQuoteTimelineSteps.closed.done : buyerQuoteTimelineSteps.closed.pending}
            />
          </div>
        </div>

        {!materialsDone && (
          <div className="bg-slate-800 rounded-2xl p-6 text-left mt-4">
            <p className="text-white font-bold mb-3">¿Ya recibiste el producto / materiales?</p>
            {canConfirm ? (
              <>
                <input
                  type="text"
                  maxLength={4}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Código de 4 dígitos"
                  className="w-full bg-slate-700 text-white text-center text-2xl tracking-widest rounded-xl px-4 py-3 mb-3 outline-none border border-slate-600 focus:border-teal-400"
                />
                {error && <p className="text-red-400 text-sm mb-3" role="alert">{error}</p>}
                <button
                  onClick={handleConfirm}
                  disabled={confirming || code.length !== 4}
                  className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-lg transition"
                >
                  {confirming ? 'Confirmando...' : 'Confirmar recepción'}
                </button>
              </>
            ) : (
              <p className="text-slate-400 text-sm">
                {timeline?.order?.status === 'expired'
                  ? 'Este pedido expiró.'
                  : 'Esperando que el pago quede confirmado para habilitar el PIN.'}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <a href="https://jobshours.com" className="text-teal-400 text-sm font-bold hover:underline">
            Volver a JobsHours
          </a>
        </div>
      </div>
    </div>
  )
}

export default function TiendaSuccess() {
  return <Suspense><SuccessContent /></Suspense>
}
