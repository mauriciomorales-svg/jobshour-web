'use client'

import { useState } from 'react'
import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useStoreCart } from '@/lib/storeCartContext'
import StoreCheckout from './StoreCheckout'

interface Props {
  onClose: () => void
}

function formatPrice(price: number) {
  return '$' + Math.round(price).toLocaleString('es-CL')
}

export default function StoreCartDrawer({ onClose }: Props) {
  const { items, removeFromCart, updateQuantity, total, count, clearCart } = useStoreCart()
  const [showCheckout, setShowCheckout] = useState(false)

  if (showCheckout) {
    return <StoreCheckout onClose={onClose} onBack={() => setShowCheckout(false)} />
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
            <h2 className="text-white font-black">Tu carrito ({count})</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.idproducto} className="flex gap-3 bg-slate-700 rounded-xl p-3">
                {item.imagen_url ? (
                  <img src={item.imagen_url} alt={item.nombre} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-slate-600 rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold line-clamp-2">{item.nombre}</p>
                  <p className="text-orange-400 text-sm font-black mt-0.5">{formatPrice(item.precio)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.idproducto, item.cantidad - 1)} className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center text-white">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-white text-sm font-bold w-4 text-center">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.idproducto, item.cantidad + 1)} className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.idproducto)} className="ml-auto text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total</span>
              <span className="text-white font-black text-lg">{formatPrice(total)}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition"
            >
              Pagar ahora →
            </button>
            <button onClick={clearCart} className="w-full text-slate-400 hover:text-white text-xs transition">
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
