'use client'

import { useEffect, useState } from 'react'
import { Calculator, X } from 'lucide-react'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { ProductPhotoUpload } from '@/app/components/ProductPhotoUpload'
import {
  emptyPhotoSlots,
  uploadProductPhotos,
  validatePhotoSlots,
  type ProductPhotoMode,
} from '@/lib/productPhotoComposite'
import { formatPrice, INVENTARIO_API } from '@/lib/tienda/productUtils'

export type TiendaProducto = {
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

export default function EditProductModal({ producto, workerId, onClose, onSuccess }: {
  producto: TiendaProducto; workerId: number; onClose: () => void; onSuccess: () => void
}) {
  const [nombre, setNombre] = useState(producto.nombre)
  const [precio, setPrecio] = useState(String(producto.precio))
  const [stock, setStock] = useState(String(producto.stock_actual))
  const [photoMode, setPhotoMode] = useState<ProductPhotoMode>(1)
  const [photoSlots, setPhotoSlots] = useState<(File | null)[]>(() => emptyPhotoSlots(1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categorias, setCategorias] = useState<{idcategoria: number, nombre: string}[]>([])
  const [categoria, setCategoria] = useState(String(producto.idcategoria ?? ''))

  useEffect(() => {
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json())
      .then(d => setCategorias(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

  const precioNum = parseFloat(precio) || 0
  const precioCliente = Math.round(precioNum * 1.10)

  const handleSave = async () => {
    const filled = photoSlots.filter(Boolean).length
    if (filled > 0) {
      const photoErr = validatePhotoSlots(photoMode, photoSlots)
      if (photoErr) { setError(photoErr); return }
    }
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

      if (filled > 0) {
        const codigo = producto.codigobarra || `SKU-${producto.idproducto}`
        await uploadProductPhotos(INVENTARIO_API, codigo, photoSlots, token)
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
          <ProductPhotoUpload
            mode={photoMode}
            onModeChange={setPhotoMode}
            slots={photoSlots}
            onSlotsChange={setPhotoSlots}
            existingUrl={producto.imagen_url}
          />

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
