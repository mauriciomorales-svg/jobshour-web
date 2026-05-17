'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState } from 'react'
import { ArrowLeft, CreditCard, Truck } from 'lucide-react'
import { useStoreCart } from '@/lib/storeCartContext'
import { apiFetch } from '@/lib/api'
import { notifyUser } from '@/lib/notifyUser'

interface Props {
  onClose: () => void
  onBack: () => void
}

function formatPrice(price: number) {
  return '$' + Math.round(price).toLocaleString('es-CL')
}

export default function StoreCheckout({ onClose, onBack }: Props) {
  const { items, total, workerId, clearCart } = useStoreCart()
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [wantsDelivery, setWantsDelivery] = useState(false)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [payLink, setPayLink] = useState<string | null>(null)

  const commission = Math.round(total * 0.08)
  const totalWithCommission = total + commission

  const handlePay = async () => {
    if (!workerId) return
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      notifyUser('Ingresa nombre, correo y WhatsApp para continuar', 'warning')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await apiFetch('/api/v1/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          worker_id: workerId,
          items: items.map(i => ({ idproducto: i.idproducto, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
          total: totalWithCommission,
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim(),
          delivery: wantsDelivery,
          delivery_address: wantsDelivery ? address : null,
        }),
      })
      const data = await r.json()
      console.info('[StoreCheckout] create-order response', {
        httpStatus: r.status,
        ok: r.ok,
        orderId: data?.order_id ?? null,
        traceId: data?.trace_id ?? null,
        hasPaymentLink: Boolean(data?.payment_link),
        message: data?.message ?? null,
      })
      if (r.ok && data.payment_link) {
        try {
          localStorage.setItem('last_store_order_id', String(data?.order_id ?? ''))
          localStorage.setItem('last_store_confirmation_code', String(data?.confirmation_code ?? ''))
          localStorage.setItem('last_store_public_token', String(data?.public_token ?? ''))
        } catch {}
        setPayLink(data.payment_link)
        setDone(true)
        clearCart()
      } else {
        const traceHint = data?.trace_id ? ` (trace: ${data.trace_id})` : ''
        notifyUser((data.message || feedbackCopy.orderProcessError) + traceHint, 'error')
      }
    } catch {
      notifyUser(feedbackCopy.networkError, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (done && payLink) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-white font-black text-lg mb-1">¡Pedido creado!</h3>
          <p className="text-slate-400 text-sm mb-4">El trabajador fue notificado. Completa el pago para confirmar.</p>
          <a
            href={payLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`${uiTone.ctaPayCart} mb-3`}
          >
            Pagar {formatPrice(totalWithCommission)} →
          </a>
          <button type="button" onClick={onClose} className={uiTone.modalCloseGhost}>{surfaceCopy.close}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white font-black">Confirmar pedido</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Resumen */}
          <div className="bg-slate-700 rounded-xl p-3 space-y-1">
            {items.map(i => (
              <div key={i.idproducto} className="flex justify-between text-sm">
                <span className="text-slate-300">{i.nombre} x{i.cantidad}</span>
                <span className="text-white font-bold">{formatPrice(i.precio * i.cantidad)}</span>
              </div>
            ))}
            <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between text-xs text-slate-400">
              <span>Comisión plataforma (8%)</span>
              <span>{formatPrice(commission)}</span>
            </div>
            <div className="flex justify-between font-black text-white">
              <span>Total</span>
              <span className="text-orange-400">{formatPrice(totalWithCommission)}</span>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-slate-700 rounded-xl p-3">
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                placeholder="Tu nombre *"
                className="w-full bg-slate-600 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 placeholder-slate-400"
              />
              <input
                type="email"
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                placeholder="Tu correo *"
                className="w-full bg-slate-600 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 placeholder-slate-400"
              />
              <input
                type="tel"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                placeholder="Tu WhatsApp *"
                className="w-full bg-slate-600 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 placeholder-slate-400"
              />
            </div>
            <button
              onClick={() => setWantsDelivery(!wantsDelivery)}
              className={`flex items-center gap-2 w-full text-sm font-bold transition ${wantsDelivery ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <Truck className="w-4 h-4" />
              {wantsDelivery ? '✅ Con delivery' : 'Solicitar delivery (opcional)'}
            </button>
            {wantsDelivery && (
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Dirección de entrega..."
                className="mt-2 w-full bg-slate-600 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 placeholder-slate-400"
              />
            )}
          </div>

          {/* Pagar */}
          <button
            onClick={handlePay}
            disabled={loading || !buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim() || (wantsDelivery && !address.trim())}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? 'Procesando...' : `Pagar ${formatPrice(totalWithCommission)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
