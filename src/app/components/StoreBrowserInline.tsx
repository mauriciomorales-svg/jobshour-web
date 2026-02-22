'use client'

import { useEffect, useState } from 'react'
import { Search, Package, Store, Loader2 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api'
const INVENTARIO_API = 'http://64.227.55.223:8003/api'

interface Tienda {
  id: number
  name: string
  store_name: string
  avatar: string | null
  fresh_score: number
}

interface Producto {
  idproducto: number
  nombre: string
  precio: number
  precio_venta?: number
  stock_actual: number
  imagen_url?: string | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function StoreBrowserInline({ userLat, userLng }: { userLat: number; userLng: number }) {
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loadingTiendas, setLoadingTiendas] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<Tienda | null>(null)

  // Cargar tiendas cercanas
  useEffect(() => {
    setLoadingTiendas(true)
    fetch(`${API_BASE}/v1/experts/nearby?lat=${userLat}&lng=${userLng}&radius=50`)
      .then(r => r.json())
      .then(data => {
        const sellers = (data.data ?? []).filter((w: any) => w.is_seller)
        setTiendas(sellers)
      })
      .catch(() => setTiendas([]))
      .finally(() => setLoadingTiendas(false))
  }, [userLat, userLng])

  // Buscar productos cuando hay texto
  useEffect(() => {
    if (!buscar.trim()) { setProductos([]); return }
    setLoadingProductos(true)
    fetch(`${INVENTARIO_API}/productos/buscar?q=${encodeURIComponent(buscar)}&limite=20`)
      .then(r => r.json())
      .then(data => setProductos((data.data ?? []).filter((p: Producto) => p.stock_actual > 0)))
      .catch(() => setProductos([]))
      .finally(() => setLoadingProductos(false))
  }, [buscar])

  // Cargar productos de tienda seleccionada
  useEffect(() => {
    if (!tiendaSeleccionada) return
    setLoadingProductos(true)
    fetch(`${INVENTARIO_API}/productos/buscar?limite=20`)
      .then(r => r.json())
      .then(data => setProductos((data.data ?? []).filter((p: Producto) => p.stock_actual > 0)))
      .catch(() => setProductos([]))
      .finally(() => setLoadingProductos(false))
  }, [tiendaSeleccionada])

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={buscar}
          onChange={e => { setBuscar(e.target.value); setTiendaSeleccionada(null) }}
          placeholder="Buscar producto en tiendas cercanas..."
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />
      </div>

      {/* Resultados de búsqueda de producto */}
      {buscar.trim() && (
        <div>
          {loadingProductos ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>
          ) : productos.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-3">Sin resultados para "{buscar}"</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {productos.map(p => (
                <a key={p.idproducto} href={`/tienda/${tiendaSeleccionada?.id ?? tiendas[0]?.id ?? 2}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-xl p-2 transition">
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    : <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-slate-500" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{p.nombre}</p>
                    <p className="text-orange-400 text-xs font-black">{formatPrice(p.precio_venta ?? p.precio)}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">Ver →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de tiendas (cuando no hay búsqueda) */}
      {!buscar.trim() && (
        <div>
          {loadingTiendas ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>
          ) : tiendas.length === 0 ? (
            <div className="text-center py-4">
              <Store className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-slate-500 text-xs">No hay tiendas cercanas aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tiendas.map(t => (
                <a key={t.id} href={`/tienda/${t.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl p-2.5 transition">
                  {t.avatar
                    ? <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border-2 border-orange-400 shrink-0" />
                    : <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 text-base">🛒</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-black truncate">{t.store_name || t.name}</p>
                    <p className="text-slate-500 text-[10px]">por {t.name} · ⭐ {t.fresh_score?.toFixed(1)}</p>
                  </div>
                  <span className="text-orange-400 text-xs font-bold shrink-0">Ver →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
