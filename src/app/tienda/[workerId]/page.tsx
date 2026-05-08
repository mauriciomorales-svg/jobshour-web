'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { emptyStateCopy, feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { ShoppingCart, Search, Package, Minus, Plus, Trash2, X, Star, Loader2, ArrowLeft, CreditCard, Truck, CheckCircle, Edit2, Camera, Calculator, Mic, MicOff, Link2, FileText, Info, FileDown } from 'lucide-react'
import { downloadBrandedQuotePdf } from '@/lib/brandedQuotePdf'
import { displayPublicUrl, publicTiendaUrl, withShareUtm } from '@/lib/marketingShare'

// Misma lógica que page.tsx: base sin /api para llamadas a jobshours API
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')
const INVENTARIO_API = '/inventario'

async function parseApiJson<T extends Record<string, unknown>>(r: Response): Promise<{ data: T | null }> {
  const raw = await r.text()
  try {
    return { data: raw ? (JSON.parse(raw) as T) : null }
  } catch {
    return { data: null }
  }
}

interface Producto {
  idproducto: number
  nombre: string
  precio: number
  precio_venta?: number
  stock_actual: number
  activo: boolean
  imagen_url?: string | null
  descripcion?: string | null
  codigobarra?: string | null
  idcategoria?: number | null
}

interface CartItem extends Producto { cantidad: number }

interface QuotePdfSnapshot {
  worker: { store_name: string | null; name: string | null }
  buyer: { name: string; email: string; phone: string }
  lines: { nombre: string; cantidad: number; subtotal: number }[]
  cartTotal: number
  commission: number
  total: number
  laborEnabled: boolean
  laborAmountNum: number
  laborDesc: string
  deliveryBySeller: boolean
  deliveryFee: number
  publicUrl: string
  expiresAt: string | null
  quoteId?: number
}

interface WorkerInfo {
  id: number
  name: string
  avatar: string | null
  store_name: string | null
  fresh_score: number
  rating_count: number
  status: string
  category?: { name: string; color: string; icon: string } | null
}

function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function getLocalAnalyticsEventsFallback(): Array<{ name: string; payload?: Record<string, unknown>; t: number }> {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('jh_analytics_events')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildPublicProductUrl(workerId: number, productId: number, productName?: string | null): string {
  const safeName = (productName || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'producto'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jobshours.com'
  return `${origin}/p/${workerId}-${productId}-${safeName}`
}

function suggestProductTemplate(p: Producto): 'premium' | 'oferta' | 'usado' {
  const raw = `${p.nombre || ''} ${p.descripcion || ''}`.toLowerCase()
  if (/(usado|segunda mano|semi nuevo|seminuevo)/.test(raw)) return 'usado'
  if (/(oferta|promo|descuento|liquidacion|liquidación|rebaja)/.test(raw)) return 'oferta'
  return 'premium'
}

function extractDeliveryBadge(descripcion?: string | null): { enabled: boolean; fee: number } {
  const raw = (descripcion || '').toLowerCase()
  if (!raw.includes('delivery por vendedor: si')) return { enabled: false, fee: 0 }
  const feeMatch = raw.match(/\(\+\$?([0-9\.\,]+)/)
  const fee = feeMatch ? Number(String(feeMatch[1]).replace(/[^\d]/g, '')) || 0 : 0
  return { enabled: true, fee }
}

// ─── Hook reconocimiento de voz ───────────────────────────────────────────────
function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert(feedbackCopy.browserNoSpeech); return }
    const rec = new SR()
    rec.lang = 'es-CL'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop, toggle: () => listening ? stop() : start() }
}

