'use client'

import { useEffect, useState, useCallback } from 'react'
import { Package, Search, Loader2, Share2, FileDown } from 'lucide-react'
import { useStoreCart } from '@/lib/storeCartContext'
import { emptyStateCopy } from '@/lib/userFacingCopy'
import { downloadBrandedProductPdf, type BrandedProductPdfTrust } from '@/lib/brandedProductPdf'
import { extractDeliveryBadgeFromDescription } from '@/lib/productShare'
import { openWhatsAppWithText, publicProductUrl, whatsAppProductShareText, withShareUtm } from '@/lib/marketingShare'
import { trackEvent } from '@/lib/analytics'
import { useSearchParams } from 'next/navigation'

const INVENTARIO_API = '/inventario'

interface Producto {
  idproducto: number
  nombre: string
  precio: number
  precio_venta?: number
  stock_actual: number
  activo: boolean
  imagen_url?: string
  descripcion?: string | null
  codigobarra?: string | null
}

interface Props {
  workerId: number
  storeName?: string
  /** Nombre del vendedor (persona); si falta, el PDF usa el nombre de tienda. */
  sellerName?: string
}

function formatPrice(price: number) {
  return '$' + Math.round(price).toLocaleString('es-CL')
}

export default function StoreProductGrid({ workerId, storeName, sellerName }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const { addToCart } = useStoreCart()
  const searchParams = useSearchParams()

  const shareProduct = async (p: Producto) => {
    const rawUrl = publicProductUrl(workerId, p.idproducto, p.nombre)
    const shareUrl = withShareUtm(rawUrl, 'product_share')
    const text = whatsAppProductShareText({
      productName: p.nombre,
      storeName: storeName ?? 'Tienda',
      priceFormatted: formatPrice(p.precio_venta ?? p.precio),
      productUrl: rawUrl,
    })

    if (navigator.share) {
      trackEvent('share_click', { workerId, productId: p.idproducto, channel: 'native' })
      await navigator.share({
        title: p.nombre,
        text,
        url: shareUrl,
      })
      return
    }

    trackEvent('whatsapp_share', { workerId, productId: p.idproducto, channel: 'fallback' })
    openWhatsAppWithText(text)
  }

  const downloadProductPdf = async (p: Producto) => {
    let trust: BrandedProductPdfTrust = {
      sellerVerified: false,
      sellerHasCheckout: false,
      delivery: extractDeliveryBadgeFromDescription(p.descripcion),
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const r = await fetch(`${origin}/api/v1/experts/${workerId}`, { headers: { Accept: 'application/json' } })
      const data = (await r.json()) as { status?: string; data?: { is_verified?: boolean; is_seller?: boolean } }
      if (data?.status === 'success' && data.data) {
        trust = {
          sellerVerified: Boolean(data.data.is_verified),
          sellerHasCheckout: Boolean(data.data.is_seller),
          delivery: extractDeliveryBadgeFromDescription(p.descripcion),
        }
      }
    } catch {
      /* trust ya tiene delivery desde descripcion y flags en false */
    }
    const displaySeller = (sellerName?.trim() || storeName?.trim() || 'Vendedor')
    await downloadBrandedProductPdf({
      storeName: storeName ?? 'Tienda',
      sellerName: displaySeller,
      productName: p.nombre,
      conditionLabel: 'Nuevo o usado (segun publicacion)',
      price: p.precio_venta ?? p.precio,
      description: p.descripcion,
      stock: p.stock_actual,
      productCode: p.codigobarra,
      publicUrl: withShareUtm(publicProductUrl(workerId, p.idproducto, p.nombre), 'product_pdf'),
      productImageUrl: p.imagen_url ?? null,
      template: 'premium',
      trust,
    })
  }

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      let url = `${INVENTARIO_API}/productos/buscar?worker_id=${workerId}&limite=50`
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
  }, [buscar, workerId])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  useEffect(() => {
    const addParam = Number(searchParams.get('addProduct') || '')
    const fromShare = searchParams.get('fromShare') === '1'
    if (!addParam || productos.length === 0) return
    const key = `autocart_${workerId}_${addParam}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(key) === '1') return
    const p = productos.find(x => x.idproducto === addParam)
    if (!p) return
    addToCart({
      idproducto: p.idproducto,
      nombre: p.nombre,
      precio: p.precio_venta ?? p.precio,
      imagen_url: p.imagen_url ?? null,
      stock: p.stock_actual,
      workerId,
      storeName: storeName ?? 'Tienda',
    })
    if (fromShare) {
      trackEvent('checkout_from_share', { workerId, productId: p.idproducto, action: 'autocart' })
    }
    if (typeof window !== 'undefined') sessionStorage.setItem(key, '1')
  }, [searchParams, productos, addToCart, workerId, storeName])

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
          <p>{emptyStateCopy.noProducts}</p>
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
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => { void shareProduct(p) }}
                    className="inline-flex items-center justify-center gap-1 bg-slate-600 hover:bg-slate-500 text-white text-[11px] font-bold py-1.5 rounded-lg transition"
                  >
                    <Share2 className="w-3 h-3" /> Compartir
                  </button>
                  <button
                    onClick={() => { void downloadProductPdf(p) }}
                    className="inline-flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold py-1.5 rounded-lg transition"
                  >
                    <FileDown className="w-3 h-3" /> PDF
                  </button>
                </div>
                <a
                  href={publicProductUrl(workerId, p.idproducto, p.nombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block w-full text-center text-[11px] text-orange-300 hover:text-orange-200 underline"
                >
                  Ver ficha compartible
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
