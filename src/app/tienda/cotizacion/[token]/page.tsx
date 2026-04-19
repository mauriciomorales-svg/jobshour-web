'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock3, CreditCard, FileText, FileDown, Info, Loader2, MessageCircle } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { labelIntegratedQuoteStatus, feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { downloadBrandedQuotePdf } from '@/lib/brandedQuotePdf'
import { openWhatsAppWithText, whatsAppQuoteShareText } from '@/lib/marketingShare'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api'

type QuoteItem = {
  type: string
  title: string
  quantity: number
  unit_amount: number
  subtotal_amount: number
}

type QuotePayload = {
  quote: {
    id: number
    status: string
    total_amount: number
    service_amount: number
    service_type?: string | null
    service_description?: string | null
    buyer_name?: string | null
    buyer_email?: string | null
    buyer_phone?: string | null
    expires_at?: string | null
    payment_link?: string | null
    items: QuoteItem[]
  }
  worker: {
    id: number
    name?: string | null
    store_name?: string | null
  }
  store_order?: {
    id: number
    status: string
    mp_status: string | null
    confirmation_code?: string | null
  } | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function PublicQuotePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [data, setData] = useState<QuotePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/v1/integrated-quotes/public/${token}`, {
        headers: { Accept: 'application/json' },
      })
      const json = await r.json()
      if (!r.ok) {
        setError(json?.message || 'No se pudo cargar la cotización')
        return
      }

      const payload = json?.data as QuotePayload
      setData(payload)
      trackEvent('public_quote_view', {
        quote_id: payload.quote.id,
        status: payload.quote.status,
        worker_id: payload.worker.id,
      })
      setBuyerName(payload.quote.buyer_name ?? '')
      setBuyerEmail(payload.quote.buyer_email ?? '')
      setBuyerPhone(payload.quote.buyer_phone ?? '')
    } catch {
      setError(feedbackCopy.networkError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const isClosed = useMemo(() => {
    const status = data?.quote.status
    return status === 'closed' || status === 'materials_confirmed' || status === 'service_completed'
  }, [data])

  const canCheckout = useMemo(() => {
    if (!data) return false
    return ['quote_sent', 'awaiting_payment'].includes(data.quote.status)
  }, [data])

  const shareWhatsApp = () => {
    if (!data) return
    const url = typeof window !== 'undefined' ? window.location.href : 'https://jobshours.com'
    trackEvent('marketing_share_whatsapp', {
      context: 'public_quote',
      quote_id: data.quote.id,
      worker_id: data.worker.id,
    })
    openWhatsAppWithText(
      whatsAppQuoteShareText({
        quoteUrl: url,
        storeName: data.worker.store_name,
        totalFormatted: formatPrice(data.quote.total_amount),
      })
    )
  }

  const downloadPdf = () => {
    if (!data) return
    try {
      trackEvent('quote_pdf_download', { source: 'public_quote_page', quote_id: data.quote.id })
      const url = typeof window !== 'undefined' ? window.location.href : 'https://jobshours.com'
      downloadBrandedQuotePdf({
        storeName: data.worker.store_name || 'Tienda JobsHours',
        workerName: data.worker.name || '—',
        buyerName: data.quote.buyer_name || buyerName || '—',
        buyerEmail: data.quote.buyer_email || buyerEmail || '—',
        buyerPhone: data.quote.buyer_phone || buyerPhone || '',
        rows: data.quote.items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          amount: i.subtotal_amount,
        })),
        extras: [],
        total: data.quote.total_amount,
        expiresAt: data.quote.expires_at,
        publicUrl: url,
        quoteId: data.quote.id,
        statusLabel: labelIntegratedQuoteStatus(data.quote.status),
      })
    } catch {
      alert(feedbackCopy.pdfGenerateError)
    }
  }

  const doCheckout = async () => {
    if (!token || !data) return
    if (!buyerName.trim() || !buyerEmail.trim()) {
      alert(feedbackCopy.completeNameEmail)
      return
    }
    setProcessing(true)
    trackEvent('public_quote_checkout_click', { quote_id: data.quote.id })
    try {
      const r = await fetch(`${API_BASE}/v1/integrated-quotes/public/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim() || null,
        }),
      })
      const json = await r.json()
      if (!r.ok) {
        alert(json?.message || feedbackCopy.paymentStartFailed)
        return
      }
      if (json?.payment_link) {
        window.location.href = json.payment_link
      }
    } catch {
      alert(feedbackCopy.networkError)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-2">⚠️</p>
          <h1 className="font-black text-xl mb-2">Cotización no disponible</h1>
          <p className="text-slate-400 text-sm">{error || 'No encontrada'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Cotización</p>
              <h1 className="text-xl font-black mt-1">{data.worker.store_name || 'Tienda'}</h1>
              <p className="text-slate-400 text-sm">Preparada por {data.worker.name || 'trabajador'}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${isClosed ? 'bg-teal-500/15 text-teal-300 border-teal-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'}`}>
              {isClosed ? 'Cerrada' : labelIntegratedQuoteStatus(data.quote.status)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {data.quote.items.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="flex justify-between text-sm">
                <span className="text-slate-300">{item.quantity}x {item.title}</span>
                <span className="font-bold">{formatPrice(item.subtotal_amount)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total</span>
            <span className="text-teal-400 font-black text-2xl">{formatPrice(data.quote.total_amount)}</span>
          </div>

          {data.quote.expires_at && (
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5" />
              Válida hasta {new Date(data.quote.expires_at).toLocaleString('es-CL')}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-bold text-sm transition"
            >
              <FileDown className="w-4 h-4 shrink-0" aria-hidden />
              {surfaceCopy.downloadQuotePdf}
            </button>
            <button
              type="button"
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-300 font-bold text-sm transition"
            >
              <MessageCircle className="w-4 h-4 shrink-0" aria-hidden />
              {surfaceCopy.shareViaWhatsApp}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center">{surfaceCopy.quotePdfPoweredBy}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex gap-2 rounded-xl bg-slate-800/80 border border-slate-700/80 p-3 text-left">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" aria-hidden />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Al <strong className="text-slate-300">aceptar y pagar</strong>, se abre Mercado Pago con este total.
              Después seguirás el flujo habitual: confirmación de entrega con código si el pedido lo incluye.
            </p>
          </div>
          <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" aria-hidden /> Tus datos
          </p>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Nombre"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <input
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
          />

          {data.store_order?.confirmation_code && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
              <p className="text-xs text-teal-300">Tu código de entrega</p>
              <p className="text-3xl font-black text-teal-400 tracking-widest">{data.store_order.confirmation_code}</p>
            </div>
          )}

          <button
            type="button"
            onClick={doCheckout}
            disabled={!canCheckout || processing || isClosed}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 motion-safe:active:scale-[0.99]"
          >
            <CreditCard className="w-4 h-4" />
            {processing ? 'Generando pago...' : 'Aceptar y pagar cotización'}
          </button>

          {!canCheckout && (
            <p className="text-xs text-slate-500 text-center">
              Esta cotización ya inició/terminó su proceso de pago.
            </p>
          )}
        </div>

        {isClosed && (
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4 text-teal-200 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Proceso completado para esta cotización.
          </div>
        )}
      </div>
    </div>
  )
}

