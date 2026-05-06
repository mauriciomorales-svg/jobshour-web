'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import html2canvas from 'html2canvas'
import { ArrowLeft, Share2, MessageCircle, FileDown, Package, ShoppingCart, BadgeCheck, Truck, ShieldCheck, ImageDown } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { downloadBrandedProductPdf } from '@/lib/brandedProductPdf'
import { conditionLabel, inferProductCondition, marketingCopyByCategory, ProductShareTemplate } from '@/lib/productShare'
import { openWhatsAppWithText, withShareUtm } from '@/lib/marketingShare'

const INVENTARIO_API = '/inventario'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')

type Product = {
  idproducto: number
  nombre: string
  descripcion?: string | null
  precio: number
  precio_venta?: number
  stock_actual?: number
  imagen_url?: string | null
  codigobarra?: string | null
}

type Worker = {
  id: number
  name: string
  store_name?: string | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function getSiteOriginSafe(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://jobshours.com'
}

function buildPublicProductUrl(workerId: number, productId: number, productName?: string | null): string {
  const safeName = (productName || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'producto'
  return `${getSiteOriginSafe()}/p/${workerId}-${productId}-${safeName}`
}

function buildWhatsAppProductShareText(opts: {
  productName: string
  storeName?: string | null
  priceFormatted?: string
  productUrl: string
}): string {
  const store = opts.storeName?.trim() || 'mi tienda'
  const price = opts.priceFormatted ? `\nPrecio: ${opts.priceFormatted}` : ''
  const url = withShareUtm(opts.productUrl, 'product_share')
  return `Te comparto este producto de ${store} en JobsHours:\n${opts.productName}${price}\nVer ficha:\n${url}`
}

export default function ProductShareView({ workerId, productId }: { workerId: number; productId: number }) {
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [error, setError] = useState('')
  const [template, setTemplate] = useState<ProductShareTemplate>('premium')
  const searchParams = useSearchParams()
  const cardRef = useRef<HTMLDivElement | null>(null)

  const publicUrl = useMemo(
    () => buildPublicProductUrl(workerId, productId, product?.nombre),
    [workerId, productId, product?.nombre]
  )
  const price = product ? (product.precio_venta ?? product.precio) : 0

  useEffect(() => {
    if (!workerId || !productId) return
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [pRes, wRes] = await Promise.all([
          fetch(`${INVENTARIO_API}/productos/buscar?worker_id=${workerId}&limite=200`),
          fetch(`${API_BASE}/api/v1/workers/${workerId}`),
        ])
        const pData = await pRes.json()
        const list = Array.isArray(pData.data) ? pData.data : []
        const found = list.find((p: Product) => Number(p.idproducto) === productId) || null
        const wData = await wRes.json().catch(() => null)
        if (!active) return
        setProduct(found)
        setWorker(wData?.data ?? null)
        if (!found) setError('Producto no encontrado en esta tienda')
        trackEvent('product_view_shared', { workerId, productId, found: !!found })
      } catch {
        if (!active) return
        setError('No se pudo cargar la ficha del producto')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [workerId, productId])

  useEffect(() => {
    const raw = (searchParams.get('tpl') || '').toLowerCase()
    if (raw === 'oferta') setTemplate('oferta')
    else if (raw === 'usado') setTemplate('minimal')
    else if (raw === 'premium') setTemplate('premium')
  }, [searchParams])

  const storeName = worker?.store_name || worker?.name || `Tienda ${workerId}`
  const cond = inferProductCondition(product?.descripcion)
  const cleanDescription = (product?.descripcion || '').replace(/\[estado:[^\]]+\]/i, '').trim()
  const autoCopy = product ? marketingCopyByCategory(product.nombre, product.descripcion) : ''

  const handleNativeShare = async () => {
    const shareUrl = withShareUtm(publicUrl, 'product_share')
    const text = `${product?.nombre ?? 'Producto'} en ${storeName} · ${formatPrice(price)}`
    trackEvent('share_click', { workerId, productId, channel: 'native' })
    if (navigator.share) {
      await navigator.share({ title: product?.nombre ?? 'Producto', text, url: shareUrl })
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    alert('Link copiado para compartir')
  }

  const handleWhatsApp = () => {
    if (!product) return
    trackEvent('whatsapp_share', { workerId, productId })
    openWhatsAppWithText(buildWhatsAppProductShareText({
      productName: product.nombre,
      storeName,
      priceFormatted: formatPrice(price),
      productUrl: publicUrl,
    }))
  }

  const handlePdf = async () => {
    if (!product) return
    trackEvent('pdf_download', { workerId, productId, format: 'a4' })
    await downloadBrandedProductPdf({
      storeName,
      sellerName: worker?.name || 'Vendedor',
      productName: product.nombre,
      conditionLabel: conditionLabel(cond),
      price,
      description: `${cleanDescription || ''} ${autoCopy}`.trim(),
      stock: product.stock_actual ?? null,
      productCode: product.codigobarra ?? null,
      publicUrl: withShareUtm(publicUrl, 'product_pdf'),
      productImageUrl: product.imagen_url || null,
      template,
    })
  }

  const handleStoryImage = async () => {
    if (!cardRef.current || !product) return
    trackEvent('pdf_download', { workerId, productId, format: 'story_image' })
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `story-${product.idproducto}.png`
    a.click()
  }

  const templateCls = template === 'premium'
    ? 'from-orange-500/20 to-slate-900 border-orange-500/40'
    : template === 'minimal'
      ? 'from-slate-700/20 to-slate-900 border-slate-600'
      : 'from-emerald-500/20 to-slate-900 border-emerald-500/40'

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-xl px-4 py-5 space-y-4">
        <Link href={`/tienda/${workerId}`} className="inline-flex items-center gap-2 text-slate-300 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a la tienda
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">Cargando ficha comercial...</div>
        ) : error || !product ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error || 'Producto no disponible'}</div>
        ) : (
          <>
            <section className="flex gap-2">
              {(['premium', 'minimal', 'oferta'] as ProductShareTemplate[]).map(t => (
                <button key={t} onClick={() => setTemplate(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${template === t ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {t}
                </button>
              ))}
            </section>

            <section ref={cardRef} className={`rounded-2xl border bg-gradient-to-b p-4 space-y-3 ${templateCls}`}>
              <p className="text-[11px] font-bold tracking-wide text-orange-300 uppercase">Publicado con JobsHours</p>
              <h1 className="text-2xl font-black">{product.nombre}</h1>
              <p className="text-sm text-slate-300">{storeName}</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-1"><BadgeCheck className="w-3 h-3 text-emerald-300" /> Vendedor verificado</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-1"><Truck className="w-3 h-3 text-orange-300" /> Entrega coordinable</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-1"><ShieldCheck className="w-3 h-3 text-cyan-300" /> Pago protegido</span>
              </div>
            </section>

            <section className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              {product.imagen_url ? (
                <img src={product.imagen_url} alt={product.nombre} className="w-full h-64 object-cover" />
              ) : (
                <div className="h-64 flex items-center justify-center bg-slate-800"><Package className="w-14 h-14 text-slate-600" /></div>
              )}
              <div className="p-4 space-y-3">
                <p className="text-3xl font-black text-orange-400">{formatPrice(price)}</p>
                <p className="text-xs text-slate-300">Estado: <span className="font-bold">{conditionLabel(cond)}</span></p>
                {typeof product.stock_actual === 'number' && <p className="text-xs text-slate-400">Stock disponible: {product.stock_actual}</p>}
                <p className="text-sm text-slate-200">{cleanDescription || autoCopy}</p>
                <p className="text-xs text-slate-400">{autoCopy}</p>
              </div>
            </section>

            <a
              href={`/tienda/${workerId}?addProduct=${product.idproducto}&fromShare=1`}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-black hover:bg-orange-400 transition"
              onClick={() => trackEvent('checkout_from_share', { workerId, productId })}
            >
              <ShoppingCart className="w-4 h-4" /> Comprar ahora
            </a>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={handleNativeShare} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-600 transition">
                <Share2 className="w-4 h-4" /> Compartir
              </button>
              <button onClick={handleWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 transition">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={handlePdf} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-600 transition">
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button onClick={handleStoryImage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold hover:bg-violet-600 transition">
                <ImageDown className="w-4 h-4" /> Story
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
