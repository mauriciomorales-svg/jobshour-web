'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Calculator, Loader2, ScanLine, X } from 'lucide-react'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { ProductPhotoUpload } from '@/app/components/ProductPhotoUpload'
import TiendaMicBtn from '@/app/components/tienda/TiendaMicBtn'
import {
  emptyPhotoSlots,
  uploadProductPhotos,
  validatePhotoSlots,
  type ProductPhotoMode,
} from '@/lib/productPhotoComposite'
import { formatPrice, INVENTARIO_API } from '@/lib/tienda/productUtils'

const BarcodeScanModal = dynamic(() => import('@/app/components/BarcodeScanModal'), { ssr: false })

export default function AddProductModal({ isOpen, onClose, workerId, onSuccess }: {
  isOpen: boolean; onClose: () => void; workerId: number; onSuccess: () => void
}) {
  const [form, setForm] = useState({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '', condition: 'nuevo' })
  const [photoMode, setPhotoMode] = useState<ProductPhotoMode>(1)
  const [photoSlots, setPhotoSlots] = useState<(File | null)[]>(() => emptyPhotoSlots(1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categorias, setCategorias] = useState<{idcategoria: number, nombre: string}[]>([])
  const [categoria, setCategoria] = useState('')
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false)

  const precioNum = parseFloat(form.precio) || 0
  const precioVentaAuto = Math.round(precioNum * 1.10)
  const precioVentaFinal = parseFloat(form.precioVenta) || precioVentaAuto

  useEffect(() => {
    if (!isOpen) {
      setBarcodeScanOpen(false)
      return
    }
    setForm({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '', condition: 'nuevo' })
    setPhotoMode(1)
    setPhotoSlots(emptyPhotoSlots(1))
    setError('')
    setCategoria('')
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json()).then(d => setCategorias(d.data ?? [])).catch(() => {})
  }, [isOpen, workerId])

  // Auto-calcular precio venta al cambiar precio costo
  useEffect(() => {
    if (precioNum > 0 && !form.precioVenta)
      setForm(f => ({ ...f, precioVenta: String(Math.round(precioNum * 1.10)) }))
  }, [form.precio])

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.precio.trim() || precioNum <= 0) { setError('El precio costo es obligatorio'); return }
    const photoErr = validatePhotoSlots(photoMode, photoSlots)
    if (photoErr) { setError(photoErr); return }
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
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${INVENTARIO_API}/worker-productos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message || 'Error al crear')

      if (data.codigobarra) {
        await uploadProductPhotos(INVENTARIO_API, data.codigobarra, photoSlots, token)
      }

      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inp = "w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"

  if (!isOpen) return null
  return (
    <>
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

          <ProductPhotoUpload
            mode={photoMode}
            onModeChange={setPhotoMode}
            slots={photoSlots}
            onSlotsChange={setPhotoSlots}
          />

          {/* Código de barras */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Código de barras</label>
            <p className="text-[11px] text-gray-400 mb-1.5 ml-1 leading-snug">
              Escribilo a mano, dictarlo con el micrófono o escanearlo con la cámara.
            </p>
            <div className="flex gap-2">
              <input type="text" autoComplete="off" placeholder="Ej: 7891234567890 (opcional)" value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                className={inp + " flex-1 min-w-0"} />
              <button
                type="button"
                title="Escanear con la cámara"
                onClick={() => setBarcodeScanOpen(true)}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition active:scale-95"
              >
                <ScanLine className="w-5 h-5" />
              </button>
              <TiendaMicBtn onResult={t => setForm(f => ({ ...f, codigo: t }))} />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Nombre del producto *</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej: Polera nirvana talla M" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className={inp + " flex-1"} />
              <TiendaMicBtn onResult={t => setForm(f => ({ ...f, nombre: t }))} />
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
              <TiendaMicBtn onResult={t => setForm(f => ({ ...f, descripcion: (f.descripcion ? f.descripcion + ' ' : '') + t }))} className="mt-0.5" />
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
    <BarcodeScanModal
      open={barcodeScanOpen}
      onClose={() => setBarcodeScanOpen(false)}
      onDetected={(code) => setForm((f) => ({ ...f, codigo: code }))}
    />
    </>
  )
}