// Botón micrófono reutilizable
function MicBtn({ onResult, className = '' }: { onResult: (t: string) => void; className?: string }) {
  const { listening, toggle } = useSpeech(onResult)
  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Detener' : 'Hablar'}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-orange-100 text-gray-400 hover:text-orange-500'} ${className}`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}

function QuickPublishModal({
  isOpen,
  onClose,
  workerId,
  storeName,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  workerId: number
  storeName?: string | null
  onSuccess: () => void
}) {
  const [tipo, setTipo] = useState<'producto' | 'lote'>('producto')
  const [titulo, setTitulo] = useState('')
  const [estado, setEstado] = useState<'nuevo' | 'usado' | 'para_reparar'>('usado')
  const [deliveryMode, setDeliveryMode] = useState<'retiro' | 'despacho' | 'conversable'>('conversable')
  const [deliveryBySeller, setDeliveryBySeller] = useState(true)
  const [deliveryExtra, setDeliveryExtra] = useState('')
  const [precio, setPrecio] = useState('')
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishedName, setPublishedName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setTipo('producto')
    setTitulo('')
    setEstado('usado')
    setDeliveryMode('conversable')
    setDeliveryBySeller(true)
    setDeliveryExtra('')
    setPrecio('')
    setImagen(null)
    setPreview('')
    setImageDataUrl('')
    setSaving(false)
    setError('')
    setPublishedUrl(null)
    setPublishedName('')
  }, [isOpen])

  const handleSubmit = async () => {
    const cleanTitle = titulo.trim()
    const cleanPrice = Math.round(Number(precio || 0))
    if (!cleanTitle) {
      setError('El titulo es obligatorio')
      return
    }
    if (!cleanPrice || cleanPrice <= 0) {
      setError('El precio debe ser mayor a 0')
      return
    }
    if (!imagen) {
      setError('Agrega una foto para publicar rapido')
      return
    }

    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const sku = `EXP-${Date.now()}`
      const finalTitle = tipo === 'lote' ? `Lote: ${cleanTitle}` : cleanTitle
      const deliveryLabel = deliveryMode === 'retiro'
        ? 'Retiro en domicilio'
        : deliveryMode === 'despacho'
          ? 'Despacho disponible'
          : 'Delivery conversable'
      const extraFee = Math.max(0, parseInt(deliveryExtra || '0', 10) || 0)
      const deliveryExtraText = deliveryBySeller
        ? ` Delivery por vendedor: si${extraFee > 0 ? ` (+${formatPrice(extraFee)})` : ''}.`
        : ' Delivery por vendedor: no.'
      const finalDescription = `Estado: ${estado}. Entrega: ${deliveryLabel}.${deliveryExtraText} Publicado con modo express (${tipo}).`
      const fd = new FormData()
      fd.append('nombre', finalTitle)
      fd.append('descripcion', finalDescription)
      fd.append('precio', String(cleanPrice))
      fd.append('precio_venta', String(cleanPrice))
      fd.append('stock_actual', '1')
      fd.append('worker_id', String(workerId))
      fd.append('codigobarra', sku)

      const r = await fetch(`${INVENTARIO_API}/worker-productos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.message || 'No se pudo publicar')

      if (imagen && data?.codigobarra) {
        const photoFd = new FormData()
        photoFd.append('foto', imagen)
        await fetch(`${INVENTARIO_API}/productos/${encodeURIComponent(data.codigobarra)}/foto`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: photoFd,
        })
      }

      const pid = Number(data?.idproducto || 0)
      const url = pid > 0
        ? buildPublicProductUrl(workerId, pid, finalTitle)
        : publicTiendaUrl(workerId)
      setPublishedName(finalTitle)
      setPublishedUrl(url)
      onSuccess()
    } catch (e: any) {
      setError(e?.message || 'No se pudo publicar')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!publishedUrl || !publishedName) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 14
    let y = 18

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Ficha de publicacion', margin, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Tienda: ${storeName || 'Mi tienda'}`, margin, y)
    y += 6
    doc.text(`Tipo: ${tipo === 'lote' ? 'Lote' : 'Producto'}`, margin, y)
    y += 6
    doc.text(`Titulo: ${publishedName}`, margin, y)
    y += 6
    doc.text(`Estado: ${estado === 'para_reparar' ? 'Para reparar' : estado === 'usado' ? 'Usado' : 'Nuevo'}`, margin, y)
    y += 6
    doc.text(
      `Entrega: ${deliveryMode === 'retiro' ? 'Retiro en domicilio' : deliveryMode === 'despacho' ? 'Despacho disponible' : 'Delivery conversable'}`,
      margin,
      y
    )
    y += 6
    const extraFeePdf = Math.max(0, parseInt(deliveryExtra || '0', 10) || 0)
    doc.text(`Delivery por vendedor: ${deliveryBySeller ? 'Si' : 'No'}`, margin, y)
    y += 6
    if (deliveryBySeller && extraFeePdf > 0) {
      doc.text(`Costo delivery adicional: ${formatPrice(extraFeePdf)}`, margin, y)
      y += 6
    }
    doc.text(`Precio: ${formatPrice(Number(precio || 0))}`, margin, y)
    y += 10

    if (imageDataUrl) {
      try {
        doc.addImage(imageDataUrl, 'JPEG', margin, y, 70, 52)
      } catch {
        // si la imagen no se puede incrustar, continuamos sin bloquear el PDF
      }
    }

    y += 60
    doc.setFont('helvetica', 'bold')
    doc.text('Link de la publicacion:', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(publishedUrl, 180)
    doc.text(wrapped, margin, y)
    y += 10 + wrapped.length * 5

    doc.setTextColor(90, 90, 90)
    doc.setFontSize(10)
    doc.text('Powered by JobsHours', margin, Math.min(y, 285))

    const fileName = `${publishedName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'publicacion'}-ficha.pdf`
    doc.save(fileName)
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[93vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Publicacion Express</h2>
            <p className="text-xs text-gray-500">Publica en menos de 30 segundos</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {publishedUrl ? (
            <div className="space-y-3">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-sm font-black text-teal-800">Publicado exitosamente</p>
                <p className="text-xs text-teal-700 mt-1 line-clamp-2">{publishedName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const store = storeName || 'Mi tienda'
                  const entrega = deliveryMode === 'retiro'
                    ? 'Retiro en domicilio'
                    : deliveryMode === 'despacho'
                      ? 'Despacho disponible'
                      : 'Delivery conversable'
                  const extraFeeWa = Math.max(0, parseInt(deliveryExtra || '0', 10) || 0)
                  const deliveryBySellerText = deliveryBySeller
                    ? `Delivery por vendedor${extraFeeWa > 0 ? ` (+${formatPrice(extraFeeWa)})` : ''}`
                    : 'Delivery por vendedor no incluido'
                  const text = `🛍️ ${publishedName}\n📍 ${store}\n🚚 ${entrega}\n${deliveryBySellerText}\n👉 Ver publicacion:\n${publishedUrl}`
                  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
                  window.open(wa, '_blank', 'noopener,noreferrer')
                }}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition"
              >
                Compartir por WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publishedUrl)
                  alert('Link copiado')
                }}
                className="w-full bg-white border border-orange-300 text-orange-600 font-bold py-2.5 rounded-xl transition hover:bg-orange-50"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl transition hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl transition hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('producto')}
                    className={`rounded-xl px-3 py-2 text-sm font-bold border ${tipo === 'producto' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    Producto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('lote')}
                    className={`rounded-xl px-3 py-2 text-sm font-bold border ${tipo === 'lote' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200'}`}
                  >
                    Lote
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Foto</label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 hover:border-orange-400 transition overflow-hidden"
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-500">Toca para subir foto</span>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setImagen(f)
                    setPreview(URL.createObjectURL(f))
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setImageDataUrl(result)
                    }
                    reader.readAsDataURL(f)
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Titulo</label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={tipo === 'lote' ? 'Ej: Reja usada + porton' : 'Ej: Reja usada'}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as 'nuevo' | 'usado' | 'para_reparar')}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="usado">Usado</option>
                  <option value="para_reparar">Para reparar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Entrega</label>
                <select
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value as 'retiro' | 'despacho' | 'conversable')}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                >
                  <option value="conversable">Delivery conversable</option>
                  <option value="retiro">Retiro en domicilio</option>
                  <option value="despacho">Despacho disponible</option>
                </select>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={deliveryBySeller}
                    onChange={(e) => setDeliveryBySeller(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Delivery por vendedor
                </label>
                {deliveryBySeller && (
                  <input
                    type="number"
                    value={deliveryExtra}
                    onChange={(e) => setDeliveryExtra(e.target.value)}
                    placeholder="Costo extra delivery (opcional)"
                    className="w-full bg-white border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    min={0}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Precio</label>
                <input
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Publicando...' : 'Publicar ahora'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Agregar Producto ───────────────────────────────────────────────────
function AddProductModal({ isOpen, onClose, workerId, onSuccess }: {
  isOpen: boolean; onClose: () => void; workerId: number; onSuccess: () => void
}) {
  const [form, setForm] = useState({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '', condition: 'nuevo' })
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categorias, setCategorias] = useState<{idcategoria: number, nombre: string}[]>([])
  const [categoria, setCategoria] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const precioNum = parseFloat(form.precio) || 0
  const precioVentaAuto = Math.round(precioNum * 1.10)
  const precioVentaFinal = parseFloat(form.precioVenta) || precioVentaAuto

  useEffect(() => {
    if (!isOpen) return
    setForm({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '', condition: 'nuevo' })
    setImagen(null); setPreview(''); setError(''); setCategoria('')
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json()).then(d => setCategorias(d.data ?? [])).catch(() => {})
  }, [isOpen, workerId])

  // Auto-calcular precio venta al cambiar precio costo
  useEffect(() => {
    if (precioNum > 0 && !form.precioVenta)
      setForm(f => ({ ...f, precioVenta: String(Math.round(precioNum * 1.10)) }))
  }, [form.precio])

  const handleFile = (f: File) => { setImagen(f); setPreview(URL.createObjectURL(f)) }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.precio.trim() || precioNum <= 0) { setError('El precio costo es obligatorio'); return }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('nombre', form.nombre.trim())
      const descWithCondition = `[estado:${form.condition}] ${form.descripcion.trim()}`.trim()
      fd.append('descripcion', descWithCondition)
      fd.append('precio', form.precio)
      fd.append('precio_venta', String(precioVentaFinal))
      fd.append('stock_actual', form.stock || '1')
      fd.append('worker_id', String(workerId))
      fd.append('codigobarra', form.codigo.trim() || `SKU-${Date.now()}`)
      if (categoria) fd.append('idcategoria', categoria)
      if (imagen) fd.append('foto', imagen)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${INVENTARIO_API}/worker-productos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message || 'Error al crear')

      // Subir foto separado usando el codigobarra guardado en BD
      if (imagen && data.codigobarra) {
        const ffd = new FormData()
        ffd.append('foto', imagen)
        await fetch(`${INVENTARIO_API}/productos/${encodeURIComponent(data.codigobarra)}/foto`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: ffd
        })
      }

      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inp = "w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[93vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Nuevo producto</h2>
            <p className="text-xs text-gray-400">Completa los datos para publicar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2">{error}</div>}

          {/* Imagen */}
          <div
            className="w-full h-36 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-orange-400 transition overflow-hidden"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? <img src={preview} className="w-full h-full object-cover" alt="preview" /> : (
              <div className="text-center text-gray-400">
                <Camera className="w-8 h-8 mx-auto mb-1" />
                <p className="text-xs font-semibold">Toca para subir imagen</p>
                <p className="text-xs opacity-60">JPG, PNG o HEIC</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {/* Código de barras */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Código de barras</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej: 7891234567890 (opcional)" value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                className={inp + " flex-1"} />
              <MicBtn onResult={t => setForm(f => ({ ...f, codigo: t }))} />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Nombre del producto *</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej: Polera nirvana talla M" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className={inp + " flex-1"} />
              <MicBtn onResult={t => setForm(f => ({ ...f, nombre: t }))} />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Descripción</label>
            <div className="flex gap-2 items-start">
              <textarea placeholder="Descripción breve del producto (opcional)" value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={2}
                className={inp + " resize-none flex-1"} />
              <MicBtn onResult={t => setForm(f => ({ ...f, descripcion: (f.descripcion ? f.descripcion + ' ' : '') + t }))} className="mt-0.5" />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inp}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Estado del producto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Estado</label>
            <select
              value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
              className={inp}
            >
              <option value="nuevo">Nuevo</option>
              <option value="seminuevo">Seminuevo</option>
              <option value="usado">Usado</option>
            </select>
          </div>

          {/* Precio costo + Precio venta + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Precio costo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                <input type="number" placeholder="0" value={form.precio} min="0"
                  onChange={e => setForm(f => ({ ...f, precio: e.target.value, precioVenta: '' }))}
                  className={inp + " pl-7"} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Precio venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                <input type="number" placeholder={precioNum > 0 ? String(precioVentaAuto) : '0'} value={form.precioVenta} min="0"
                  onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))}
                  className={inp + " pl-7"} />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Stock disponible</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, stock: String(Math.max(0, parseInt(f.stock||'0') - 1)) }))}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center font-black text-lg transition">−</button>
              <input type="number" value={form.stock} min="0"
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="flex-1 text-center font-black text-base bg-gray-50 border border-gray-200 rounded-xl py-2 outline-none focus:ring-2 focus:ring-orange-400" />
              <button type="button" onClick={() => setForm(f => ({ ...f, stock: String(parseInt(f.stock||'0') + 1) }))}
                className="w-9 h-9 rounded-lg bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center font-black text-lg transition">+</button>
            </div>
          </div>

          {/* Calculadora margen */}
          {precioNum > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
              <div className="flex items-center gap-1 font-bold text-orange-700 mb-2">
                <Calculator className="w-4 h-4" /> Margen de ganancia
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Precio costo</span><span className="font-bold">{formatPrice(precioNum)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Precio venta</span><span className="font-bold text-orange-600">{formatPrice(precioVentaFinal)}</span>
                </div>
                <div className="flex justify-between text-gray-700 border-t border-orange-200 pt-1 mt-1">
                  <span className="font-semibold">Ganancia por unidad</span>
                  <span className="font-black text-amber-700">{formatPrice(precioVentaFinal - precioNum)}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({precioNum > 0 ? Math.round(((precioVentaFinal - precioNum) / precioNum) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer fijo */}
        <div className="px-5 py-4 border-t bg-white">
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {surfaceCopy.saving}</> : surfaceCopy.publishProduct}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Modal Editar Producto (owner) ────────────────────────────────────────────
function EditProductModal({ producto, workerId, onClose, onSuccess }: {
  producto: Producto; workerId: number; onClose: () => void; onSuccess: () => void
}) {
  const [nombre, setNombre] = useState(producto.nombre)
  const [precio, setPrecio] = useState(String(producto.precio))
  const [stock, setStock] = useState(String(producto.stock_actual))
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState(producto.imagen_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categorias, setCategorias] = useState<{idcategoria: number, nombre: string}[]>([])
  const [categoria, setCategoria] = useState(String(producto.idcategoria ?? ''))
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json())
      .then(d => setCategorias(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

  const precioNum = parseFloat(precio) || 0
  const precioCliente = Math.round(precioNum * 1.10)

  const handleFile = (f: File) => { setImagen(f); setPreview(URL.createObjectURL(f)) }

  const handleSave = async () => {
    setSaving(true); setError('')
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      // 1. Actualizar datos (nombre, precio, stock)
      const r = await fetch(`${INVENTARIO_API}/worker-productos/${producto.idproducto}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          precio: Number(precio),
          precio_venta: precioCliente,
          stock_actual: Number(stock),
          worker_id: workerId,
          idcategoria: categoria ? Number(categoria) : null,
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message || 'Error al actualizar datos')

      // 2. Si hay imagen nueva, subirla por separado via /productos/{codigo}/foto
      if (imagen) {
        const codigo = producto.codigobarra || `SKU-${producto.idproducto}`
        const fd = new FormData()
        fd.append('foto', imagen)
        // El endpoint sobrescribe la imagen anterior del mismo código
        const ri = await fetch(`${INVENTARIO_API}/productos/${encodeURIComponent(codigo)}/foto`, {
          method: 'POST',
          headers: authHeaders,
          body: fd
        })
        if (!ri.ok) {
          const di = await ri.json().catch(() => ({}))
          throw new Error(di.message || 'Datos guardados, pero error al subir imagen')
        }
      }

      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="font-black text-gray-900">Editar producto</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Imagen */}
          <div
            className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-orange-400 transition overflow-hidden relative group"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? <img src={preview} className="w-full h-full object-cover" alt="" /> : (
              <div className="text-center text-gray-400"><Camera className="w-8 h-8 mx-auto mb-1" /><p className="text-xs">Cambiar imagen</p></div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.idcategoria} value={c.idcategoria}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Precio costo</label>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          {/* Calculadora */}
          {precioNum > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm space-y-1">
              <div className="flex items-center gap-1 font-bold text-orange-700 mb-1">
                <Calculator className="w-4 h-4" /> Calculadora de precio
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tu ganancia (100%)</span><span className="font-bold text-amber-700">{formatPrice(precioNum)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Precio cliente (+10%)</span><span className="font-bold text-orange-600">{formatPrice(precioCliente)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50">
            {saving ? surfaceCopy.saving : surfaceCopy.saveChanges}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TiendaPage() {
  const params = useParams()
  const workerId = Number(params.workerId)

  const [worker, setWorker] = useState<WorkerInfo | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [wantsDelivery, setWantsDelivery] = useState(false)
  const [address, setAddress] = useState('')
  const [sellerDoesDelivery, setSellerDoesDelivery] = useState(true)
  const [deliveryExtraFee, setDeliveryExtraFee] = useState('')
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(false)
  const [payLink, setPayLink] = useState<string | null>(null)
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null)
  const [laborEnabled, setLaborEnabled] = useState(false)
  const [laborAmount, setLaborAmount] = useState('')
  const [laborDesc, setLaborDesc] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [myWorkerId, setMyWorkerId] = useState<number | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [categorias, setCategorias] = useState<{idcategoria: number, nombre: string}[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null)
  const [showAddStoreCategory, setShowAddStoreCategory] = useState(false)
  const [newStoreCategory, setNewStoreCategory] = useState('')
  const [savingStoreCategory, setSavingStoreCategory] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showQuickPublish, setShowQuickPublish] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [tab, setTab] = useState<'catalogo' | 'stats'>('catalogo')
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [marketingStats, setMarketingStats] = useState<{
    views: number
    shares: number
    whatsapp: number
    pdf: number
    checkouts: number
    topProducts: Array<{ productId: number; name: string; touches: number }>
    lastUpdate: number | null
  } | null>(null)
  const [marketingDaily, setMarketingDaily] = useState<Array<{
    day: string
    views: number
    shares: number
    whatsapp: number
    pdf: number
    checkouts: number
  }>>([])
  const [marketingConversion, setMarketingConversion] = useState<{ share_to_checkout_rate: number; view_to_checkout_rate: number } | null>(null)
  const [checkoutMode, setCheckoutMode] = useState<'purchase' | 'quote'>('purchase')
  const [quoteExpiryHours, setQuoteExpiryHours] = useState('72')
  const [quotePublicUrl, setQuotePublicUrl] = useState<string | null>(null)
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<string | null>(null)
  const [quotePdfSnapshot, setQuotePdfSnapshot] = useState<QuotePdfSnapshot | null>(null)

  // Comprobar sesión — URL absoluta con origin actual (igual que servidor antiguo)
  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) { setLoggedIn(false); setMyWorkerId(null); return }
    const apiUrl = `${window.location.origin}/api`
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setLoggedIn(false); setMyWorkerId(null); return }
        setLoggedIn(true)
        if (data.name) setBuyerName(data.name)
        if (data.email) setBuyerEmail(data.email)
        if (data.phone) setBuyerPhone(data.phone ?? '')
        const wid = data.worker?.id != null ? Number(data.worker.id) : null
        if (wid != null) setMyWorkerId(wid)
      })
      .catch(() => { setLoggedIn(false); setMyWorkerId(null) })
  }, [])

  useEffect(() => {
    // Si llegamos con token en la URL (ej. redirect OAuth), guardarlo y usarlo
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get('token')
      const loginSuccess = params.get('login')
      if (tokenFromUrl && loginSuccess === 'success') {
        try {
          localStorage.setItem('auth_token', tokenFromUrl)
          window.history.replaceState({}, '', window.location.pathname)
        } catch (e) {}
      }
    }
    checkAuth()
  }, [checkAuth])

  // Re-comprobar sesión al volver a la pestaña (por si el usuario inició sesión en otra pestaña)
  useEffect(() => {
    const onFocus = () => checkAuth()
    window.addEventListener('focus', onFocus)
    const onVis = () => { if (document.visibilityState === 'visible') checkAuth() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [checkAuth])

  // Verificar ownership cuando myWorkerId y workerId estén disponibles (comparar como número)
  useEffect(() => {
    if (myWorkerId == null || workerId == null || Number.isNaN(workerId)) return
    if (Number(myWorkerId) === Number(workerId)) setIsOwner(true)
  }, [myWorkerId, workerId])

  // Stats (solo owner)
  const fetchStats = useCallback(async () => {
    if (!isOwner) return
    setLoadingStats(true)
    const token = typeof window !== 'undefined' ? (localStorage.getItem('auth_token') || localStorage.getItem('token')) : null
    try {
      const r = await fetch(`${INVENTARIO_API}/worker-stats/${workerId}`, {
        headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
      })
      const d = await r.json()
      if (d.success) setStats(d.data)
    } catch {}
    finally { setLoadingStats(false) }
  }, [isOwner, workerId])

  useEffect(() => { if (isOwner && tab === 'stats') fetchStats() }, [isOwner, tab])

  const fetchMarketingStats = useCallback(async () => {
    if (!isOwner || typeof window === 'undefined') return
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (token) {
      try {
        const r = await fetch(`${API_BASE}/api/v1/analytics/worker/${workerId}/summary?days=30`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        const d = await r.json()
        if (r.ok && d?.status === 'success' && d?.data) {
          const totals = d.data.totals ?? {}
          setMarketingStats({
            views: Number(totals.views ?? 0),
            shares: Number(totals.shares ?? 0),
            whatsapp: Number(totals.whatsapp ?? 0),
            pdf: Number(totals.pdf ?? 0),
            checkouts: Number(totals.checkouts ?? 0),
            topProducts: (d.data.top_products ?? []).map((p: any) => ({
              productId: Number(p.product_id ?? 0),
              name: (productos.find((x) => x.idproducto === Number(p.product_id))?.nombre) ?? `Producto #${p.product_id}`,
              touches: Number(p.touches ?? 0),
            })),
            lastUpdate: Date.now(),
          })
          setMarketingDaily((d.data.daily ?? []).map((row: any) => ({
            day: String(row.day),
            views: Number(row.views ?? 0),
            shares: Number(row.shares ?? 0),
            whatsapp: Number(row.whatsapp ?? 0),
            pdf: Number(row.pdf ?? 0),
            checkouts: Number(row.checkouts ?? 0),
          })))
          setMarketingConversion({
            share_to_checkout_rate: Number(d.data.conversion?.share_to_checkout_rate ?? 0),
            view_to_checkout_rate: Number(d.data.conversion?.view_to_checkout_rate ?? 0),
          })
          return
        }
      } catch {
        // fallback local below
      }
    }

    const events = getLocalAnalyticsEventsFallback()
    const filtered = events.filter((ev) => {
      const payload = ev.payload ?? {}
      const wid = Number(payload.workerId ?? payload.worker_id ?? 0)
      return wid === workerId
    })

    const views = filtered.filter((e) => e.name === 'product_view_shared').length
    const shares = filtered.filter((e) => e.name === 'share_click').length
    const whatsapp = filtered.filter((e) => e.name === 'whatsapp_share').length
    const pdf = filtered.filter((e) => e.name === 'pdf_download').length
    const checkouts = filtered.filter((e) => e.name === 'checkout_from_share').length

    const touchesByProduct = new Map<number, number>()
    for (const ev of filtered) {
      const pid = Number(ev.payload?.productId ?? ev.payload?.product_id ?? 0)
      if (!pid) continue
      touchesByProduct.set(pid, (touchesByProduct.get(pid) ?? 0) + 1)
    }
    const productNames = new Map(productos.map((p) => [p.idproducto, p.nombre] as const))
    const topProducts = Array.from(touchesByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, touches]) => ({
        productId,
        name: productNames.get(productId) ?? `Producto #${productId}`,
        touches,
      }))

    const lastUpdate = filtered.length > 0 ? Math.max(...filtered.map((e) => e.t)) : null
    setMarketingStats({ views, shares, whatsapp, pdf, checkouts, topProducts, lastUpdate })
    setMarketingDaily([])
    setMarketingConversion({
      share_to_checkout_rate: shares > 0 ? Number((checkouts / shares).toFixed(4)) : 0,
      view_to_checkout_rate: views > 0 ? Number((checkouts / views).toFixed(4)) : 0,
    })
  }, [isOwner, workerId, productos])

  useEffect(() => {
    if (isOwner && tab === 'stats') fetchMarketingStats()
  }, [isOwner, tab, fetchMarketingStats])

  // Worker info (mismo origen vía origin)
  useEffect(() => {
    if (!workerId || typeof window === 'undefined') return
    const apiUrl = `${window.location.origin}/api`
    fetch(`${apiUrl}/v1/experts/${workerId}`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => {
        if (data.data && data.data.is_seller) setWorker(data.data)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [workerId])

  useEffect(() => {
    if (!worker) return
    trackEvent('tienda_view', { worker_id: worker.id })
  }, [worker])

  // Categorías
  useEffect(() => {
    if (!workerId) return
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json()).then(data => setCategorias(data.data ?? [])).catch(() => {})
  }, [workerId])

  const handleAddStoreCategory = useCallback(async () => {
    if (!isOwner || !newStoreCategory.trim()) return
    setSavingStoreCategory(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${INVENTARIO_API}/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre: newStoreCategory.trim(),
          worker_id: workerId,
        }),
      })
      if (!r.ok) throw new Error('No se pudo crear la categoría')
      const refresh = await fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      const data = await refresh.json()
      setCategorias(data.data ?? [])
      setNewStoreCategory('')
      setShowAddStoreCategory(false)
    } catch {
      alert('No se pudo crear la categoría de tienda. Intenta nuevamente.')
    } finally {
      setSavingStoreCategory(false)
    }
  }, [isOwner, newStoreCategory, workerId])

  // Productos
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      let url = `${INVENTARIO_API}/productos/buscar?worker_id=${workerId}&limite=100`
      if (buscar) url += `&q=${encodeURIComponent(buscar)}`
      if (categoriaFiltro) url += `&categoria=${categoriaFiltro}`
      const r = await fetch(url)
      const data = await r.json()
      setProductos(data.data ?? [])
    } catch { setProductos([]) }
    finally { setLoading(false) }
  }, [buscar, workerId, categoriaFiltro])

  useEffect(() => { if (workerId) fetchProductos() }, [fetchProductos, workerId])

  // Cart
  const addToCart = (p: Producto) => {
    setCart(prev => {
      const ex = prev.find(i => i.idproducto === p.idproducto)
      if (ex) return prev.map(i => i.idproducto === p.idproducto ? { ...i, cantidad: Math.min(i.cantidad + 1, p.stock_actual) } : i)
      return [...prev, { ...p, cantidad: 1 }]
    })
  }
  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.idproducto !== id))
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return }
    setCart(prev => prev.map(i => i.idproducto === id ? { ...i, cantidad: Math.min(qty, i.stock_actual) } : i))
  }

  const shareSingleProduct = useCallback((p: Producto) => {
    const tpl = suggestProductTemplate(p)
    const base = buildPublicProductUrl(workerId, p.idproducto, p.nombre)
    const urlObj = new URL(base)
    urlObj.searchParams.set('tpl', tpl)
    const url = withShareUtm(urlObj.toString(), 'product_card')
    const store = worker?.store_name || worker?.name || 'Tienda'
    const text = `🛍️ ${p.nombre}\n💵 ${formatPrice(p.precio_venta ?? p.precio)}\n📍 Publicado con JobsHours en ${store}\n👉 Ver tarjeta y comprar:\n${url}`
    const canNative =
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      typeof (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share === 'function'

    trackEvent('marketing_share_producto', {
      worker_id: workerId,
      product_id: p.idproducto,
      via: canNative ? 'native' : 'clipboard',
    })

    if (canNative && navigator.share) {
      navigator.share({ title: p.nombre, text, url }).catch(() => {})
      return
    }

    navigator.clipboard.writeText(text)
    alert('Link del producto copiado')
  }, [worker?.name, worker?.store_name, workerId])
  const eliminarProducto = async (idproducto: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" de la tienda?`)) return
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      const r = await fetch(`${INVENTARIO_API}/worker-productos/${idproducto}?worker_id=${workerId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token ?? ''}` }
      })
      if (r.ok) fetchProductos()
      else alert(feedbackCopy.deleteFailed)
    } catch { alert(feedbackCopy.networkError) }
  }

  const cartTotal = cart.reduce((s, i) => s + (i.precio_venta ?? i.precio) * i.cantidad, 0)
  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0)
  const canUseCart = !isOwner || checkoutMode === 'quote'
  const commission = Math.round(cartTotal * 0.08)
  const laborAmountNum = Math.max(0, parseInt(laborAmount || '0', 10) || 0)
  const deliveryExtraFeeNum = Math.max(0, parseInt(deliveryExtraFee || '0', 10) || 0)
  const totalFinal = cartTotal + commission + (laborEnabled ? laborAmountNum : 0) + (wantsDelivery && sellerDoesDelivery ? deliveryExtraFeeNum : 0)

  const handlePay = async () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) { alert('Ingresa nombre, correo y WhatsApp para continuar'); return }
    setPaying(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const apiUrl = `${window.location.origin}/api`
      const r = await fetch(`${apiUrl}/v1/integrated-quotes/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          worker_id: workerId,
          items: cart.map(i => ({ idproducto: i.idproducto, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio_venta ?? i.precio })),
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim(),
          wants_delivery: wantsDelivery,
          delivery_address: wantsDelivery ? address : null,
          delivery_by_seller: wantsDelivery ? sellerDoesDelivery : false,
          delivery_fee: wantsDelivery && sellerDoesDelivery ? deliveryExtraFeeNum : 0,
          // Mano de obra opcional (servicio pre-asignado al mismo worker)
          service: laborEnabled ? {
            type: wantsDelivery ? 'express_errand' : 'fixed_job',
            description: laborDesc.trim() || null,
            offered_price: laborAmountNum,
          } : null,
        }),
      })
      const { data } = await parseApiJson<{ payment_link?: string; store_order_id?: number; order_id?: number; confirmation_code?: string; public_token?: string; quote_id?: number; message?: string }>(r)
      console.info('[StorePage] integrated checkout response', {
        httpStatus: r.status,
        ok: r.ok,
        orderId: data?.store_order_id ?? data?.order_id ?? null,
        quoteId: data?.quote_id ?? null,
        traceId: (data as { trace_id?: string } | null)?.trace_id ?? null,
        hasPaymentLink: Boolean(data?.payment_link),
        message: data?.message ?? null,
      })
      if (r.ok && data?.payment_link) {
        trackEvent('tienda_integrated_checkout_success', {
          worker_id: workerId,
          store_order_id: data.store_order_id,
          quote_id: data.quote_id,
        })
        setQuotePublicUrl(null)
        setQuoteExpiresAt(null)
        try {
          localStorage.setItem('last_store_order_id', String(data.store_order_id ?? data.order_id ?? ''))
          localStorage.setItem('last_store_confirmation_code', String(data.confirmation_code ?? ''))
          localStorage.setItem('last_store_public_token', String(data.public_token ?? ''))
        } catch {}
        setPayLink(data.payment_link); setConfirmationCode(data.confirmation_code ?? null)
        setDone(true); setCart([])
        window.location.href = data.payment_link
      } else {
        trackEvent('tienda_integrated_checkout_error', { worker_id: workerId, message: String(data?.message || '').slice(0, 120) })
        const traceHint = (data as { trace_id?: string } | null)?.trace_id ? ` (trace: ${(data as { trace_id?: string }).trace_id})` : ''
        if (data?.message) {
          alert(data.message + traceHint)
        } else if (r.status === 404) {
          alert(feedbackCopy.quoteApiNotDeployed)
        } else if (!data) {
          alert(`${feedbackCopy.networkError} (HTTP ${r.status})`)
        } else {
          alert(feedbackCopy.orderProcessError + traceHint)
        }
      }
    } catch { alert(feedbackCopy.networkError) }
    finally { setPaying(false) }
  }

  const handleCreateQuote = async () => {
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) { alert('Ingresa nombre, correo y WhatsApp del comprador'); return }
    setPaying(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        alert(feedbackCopy.mustLoginWorkerQuote)
        return
      }
      const apiUrl = `${window.location.origin}/api`
      const r = await fetch(`${apiUrl}/v1/integrated-quotes/worker/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map(i => ({ idproducto: i.idproducto, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio_venta ?? i.precio })),
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim(),
          wants_delivery: wantsDelivery,
          delivery_address: wantsDelivery ? address : null,
          delivery_by_seller: wantsDelivery ? sellerDoesDelivery : false,
          delivery_fee: wantsDelivery && sellerDoesDelivery ? deliveryExtraFeeNum : 0,
          service: laborEnabled ? {
            type: wantsDelivery ? 'express_errand' : 'fixed_job',
            description: laborDesc.trim() || null,
            offered_price: laborAmountNum,
          } : null,
          expires_in_hours: Math.max(1, parseInt(quoteExpiryHours || '72', 10) || 72),
        }),
      })
      const { data } = await parseApiJson<{
        public_url?: string
        quote_id?: number
        expires_at?: string | null
        message?: string
        total?: number
      }>(r)
      if (r.ok && data?.public_url) {
        trackEvent('tienda_worker_quote_created', {
          worker_id: workerId,
          quote_id: data.quote_id,
          expires_at: data.expires_at,
        })
        const totalNum = typeof data.total === 'number' ? data.total : totalFinal
        setQuotePdfSnapshot({
          worker: { store_name: worker?.store_name ?? null, name: worker?.name ?? null },
          buyer: {
            name: buyerName.trim(),
            email: buyerEmail.trim(),
            phone: buyerPhone.trim(),
          },
          lines: cart.map((i) => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            subtotal: (i.precio_venta ?? i.precio) * i.cantidad,
          })),
          cartTotal,
          commission,
          total: totalNum,
          laborEnabled,
          laborAmountNum,
          laborDesc: laborDesc.trim(),
          deliveryBySeller: wantsDelivery && sellerDoesDelivery,
          deliveryFee: wantsDelivery && sellerDoesDelivery ? deliveryExtraFeeNum : 0,
          publicUrl: data.public_url,
          expiresAt: data.expires_at ?? null,
          quoteId: data.quote_id,
        })
        setPayLink(null)
        setConfirmationCode(null)
        setQuotePublicUrl(data.public_url)
        setQuoteExpiresAt(data.expires_at ?? null)
        setDone(true)
        setCart([])
      } else if (data?.message) {
        trackEvent('tienda_worker_quote_error', { worker_id: workerId, message: String(data.message).slice(0, 120) })
        alert(data.message)
      } else if (r.status === 404) {
        trackEvent('tienda_worker_quote_error', { worker_id: workerId, message: 'route_404' })
        alert(feedbackCopy.quoteApiNotDeployed)
      } else if (!data) {
        alert(`${feedbackCopy.networkError} (HTTP ${r.status})`)
      } else {
        trackEvent('tienda_worker_quote_error', { worker_id: workerId, message: String(data?.message || '').slice(0, 120) })
        alert(feedbackCopy.quoteCreateFailed)
      }
    } catch {
      alert(feedbackCopy.networkError)
    } finally {
      setPaying(false)
    }
  }

  if (!loading && notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center p-6">
        <div>
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Tienda no encontrada</h1>
          <p className="text-gray-500 mb-6">El worker que buscas no existe o no tiene tienda activa.</p>
          <a href="https://jobshours.com" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-400 transition">← Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (!loading && worker && worker.status !== 'active' && worker.status !== 'intermediate') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
        <div>
          <div className="text-6xl mb-4">😴</div>
          <h2 className="text-white font-black text-2xl mb-2">Tienda temporalmente cerrada</h2>
          <p className="text-slate-400">Este vendedor no está disponible en este momento.</p>
          <a href="https://jobshours.com" className="mt-6 inline-block bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-400 transition">← Volver</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modales owner */}
      <QuickPublishModal
        isOpen={showQuickPublish}
        onClose={() => setShowQuickPublish(false)}
        workerId={workerId}
        storeName={worker?.store_name}
        onSuccess={fetchProductos}
      />
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        workerId={workerId}
        onSuccess={fetchProductos}
      />
      {editingProducto && (
        <EditProductModal
          producto={editingProducto}
          workerId={workerId}
          onClose={() => setEditingProducto(null)}
          onSuccess={fetchProductos}
        />
      )}

      {/* Nav */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://jobshours.com" className="text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <a href="https://jobshours.com" className="flex items-center gap-1">
              <span className="font-black text-orange-500 text-lg leading-none">Jobs</span><span className="font-black text-gray-800 text-lg leading-none">Hours</span>
            </a>
            <div className="w-px h-6 bg-gray-200" />
            {worker?.avatar ? (
              <img src={worker.avatar} alt={worker.name} className="w-8 h-8 rounded-full object-cover border-2 border-orange-400" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">🛒</div>
            )}
            <div>
              <p className="font-black text-gray-900 leading-tight text-sm">{worker?.store_name ?? 'Tienda'}</p>
              <p className="text-xs text-gray-500">por {worker?.name ?? '...'}</p>
            </div>
          </div>
          {canUseCart && (
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-xl transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">{isOwner ? surfaceCopy.tiendaCartLoteListo : 'Carrito'}</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          {worker?.avatar ? (
            <img src={worker.avatar} alt={worker.name} className="w-24 h-24 rounded-full border-4 border-orange-400 object-cover shadow-xl" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-4xl shadow-xl">🛒</div>
          )}
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-black text-white">{worker?.store_name ?? 'Tienda'}</h1>
            <p className="text-slate-400 mt-1">Vendedor: <span className="text-white font-semibold">{worker?.name}</span></p>
            {worker && (
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-yellow-400" /> {worker.fresh_score?.toFixed(1) ?? '0.0'}
                  <span className="text-slate-400 font-normal">({worker.rating_count} reseñas)</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${worker.status === 'active' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-600 text-slate-400'}`}>
                  {worker.status === 'active' ? '● Disponible' : '● Inactivo'}
                </span>
              </div>
            )}
            {/* Botón compartir */}
            <button
              onClick={() => {
                const url = withShareUtm(publicTiendaUrl(workerId), 'tienda_catalog')
                const lista = productos.slice(0, 20).map(p =>
                  `• ${p.nombre} — ${formatPrice(p.precio_venta ?? p.precio)}`
                ).join('\n')
                const text = `🛍️ *${worker?.store_name ?? 'Tienda'}* en JobsHours\n\n${lista}\n\n👉 Ver catálogo completo:\n${url}\n\n_Powered by JobsHours · Tu mercado local online_`
                const canNative =
                  typeof navigator !== 'undefined' &&
                  'share' in navigator &&
                  typeof (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share === 'function'
                trackEvent('marketing_share_tienda', {
                  worker_id: workerId,
                  via: canNative ? 'native' : 'clipboard',
                })
                if (canNative && navigator.share) {
                  navigator.share({ title: worker?.store_name ?? 'Tienda', text, url }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(text)
                  alert(feedbackCopy.listCopiedWhatsApp)
                }
              }}
              className="mt-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-xl transition text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Compartir tienda
            </button>
            <p className="text-xs text-slate-500 mt-2">Powered by <span className="text-orange-400 font-bold">JobsHours</span> · Tu mercado local online</p>
          </div>
        </div>
      </div>

      {/* Buscador + Categorías */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-gray-200 text-gray-800 pl-9 pr-4 py-2.5 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
        </div>
        {categorias.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoriaFiltro(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${!categoriaFiltro ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400'}`}>
              Todos
            </button>
            {categorias.map(c => (
              <button key={c.idcategoria} onClick={() => setCategoriaFiltro(categoriaFiltro === c.idcategoria ? null : c.idcategoria)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${categoriaFiltro === c.idcategoria ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400'}`}>
                {c.nombre}
              </button>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/90 p-3 max-w-2xl">
            <p className="text-xs font-bold text-orange-700">Categorías de tienda</p>
            <p className="text-[11px] text-orange-700/80 mt-1">
              Estas categorías organizan tus productos. Tus categorías de servicios se configuran en Mi Perfil.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categorias.map((c) => (
                <span key={c.idcategoria} className="px-2 py-0.5 bg-white text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                  {c.nombre}
                </span>
              ))}
              {categorias.length === 0 && <span className="text-xs text-orange-700/70">Sin categorías de tienda aún.</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {!showAddStoreCategory ? (
                <button
                  type="button"
                  onClick={() => setShowAddStoreCategory(true)}
                  className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition"
                >
                  + Agregar categoría de tienda
                </button>
              ) : (
                <>
                  <input
                    value={newStoreCategory}
                    onChange={(e) => setNewStoreCategory(e.target.value)}
                    placeholder="Ej: Herramientas, Usados, Ferretería..."
                    className="flex-1 min-w-[240px] bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddStoreCategory}
                    disabled={savingStoreCategory || !newStoreCategory.trim()}
                    className="text-xs font-bold text-white bg-orange-500 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingStoreCategory ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddStoreCategory(false); setNewStoreCategory('') }}
                    className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-2.5 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {isOwner && (
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-orange-500">✏️ Modo propietario — toca cualquier producto para editar</p>
            <button onClick={() => { setTab('stats'); fetchStats() }}
              className="text-xs font-bold text-orange-600 bg-white border border-orange-300 px-3 py-1 rounded-lg hover:bg-orange-100 transition ml-2 whitespace-nowrap">
              📊 Ver estadísticas
            </button>
          </div>
        )}
        {isOwner && (
          <div className="space-y-2">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 max-w-2xl">
              <p className="text-xs font-black text-teal-800">Publicacion Express</p>
              <p className="text-[11px] text-teal-700 mt-1">5 campos, publica rapido y comparte por WhatsApp al instante.</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickPublish(true)}
                  className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg transition"
                >
                  Publicar en 30 segundos
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="text-xs font-bold text-teal-700 bg-white border border-teal-300 px-3 py-1.5 rounded-lg transition hover:bg-teal-100"
                >
                  Modo avanzado
                </button>
              </div>
            </div>
            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('purchase')
                  trackEvent('tienda_owner_mode', { mode: 'purchase', worker_id: workerId })
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checkoutMode === 'purchase' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Catálogo normal
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('quote')
                  trackEvent('tienda_owner_mode', { mode: 'quote', worker_id: workerId })
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checkoutMode === 'quote' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                🧺 {surfaceCopy.tiendaModeLoteListo}
              </button>
            </div>
            {checkoutMode === 'quote' && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-left text-xs text-amber-950 leading-relaxed max-w-lg">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <p>
                  <span className="font-bold">{surfaceCopy.tiendaLoteListoHintTitle}:</span> {surfaceCopy.tiendaLoteListoHintBody}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tabs solo owner */}
        {isOwner && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button onClick={() => setTab('catalogo')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tab === 'catalogo' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              🛍️ Catálogo
            </button>
            <button onClick={() => { setTab('stats'); fetchStats() }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tab === 'stats' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              📊 Estadísticas
            </button>
          </div>
        )}
      </div>

      {/* Vista estadísticas */}
      {tab === 'stats' && isOwner && (
        <div className="max-w-5xl mx-auto px-4 pb-24">
          {loadingStats ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
          ) : stats ? (
            <div className="space-y-5">

              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Ventas hoy</p>
                  <p className="text-2xl font-black text-gray-900">{stats.ventas_hoy}</p>
                  <p className="text-sm font-bold text-amber-700">{formatPrice(stats.ingresos_hoy)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Este mes</p>
                  <p className="text-2xl font-black text-gray-900">{stats.ventas_mes}</p>
                  <p className="text-sm font-bold text-amber-700">{formatPrice(stats.ingresos_mes)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Total histórico</p>
                  <p className="text-2xl font-black text-gray-900">{stats.total_ventas}</p>
                  <p className="text-sm font-bold text-orange-600">{formatPrice(stats.ingresos_total)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Productos activos</p>
                  <p className="text-2xl font-black text-gray-900">{stats.total_productos}</p>
                  <p className="text-sm text-gray-400">en catálogo</p>
                </div>
              </div>

              {/* Embudo marketing de producto */}
              {marketingStats && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-900">📣 Embudo marketing (shares)</h3>
                    <button
                      type="button"
                      onClick={fetchMarketingStats}
                      className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition"
                    >
                      Actualizar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] text-slate-500">Vistas ficha</p><p className="text-xl font-black text-slate-900">{marketingStats.views}</p></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] text-slate-500">Clicks compartir</p><p className="text-xl font-black text-slate-900">{marketingStats.shares}</p></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] text-slate-500">WhatsApp</p><p className="text-xl font-black text-emerald-700">{marketingStats.whatsapp}</p></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] text-slate-500">PDF/Story</p><p className="text-xl font-black text-violet-700">{marketingStats.pdf}</p></div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3"><p className="text-[11px] text-amber-700">Checkout desde share</p><p className="text-xl font-black text-amber-700">{marketingStats.checkouts}</p></div>
                  </div>
                  {marketingStats.topProducts.length > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">Top productos con más interacción</p>
                      <div className="space-y-1.5">
                        {marketingStats.topProducts.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 truncate pr-2">{item.name}</span>
                            <span className="font-black text-slate-900">{item.touches}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {marketingStats.lastUpdate
                      ? `Actualizado: ${new Date(marketingStats.lastUpdate).toLocaleString('es-CL')}`
                      : 'Sin eventos de marketing todavia'}
                  </p>
                  {marketingConversion && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-[11px] text-emerald-700">Conversion share → checkout</p>
                        <p className="text-lg font-black text-emerald-700">{(marketingConversion.share_to_checkout_rate * 100).toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-3">
                        <p className="text-[11px] text-cyan-700">Conversion vista → checkout</p>
                        <p className="text-lg font-black text-cyan-700">{(marketingConversion.view_to_checkout_rate * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                  {marketingDaily.length > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">Serie diaria (ultimos 30 dias)</p>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {marketingDaily.map((row) => (
                          <div key={row.day} className="grid grid-cols-6 gap-2 text-[11px]">
                            <span className="text-slate-500">{row.day.slice(5)}</span>
                            <span className="font-bold text-slate-700">{row.views}</span>
                            <span className="font-bold text-slate-700">{row.shares}</span>
                            <span className="font-bold text-emerald-700">{row.whatsapp}</span>
                            <span className="font-bold text-violet-700">{row.pdf}</span>
                            <span className="font-black text-amber-700">{row.checkouts}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Motivación ganancia */}
              {stats.ganancia_estimada > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/25">
                  <p className="text-sm font-bold opacity-80 mb-1">🎉 Tu ganancia estimada total</p>
                  <p className="text-4xl font-black">{formatPrice(stats.ganancia_estimada)}</p>
                  <p className="text-sm opacity-80 mt-1">¡Excelente trabajo! Cada venta suma a tu bolsillo.</p>
                </div>
              )}

              {stats.total_ventas === 0 && (
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-5 text-white text-center">
                  <p className="text-3xl mb-2">🚀</p>
                  <p className="text-lg font-black">¡Tu tienda está lista para despegar!</p>
                  <p className="text-sm opacity-90 mt-1">Comparte tu link y haz tu primera venta hoy.</p>
                  <p className="text-xs bg-white/20 rounded-lg px-3 py-1 mt-3 font-mono">
                    {displayPublicUrl(publicTiendaUrl(workerId))}
                  </p>
                </div>
              )}

              {/* Productos más vendidos */}
              {stats.mas_vendidos?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <h3 className="font-black text-gray-900 mb-3">🏆 Productos más vendidos</h3>
                  <div className="space-y-2">
                    {stats.mas_vendidos.map((p: any, i: number) => (
                      <div key={p.idproducto} className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                          i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{p.nombre}</p>
                          <p className="text-xs text-gray-400">{p.unidades} unidades vendidas</p>
                        </div>
                        <p className="text-sm font-black text-amber-700">{formatPrice(p.total_ventas)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock bajo */}
              {stats.stock_bajo?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
                  <h3 className="font-black text-red-600 mb-3">⚠️ Stock bajo — reponer pronto</h3>
                  <div className="space-y-2">
                    {stats.stock_bajo.map((p: any) => (
                      <div key={p.idproducto} className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 truncate flex-1">{p.nombre}</p>
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ml-2 ${
                          p.stock_actual === 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {p.stock_actual === 0 ? 'Agotado' : `${p.stock_actual} restantes`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link para compartir */}
              <div className="bg-slate-800 rounded-2xl p-4 text-white">
                <p className="text-sm font-bold mb-2">📲 Comparte tu tienda</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-xs font-mono flex-1 truncate">{displayPublicUrl(publicTiendaUrl(workerId))}</p>
                  <button onClick={() => navigator.clipboard.writeText(publicTiendaUrl(workerId))}
                    className="text-xs bg-orange-500 hover:bg-orange-400 px-3 py-1 rounded-lg font-bold transition">Copiar</button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p>No se pudieron cargar las estadísticas</p>
              <button onClick={fetchStats} className="mt-3 text-orange-500 font-bold">Reintentar</button>
            </div>
          )}
        </div>
      )}

      {/* Grid productos */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
        ) : productos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold">{emptyStateCopy.noProducts}</p>
            {isOwner && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button onClick={() => setShowQuickPublish(true)} className="bg-teal-600 text-white font-bold px-5 py-2 rounded-xl hover:bg-teal-500 transition">Publicacion Express</button>
                <button onClick={() => setShowAddModal(true)} className="bg-orange-500 text-white font-bold px-5 py-2 rounded-xl hover:bg-orange-400 transition">Modo avanzado</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productos.map(p => {
              const precio = p.precio_venta ?? p.precio
              const enCarrito = cart.find(i => i.idproducto === p.idproducto)
              const deliveryBadge = extractDeliveryBadge(p.descripcion)
              return (
                <div key={p.idproducto} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group relative">
                  {/* Imagen */}
                  <div className="relative">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="w-full h-36 object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {/* Botones owner sobre la imagen */}
                    {isOwner && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => setEditingProducto(p)}
                          className="w-7 h-7 bg-white/90 hover:bg-orange-500 hover:text-white text-orange-500 rounded-lg flex items-center justify-center shadow transition"
                          title="Editar"
                        ><Edit2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => eliminarProducto(p.idproducto, p.nombre)}
                          className="w-7 h-7 bg-white/90 hover:bg-red-500 hover:text-white text-red-500 rounded-lg flex items-center justify-center shadow transition"
                          title="Eliminar"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-gray-800 text-sm font-bold line-clamp-2 min-h-[2.5rem]">{p.nombre}</p>
                    <p className="text-orange-500 font-black text-base mt-1">{formatPrice(precio)}</p>
                    <p className="text-gray-400 text-xs mb-3">{p.stock_actual} disponibles</p>
                    {deliveryBadge.enabled && (
                      <p className="mb-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        🚚 Delivery por vendedor{deliveryBadge.fee > 0 ? ` (+${formatPrice(deliveryBadge.fee)})` : ''}
                      </p>
                    )}

                    {canUseCart && (
                      enCarrito ? (
                        <div className="flex items-center justify-between bg-orange-50 rounded-lg px-2 py-1">
                          <button onClick={() => updateQty(p.idproducto, enCarrito.cantidad - 1)} className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="font-black text-orange-600">{enCarrito.cantidad}</span>
                          <button onClick={() => updateQty(p.idproducto, enCarrito.cantidad + 1)} className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(p)}
                          className="w-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold py-2 rounded-lg transition">
                          Agregar al carrito
                        </button>
                      )
                    )}

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const tpl = suggestProductTemplate(p)
                          const cardUrl = `${buildPublicProductUrl(workerId, p.idproducto, p.nombre)}?tpl=${tpl}`
                          window.open(cardUrl, '_blank', 'noopener,noreferrer')
                        }}
                        className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold py-2 rounded-lg transition inline-flex items-center justify-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Tarjeta
                      </button>
                      <button
                        type="button"
                        onClick={() => shareSingleProduct(p)}
                        className="border border-orange-200 text-orange-600 hover:bg-orange-50 text-[11px] font-bold py-2 rounded-lg transition inline-flex items-center justify-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Compartir
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botón flotante + (solo owner) */}
      {isOwner && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-400 text-white rounded-full shadow-2xl flex items-center justify-center transition hover:scale-110"
          title="Agregar producto"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Panel carrito */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative bg-white w-full max-w-sm flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-gray-900">Tu carrito ({cartCount})</h2>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : cart.map(item => (
                <div key={item.idproducto} className="flex gap-3">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.nombre}</p>
                    <p className="text-orange-500 font-black text-sm">{formatPrice((item.precio_venta ?? item.precio) * item.cantidad)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(item.idproducto, item.cantidad - 1)} className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => updateQty(item.idproducto, item.cantidad + 1)} className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => removeFromCart(item.idproducto)} className="ml-auto text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex justify-between font-black text-gray-900">
                  <span>Subtotal</span><span>{formatPrice(cartTotal)}</span>
                </div>
                {loggedIn === false ? (
                  <div className="space-y-2">
                    <p className="text-xs text-center text-gray-500">Debes iniciar sesión para comprar</p>
                    <a href={`https://jobshours.com?redirect=/tienda/${workerId}`}
                      className="block w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-black py-3 rounded-xl transition text-center shadow-md">
                      Iniciar sesión en JobsHours →
                    </a>
                  </div>
                ) : (
                  <button onClick={() => { setShowCart(false); setShowCheckout(true) }}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition">
                    {isOwner ? surfaceCopy.tiendaContinueLoteListo : 'Ir al pago →'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout */}
      {showCheckout && !done && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 p-4 border-b">
              <button onClick={() => { setShowCheckout(false); setShowCart(true) }} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
              <h2 className="font-black text-gray-900">{isOwner ? surfaceCopy.tiendaModalCreateLoteListo : 'Confirmar pedido'}</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                {cart.map(i => (
                  <div key={i.idproducto} className="flex justify-between text-sm">
                    <span className="text-gray-600">{i.nombre} x{i.cantidad}</span>
                    <span className="font-bold">{formatPrice((i.precio_venta ?? i.precio) * i.cantidad)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Servicio completo (8%)</span><span>{formatPrice(commission)}</span>
                  </div>
                  {wantsDelivery && sellerDoesDelivery && deliveryExtraFeeNum > 0 && (
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Delivery por vendedor</span><span>{formatPrice(deliveryExtraFeeNum)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">Incluye pago seguro con retención, comisión bancaria y respaldo digital</p>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-base">
                  <span>Total</span><span className="text-orange-500">{formatPrice(totalFinal)}</span>
                </div>
              </div>
              {/* Mano de obra (opcional) */}
              <div className="bg-gray-50 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => setLaborEnabled(!laborEnabled)}
                  className={`flex items-center gap-2 w-full text-sm font-bold transition ${laborEnabled ? 'text-orange-500' : 'text-gray-500'}`}
                >
                  <span className="text-base">🛠️</span>
                  {laborEnabled ? '✅ Incluir mano de obra' : 'Agregar mano de obra (opcional)'}
                </button>
                {laborEnabled && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="number"
                      value={laborAmount}
                      onChange={e => setLaborAmount(e.target.value)}
                      placeholder="Monto mano de obra (CLP)"
                      className="w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                      min={0}
                    />
                    <input
                      type="text"
                      value={laborDesc}
                      onChange={e => setLaborDesc(e.target.value)}
                      placeholder="Descripción (opcional)"
                      className="w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <p className="text-[11px] text-gray-400">
                      Esto crea un servicio pre-asignado al vendedor y quedará en tu historial como paquete.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isOwner ? 'Datos del comprador' : 'Tus datos'}</p>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder={isOwner ? 'Nombre del comprador *' : 'Tu nombre *'}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder={isOwner ? 'Email del comprador *' : 'Tu email *'}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder={isOwner ? 'WhatsApp comprador *' : 'WhatsApp *'}
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              {isOwner && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{surfaceCopy.tiendaLoteValidityHours}</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={quoteExpiryHours}
                    onChange={e => setQuoteExpiryHours(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <button onClick={() => setWantsDelivery(!wantsDelivery)}
                  className={`flex items-center gap-2 w-full text-sm font-bold transition ${wantsDelivery ? 'text-orange-500' : 'text-gray-500'}`}>
                  <Truck className="w-4 h-4" />
                  {wantsDelivery ? '✅ Con delivery' : 'Solicitar delivery (opcional)'}
                </button>
                {wantsDelivery && (
                  <div className="mt-2 space-y-2">
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección de entrega..."
                      className="w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400" />
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={sellerDoesDelivery}
                        onChange={(e) => setSellerDoesDelivery(e.target.checked)}
                        className="w-4 h-4"
                      />
                      El vendedor hace el delivery
                    </label>
                    {sellerDoesDelivery && (
                      <input
                        type="number"
                        value={deliveryExtraFee}
                        onChange={e => setDeliveryExtraFee(e.target.value)}
                        placeholder="Costo extra de delivery (CLP)"
                        className="w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                        min={0}
                      />
                    )}
                  </div>
                )}
              </div>
              <button onClick={isOwner ? handleCreateQuote : handlePay} disabled={paying || !buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim() || (wantsDelivery && !address.trim())}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                {isOwner ? <FileText className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {paying ? 'Procesando...' : (isOwner ? surfaceCopy.tiendaCreateShareLoteListo : `Pagar ${formatPrice(totalFinal)}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación */}
      {done && payLink && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <CheckCircle className="w-14 h-14 text-teal-600 mx-auto mb-3" />
            <h3 className="text-gray-900 font-black text-xl mb-1">¡Pedido creado!</h3>
            <p className="text-gray-500 text-sm mb-4">Paga y guarda tu código. Lo necesitarás al recibir el producto.</p>
            {confirmationCode && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Tu código de entrega</p>
                <p className="text-5xl font-black text-orange-500 tracking-widest">{confirmationCode}</p>
                <p className="text-xs text-gray-500 mt-2">Dáselo al vendedor cuando recibas tu pedido</p>
              </div>
            )}
            <a href={payLink} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition mb-3">
              Pagar {formatPrice(totalFinal)} →
            </a>
            <button onClick={() => { setDone(false); setShowCheckout(false) }} className="text-gray-400 hover:text-gray-600 text-sm transition">
              Volver a la tienda
            </button>
          </div>
        </div>
      )}

      {done && quotePublicUrl && !payLink && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <CheckCircle className="w-14 h-14 text-teal-600 mx-auto mb-3" />
            <h3 className="text-gray-900 font-black text-xl mb-1">{surfaceCopy.tiendaLoteListoCreatedTitle}</h3>
            <p className="text-gray-500 text-sm mb-4">{surfaceCopy.tiendaLoteListoCreatedSubtitle}</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left mb-3">
              <p className="text-xs text-gray-500 mb-1">Link público</p>
              <p className="text-xs text-gray-700 break-all">{quotePublicUrl}</p>
            </div>
            {quoteExpiresAt && (
              <p className="text-xs text-gray-500 mb-4">
                Expira: {new Date(quoteExpiresAt).toLocaleString('es-CL')}
              </p>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(quotePublicUrl)
                alert(surfaceCopy.linkCopiedToClipboard)
              }}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition mb-2 flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" /> {surfaceCopy.copyLink}
            </button>
            {quotePdfSnapshot && (
              <div className="mb-3 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('quote_pdf_download', {
                      source: 'tienda_worker_modal',
                      quote_id: quotePdfSnapshot.quoteId,
                    })
                    try {
                      void downloadBrandedQuotePdf({
                        storeName: quotePdfSnapshot.worker.store_name || 'Tienda JobsHours',
                        workerName: quotePdfSnapshot.worker.name || '—',
                        buyerName: quotePdfSnapshot.buyer.name,
                        buyerEmail: quotePdfSnapshot.buyer.email,
                        buyerPhone: quotePdfSnapshot.buyer.phone,
                        rows: quotePdfSnapshot.lines.map((l) => ({
                          title: l.nombre,
                          quantity: l.cantidad,
                          amount: l.subtotal,
                        })),
                        extras: [
                          { label: 'Servicio plataforma JobsHours (8%)', amount: quotePdfSnapshot.commission },
                          ...(quotePdfSnapshot.laborEnabled && quotePdfSnapshot.laborAmountNum > 0
                            ? [
                                {
                                  label: quotePdfSnapshot.laborDesc || 'Mano de obra / servicio',
                                  amount: quotePdfSnapshot.laborAmountNum,
                                },
                              ]
                            : []),
                        ],
                        total: quotePdfSnapshot.total,
                        expiresAt: quotePdfSnapshot.expiresAt,
                        publicUrl: quotePdfSnapshot.publicUrl,
                        quoteId: quotePdfSnapshot.quoteId,
                      })
                    } catch {
                      alert(feedbackCopy.pdfGenerateError)
                    }
                  }}
                  className="w-full bg-white border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-black py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <FileDown className="w-4 h-4" aria-hidden /> {surfaceCopy.downloadQuotePdf}
                </button>
                <p className="text-[10px] text-gray-400 text-center px-1">{surfaceCopy.quotePdfPoweredBy}</p>
              </div>
            )}
            <button
              onClick={() => {
                setDone(false)
                setShowCheckout(false)
                setQuotePublicUrl(null)
                setQuoteExpiresAt(null)
                setQuotePdfSnapshot(null)
              }}
              className="text-gray-400 hover:text-gray-600 text-sm transition"
            >
              {surfaceCopy.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
