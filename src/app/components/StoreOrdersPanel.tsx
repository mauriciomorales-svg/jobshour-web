'use client'

import { useEffect, useState } from 'react'
import { Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import {
  emptyStateCopy,
  feedbackCopy,
  mpPaymentLabel,
  surfaceCopy,
  workerQuoteTimelineSteps,
} from '@/lib/userFacingCopy'
import { ModalShell } from '@/app/components/ui/ModalShell'
import { StatusBadge } from '@/app/components/ui/StatusBadge'

interface OrderItem {
  idproducto: number
  nombre: string
  cantidad: number
  precio: number
}

interface StoreOrder {
  id: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
  items: OrderItem[]
  total: number
  delivery: boolean
  delivery_address: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'expired' | 'paid'
  mp_status: string | null
  expires_at: string
  confirmed_at: string | null
  rejected_at: string | null
  reject_reason: string | null
  created_at: string
  integrated_quote_id?: number | null
  integrated_quote?: {
    id: number
    status: string
    service_amount: number
    service_type?: string | null
    service_description?: string | null
  } | null
  service_request?: {
    id: number
    status: string
    offered_price: number | null
    completed_at: string | null
  } | null
}

interface WorkerQuote {
  id: number
  status: string
  total_amount: number
  buyer_name: string | null
  buyer_email: string | null
  expires_at: string | null
  expired: boolean
  public_url: string | null
  payment_link: string | null
  store_order: {
    id: number
    status: string
    mp_status: string | null
  } | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expirado'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}m restantes`
}

function hasService(order: StoreOrder): boolean {
  const q = order.integrated_quote
  if (!q) return false
  return (q.service_amount ?? 0) > 0 || !!q.service_type || !!q.service_description
}

function quoteStepState(order: StoreOrder) {
  const q = order.integrated_quote
  const withService = hasService(order)
  const paymentDone = order.status === 'paid' || q?.status === 'paid'
  const materialsDone = order.status === 'confirmed' || q?.status === 'materials_confirmed' || q?.status === 'closed'
  const serviceDone = withService && (q?.status === 'service_completed' || q?.status === 'closed')
  const closed = q?.status === 'closed'
  return { withService, paymentDone, materialsDone, serviceDone, closed }
}

export default function StoreOrdersPanel({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [acting, setActing] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState<number | null>(null)
  const [showCodeInput, setShowCodeInput] = useState<number | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [quotes, setQuotes] = useState<WorkerQuote[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await apiFetch('/api/v1/store/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setOrders(data.data ?? [])

      const quotesRes = await apiFetch('/api/v1/integrated-quotes/worker', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const quotesData = await quotesRes.json()
      setQuotes(quotesData.data ?? [])
    } catch {
      setOrders([])
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    trackEvent('store_orders_panel_open', {})
  }, [])

  const confirm = async (id: number) => {
    setCodeError('')
    setActing(id)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await apiFetch(`/api/v1/store/orders/${id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode })
      })
      const data = await res.json()
      if (!res.ok) {
        setCodeError(data.message || 'Código incorrecto')
        return
      }
      setShowCodeInput(null)
      setConfirmCode('')
      await load()
    } finally {
      setActing(null)
    }
  }

  const reject = async (id: number) => {
    setActing(id)
    try {
      const token = localStorage.getItem('auth_token')
      await apiFetch(`/api/v1/store/orders/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || feedbackCopy.defaultRejectReason })
      })
      setShowRejectInput(null)
      setRejectReason('')
      await load()
    } finally {
      setActing(null)
    }
  }

  const pending = orders.filter(o => o.status === 'pending')
  const others  = orders.filter(o => o.status !== 'pending')

  return (
    <ModalShell
      onClose={onClose}
      titleId="store-orders-panel-title"
      title={surfaceCopy.modalTitleMyOrders}
      subtitle={
        pending.length > 0 ? (
          <span className="text-amber-400 font-bold">
            {pending.length} pedido(s) esperando confirmación
          </span>
        ) : undefined
      }
      variant="bottomSheet"
      bodyClassName="px-4 py-4 space-y-3"
    >
          {quotes.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{surfaceCopy.emittedQuotesSection}</p>
              <div className="space-y-2">
                {quotes.slice(0, 5).map((q) => (
                  <div key={q.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{q.buyer_name || 'Comprador'}</p>
                        <p className="text-[11px] text-slate-400">{q.buyer_email || emptyStateCopy.emailFallback}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-teal-400">{formatPrice(q.total_amount)}</p>
                        <div className="flex items-center justify-end gap-1 flex-wrap mt-0.5">
                          {q.expired ? (
                            <span className="text-[10px] font-bold text-red-400">Vencida</span>
                          ) : (
                            <StatusBadge kind="integrated_quote" status={q.status || 'quote_sent'} />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {q.public_url && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(q.public_url || '')
                            alert(surfaceCopy.quoteLinkCopiedAlert)
                          }}
                          className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold transition"
                        >
                          {surfaceCopy.copyLink}
                        </button>
                      )}
                      {q.store_order && (
                        <span className="text-[11px] text-teal-400 font-bold">
                          Pedido #{q.store_order.id} ({q.store_order.status})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">{surfaceCopy.emptyStoreOrdersTitle}</p>
              <p className="text-slate-600 text-xs mt-1">{surfaceCopy.emptyStoreOrdersHint}</p>
            </div>
          ) : (
            <>
              {/* Pendientes primero */}
              {pending.map(order => (
                <div key={order.id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-white font-black text-sm">{order.buyer_name}</p>
                        <p className="text-slate-400 text-xs">{order.buyer_email}</p>
                        {order.buyer_phone && <p className="text-slate-400 text-xs">{order.buyer_phone}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-amber-400 font-black text-base">{formatPrice(order.total)}</p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-amber-400">{timeLeft(order.expires_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-300">{item.cantidad}x {item.nombre}</span>
                          <span className="text-slate-400">{formatPrice(item.precio * item.cantidad)}</span>
                        </div>
                      ))}
                    </div>

                    {order.delivery && (
                      <p className="text-xs text-teal-400 mb-3">🚚 Delivery: {order.delivery_address}</p>
                    )}

                    {/* Estado de pago */}
                    {(order as { mp_status?: string }).mp_status !== 'approved' ? (
                      <div className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-lg" aria-hidden>⏳</span>
                        <p className="text-xs text-slate-300">
                          {mpPaymentLabel((order as { mp_status?: string }).mp_status)} — esperando acreditación para seguir.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-lg" aria-hidden>✅</span>
                        <p className="text-xs text-amber-400 font-bold">Pago listo. Pedí al comprador el código de 4 dígitos al entregar.</p>
                      </div>
                    )}

                    {order.integrated_quote_id && (
                      <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3 space-y-2">
                        {(() => {
                          const s = quoteStepState(order)
                          return (
                            <>
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Seguimiento del pedido</p>
                              <div className="text-xs text-slate-300 flex items-start gap-2">
                                <span aria-hidden>{s.paymentDone ? '✅' : '⏳'}</span>
                                <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.payment.short}</span> — {workerQuoteTimelineSteps.payment.detail(s.paymentDone)}</span>
                              </div>
                              <div className="text-xs text-slate-300 flex items-start gap-2">
                                <span aria-hidden>{s.materialsDone ? '✅' : '⏳'}</span>
                                <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.materials.short}</span> — {workerQuoteTimelineSteps.materials.detail(s.materialsDone)}</span>
                              </div>
                              {s.withService && (
                                <div className="text-xs text-slate-300 flex items-start gap-2">
                                  <span aria-hidden>{s.serviceDone ? '✅' : '⏳'}</span>
                                  <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.service.short}</span> — {workerQuoteTimelineSteps.service.detail(s.serviceDone)}</span>
                                </div>
                              )}
                              <div className="text-xs text-slate-300 flex items-start gap-2">
                                <span aria-hidden>{s.closed ? '✅' : '⏳'}</span>
                                <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.closed.short}</span> — {workerQuoteTimelineSteps.closed.detail(s.closed)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Botones confirmar/rechazar */}
                    {showCodeInput === order.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400">Pide el código de 4 dígitos al comprador</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={confirmCode}
                            onChange={e => { setConfirmCode(e.target.value.replace(/\D/g,'')); setCodeError('') }}
                            placeholder="0000"
                            className="flex-1 bg-slate-800 border border-slate-600 text-white text-center text-xl font-black rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-widest"
                          />
                        </div>
                        {codeError && <p className="text-red-400 text-xs">{codeError}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => { setShowCodeInput(null); setConfirmCode(''); setCodeError('') }}
                            className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition">
                            Cancelar
                          </button>
                          <button onClick={() => confirm(order.id)} disabled={acting === order.id || confirmCode.length !== 4}
                            className="py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-amber-500/20">
                            {acting === order.id ? '...' : '✅ Confirmar'}
                          </button>
                        </div>
                      </div>
                    ) : showRejectInput === order.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Motivo (opcional)"
                          className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setShowRejectInput(null)}
                            className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition">
                            Cancelar
                          </button>
                          <button onClick={() => reject(order.id)} disabled={acting === order.id}
                            className="py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                            {acting === order.id ? '...' : 'Confirmar rechazo'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setShowRejectInput(order.id)}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition">
                          <XCircle className="w-4 h-4" /> Rechazar
                        </button>
                        <button onClick={() => { setShowCodeInput(order.id); setConfirmCode(''); setCodeError('') }}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/20">
                          <CheckCircle className="w-4 h-4" /> Ingresar código
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Historial */}
              {others.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Historial</p>
                  {others.map(order => (
                    <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-2xl mb-2 overflow-hidden">
                      <button
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <StatusBadge kind="store_order" status={order.status} />
                          <span className="text-slate-300 text-sm font-bold">{order.buyer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm font-bold">{formatPrice(order.total)}</span>
                          {expanded === order.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>
                      {expanded === order.id && (
                        <div className="px-4 pb-4 space-y-1 border-t border-slate-700 pt-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-slate-400">{item.cantidad}x {item.nombre}</span>
                              <span className="text-slate-500">{formatPrice(item.precio * item.cantidad)}</span>
                            </div>
                          ))}
                          {order.reject_reason && (
                            <p className="text-xs text-red-400 mt-2">Motivo: {order.reject_reason}</p>
                          )}
                          {order.integrated_quote_id && (
                            <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3 space-y-2">
                              {(() => {
                                const s = quoteStepState(order)
                                return (
                                  <>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Seguimiento del pedido</p>
                                    <div className="text-xs text-slate-300 flex items-start gap-2">
                                      <span aria-hidden>{s.paymentDone ? '✅' : '⏳'}</span>
                                      <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.payment.short}</span> — {workerQuoteTimelineSteps.payment.detail(s.paymentDone)}</span>
                                    </div>
                                    <div className="text-xs text-slate-300 flex items-start gap-2">
                                      <span aria-hidden>{s.materialsDone ? '✅' : '⏳'}</span>
                                      <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.materials.short}</span> — {workerQuoteTimelineSteps.materials.detail(s.materialsDone)}</span>
                                    </div>
                                    {s.withService && (
                                      <div className="text-xs text-slate-300 flex items-start gap-2">
                                        <span aria-hidden>{s.serviceDone ? '✅' : '⏳'}</span>
                                        <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.service.short}</span> — {workerQuoteTimelineSteps.service.detail(s.serviceDone)}</span>
                                      </div>
                                    )}
                                    <div className="text-xs text-slate-300 flex items-start gap-2">
                                      <span aria-hidden>{s.closed ? '✅' : '⏳'}</span>
                                      <span><span className="font-bold text-slate-200">{workerQuoteTimelineSteps.closed.short}</span> — {workerQuoteTimelineSteps.closed.detail(s.closed)}</span>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
    </ModalShell>
  )
}
