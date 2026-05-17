'use client'

import { ShoppingCart } from 'lucide-react'

type Props = {
  cartCount: number
  onScrollCatalog: () => void
  onOpenCart: () => void
}

export default function TiendaBuyerBar({ cartCount, onScrollCatalog, onOpenCart }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 -mt-4 pb-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        <p className="w-full text-xs text-gray-500 sm:w-auto sm:flex-1">
          Explora el catálogo, arma tu carrito o pide una cotización al vendedor.
        </p>
        <button
          type="button"
          onClick={onScrollCatalog}
          className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
        >
          Ver catálogo
        </button>
        <button
          type="button"
          onClick={onOpenCart}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg transition"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Carrito{cartCount > 0 ? ` (${cartCount})` : ''}
        </button>
      </div>
    </div>
  )
}
