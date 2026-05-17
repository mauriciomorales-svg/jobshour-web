'use client'

import { useEffect, useRef, useState } from 'react'
import { X, FileDown } from 'lucide-react'
import { publicTiendaUrl } from '@/lib/marketingShare'
import { notifyUser } from '@/lib/notifyUser'
import { buildPublicProductUrl, formatPrice, INVENTARIO_API } from '@/lib/tienda/productUtils'

export default function QuickPublishModal({
  isOpen,
  onClose,
  workerId,
  storeName,
  publicStoreHost,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  workerId: number
  storeName?: string | null
  publicStoreHost?: string | null
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
        : publicTiendaUrl(workerId, { publicHost: publicStoreHost })
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
                  notifyUser('Link copiado', 'success')
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
