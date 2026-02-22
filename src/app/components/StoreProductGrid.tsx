'use client'

import { useEffect, useState, useCallback } from 'react'
import { Package, Search, Loader2 } from 'lucide-react'
import { useStoreCart } from '@/lib/storeCartContext'

const INVENTARIO_API = 'http://64.227.55.223:8003/api'

interface Producto {
  idproducto: number
  nombre: string
  precio: number
  precio_venta?: number
  stock_actual: number
  activo: boolean
  imagen_url?: string
}

interface Props {
  workerId: number
  storeName?: string
}

function formatPrice(price: number) {
  return '$' + Math.round(price).toLocaleString('es-CL')
}

export default function StoreProductGrid({ workerId, storeName }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const { addToCart } = useStoreCart()

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      let url = `${INVENTARIO_API}/productos/buscar?limite=50`
      if (buscar) url += `&q=${encodeURIComponent(buscar)}`
      const res = await fetch(url)
      const data = await res.json()
      const lista = (data.data ?? []).filter((p: Producto) => p.activo && p.stock_actual > 0)
      setProductos(lista)
    } catch {
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [buscar])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🛒</span>
        <h3 className="font-black text-white text-sm">{storeName ?? 'Tienda del trabajador'}</h3>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full bg-slate-700 text-white text-sm pl-9 pr-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 placeholder-slate-400"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Sin productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {productos.map(p => (
            <div key={p.idproducto} className="bg-slate-700 rounded-xl overflow-hidden">
              {p.imagen_url ? (
                <img src={p.imagen_url} alt={p.nombre} className="w-full h-24 object-cover" />
              ) : (
                <div className="w-full h-24 bg-slate-600 flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="p-2">
                <p className="text-white text-xs font-bold line-clamp-2 mb-1">{p.nombre}</p>
                <p className="text-orange-400 text-sm font-black mb-2">{formatPrice(p.precio_venta ?? p.precio)}</p>
                <p className="text-slate-400 text-xs mb-2">{p.stock_actual} disponibles</p>
                <button
                  onClick={() => addToCart({
                    idproducto: p.idproducto,
                    nombre: p.nombre,
                    precio: p.precio_venta ?? p.precio,
                    imagen_url: p.imagen_url ?? null,
                    stock: p.stock_actual,
                    workerId,
                    storeName: storeName ?? 'Tienda',
                  })}
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold py-1.5 rounded-lg transition"
                >
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
