'use client'

import { useEffect, useState } from 'react'
import { X, Package, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { apiFetch } from '@/lib/api'

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
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Pagado',     color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',  color: 'bg-red-100 text-red-700' },
  expired:   { label: 'Expirado',   color: 'bg-gray-100 text-gray-500' },
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

  const load = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await apiFetch('/api/v1/store/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setOrders(data.data ?? [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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
        body: JSON.stringify({ reason: rejectReason || 'Sin stock disponible' })
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
    <div className="fixed inset-0 z-[400] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">🛒 Mis Pedidos</h2>
            {pending.length > 0 && (
              <p className="text-xs text-amber-400 font-bold">{pending.length} pedido(s) esperando confirmación</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">Sin pedidos aún</p>
              <p className="text-slate-600 text-xs mt-1">Cuando alguien compre en tu tienda, aparecerá aquí</p>
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
                      <p className="text-xs text-blue-400 mb-3">🚚 Delivery: {order.delivery_address}</p>
                    )}

                    {/* Estado de pago */}
                    {(order as any).mp_status !== 'approved' ? (
                      <div className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-lg">⏳</span>
                        <p className="text-xs text-slate-400">Esperando que el comprador complete el pago</p>
                      </div>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                        <span className="text-lg">✅</span>
                        <p className="text-xs text-green-400 font-bold">Pago confirmado — ingresa el código del comprador</p>
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
                            className="flex-1 bg-slate-800 border border-slate-600 text-white text-center text-xl font-black rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 tracking-widest"
                          />
                        </div>
                        {codeError && <p className="text-red-400 text-xs">{codeError}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => { setShowCodeInput(null); setConfirmCode(''); setCodeError('') }}
                            className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition">
                            Cancelar
                          </button>
                          <button onClick={() => confirm(order.id)} disabled={acting === order.id || confirmCode.length !== 4}
                            className="py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
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
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition">
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
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_LABEL[order.status]?.color}`}>
                            {STATUS_LABEL[order.status]?.label}
                          </span>
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
