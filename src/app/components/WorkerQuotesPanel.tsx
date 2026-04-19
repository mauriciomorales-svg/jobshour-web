'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, FileDown, Loader2, ChevronDown, ChevronUp, Link2, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { ModalShell } from '@/app/components/ui/ModalShell'
import { StatusBadge } from '@/app/components/ui/StatusBadge'
import { emptyStateCopy, feedbackCopy, labelIntegratedQuoteStatus, surfaceCopy } from '@/lib/userFacingCopy'
import { downloadBrandedQuotePdf } from '@/lib/brandedQuotePdf'
import { openWhatsAppWithText, whatsAppQuoteShareText } from '@/lib/marketingShare'

interface QuoteRow {
  id: number
  status: string
  total_amount: number
  materials_amount?: number
  service_amount?: number
  delivery_amount?: number
  tool_wear_amount?: number
  buyer_name?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  public_token?: string | null
  public_url?: string | null
  expires_at?: string | null
  expired?: boolean
  payment_link?: string | null
  created_at?: string
  items?: { type: string; title: string; quantity: number; unit_amount: number; subtotal_amount: number }[]
  store_order?: { id: number; status: string; mp_status: string | null } | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function WorkerQuotesPanel({ onClose }: { onClose: () => void }) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const res = await apiFetch('/api/v1/integrated-quotes/worker', {
        headers: { Authorization: `Bearer ${token ?? ''}`, Accept: 'application/json' },
      })
      const data = await res.json()
      setQuotes(Array.isArray(data.data) ? data.data : [])
    } catch {
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    trackEvent('worker_quotes_panel_open', {})
  }, [])

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => {},
      () => {}
    )
  }

  const downloadQuotePdf = (q: QuoteRow) => {
    try {
      trackEvent('quote_pdf_download', { source: 'worker_quotes_panel', quote_id: q.id })
      const extras: { label: string; amount: number }[] = []
      if (q.service_amount && q.service_amount > 0) {
        extras.push({ label: 'Servicio / mano de obra', amount: q.service_amount })
      }
      if (q.delivery_amount && q.delivery_amount > 0) {
        extras.push({ label: 'Delivery', amount: q.delivery_amount })
      }
      if (q.tool_wear_amount && q.tool_wear_amount > 0) {
        extras.push({ label: 'Herramientas / otros', amount: q.tool_wear_amount })
      }
      downloadBrandedQuotePdf({
        storeName: 'Tienda JobsHours',
        workerName: 'Tu tienda',
        buyerName: q.buyer_name || '—',
        buyerEmail: q.buyer_email || '—',
        buyerPhone: q.buyer_phone,
        rows: (q.items ?? []).map((it) => ({
          title: it.title,
          quantity: it.quantity,
          amount: it.subtotal_amount,
        })),
        extras,
        total: q.total_amount,
        expiresAt: q.expires_at,
        publicUrl: q.public_url || 'https://jobshours.com',
        quoteId: q.id,
        statusLabel: labelIntegratedQuoteStatus(q.status),
      })
    } catch {
      alert(feedbackCopy.pdfGenerateError)
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      titleId="worker-quotes-panel-title"
      title={
        <span className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-400 shrink-0" aria-hidden />
          {surfaceCopy.workerQuotesHeading}
        </span>
      }
      subtitle={surfaceCopy.workerQuotesSubtitle}
      variant="floating"
      showDragHandle
      bodyClassName="px-4 py-4 space-y-3"
      footer={
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={load}
            className="w-full text-sm font-bold text-teal-400 hover:text-teal-300 py-2"
          >
            {surfaceCopy.refreshList}
          </button>
        </div>
      }
    >
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">{surfaceCopy.emptyIntegratedQuotesTitle}</p>
              <p className="text-slate-600 text-xs mt-1">
                {surfaceCopy.quoteBuilderModeLead}{' '}
                <span className="text-orange-400 font-semibold">{surfaceCopy.quoteBuilderModeLabel}</span>{' '}
                {surfaceCopy.quoteBuilderModeTail}
              </p>
            </div>
          ) : (
            quotes.map((q) => (
              <div key={q.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  className="w-full flex items-start justify-between gap-2 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge kind="integrated_quote" status={q.status} />
                      {q.expired && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                          Expirada
                        </span>
                      )}
                    </div>
                    <p className="text-white font-bold text-sm truncate">{q.buyer_name || emptyStateCopy.buyerFallback}</p>
                    <p className="text-slate-500 text-xs truncate">{q.buyer_email}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-teal-400 font-black text-sm">{formatPrice(q.total_amount)}</span>
                    {expanded === q.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {expanded === q.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-700/80 pt-3">
                    {q.items && q.items.length > 0 && (
                      <div className="space-y-1">
                        {q.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-400">
                              {it.quantity}× {it.title}
                            </span>
                            <span className="text-slate-500">{formatPrice(it.subtotal_amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.expires_at && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Vence: {new Date(q.expires_at).toLocaleString('es-CL')}
                      </p>
                    )}

                    {q.public_url && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <a
                            href={q.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 rounded-xl py-2 hover:bg-teal-500/25 transition"
                          >
                            Abrir link público
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              copyLink(q.public_url!)
                              alert(surfaceCopy.linkCopiedAlert)
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200"
                            title="Copiar"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            trackEvent('marketing_share_whatsapp', {
                              context: 'worker_quotes_panel',
                              quote_id: q.id,
                            })
                            openWhatsAppWithText(
                              whatsAppQuoteShareText({
                                quoteUrl: q.public_url!,
                                storeName: 'Tu tienda JobsHours',
                                totalFormatted: formatPrice(q.total_amount),
                              })
                            )
                          }}
                          className="w-full text-center text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/35 rounded-xl py-2 hover:bg-green-500/25 transition"
                        >
                          {surfaceCopy.shareViaWhatsApp}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => downloadQuotePdf(q)}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 transition"
                    >
                      <FileDown className="w-4 h-4 shrink-0" aria-hidden />
                      {surfaceCopy.downloadQuotePdf}
                    </button>

                    {q.store_order && (
                      <p className="text-[11px] text-slate-500">
                        Pedido #{q.store_order.id} · {q.store_order.status}
                        {q.store_order.mp_status ? ` · MP ${q.store_order.mp_status}` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
    </ModalShell>
  )
}
