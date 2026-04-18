'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ShoppingCart, Search, Package, Minus, Plus, Trash2, X, Star, Loader2, ArrowLeft, CreditCard, Truck, CheckCircle, Edit2, Camera, Calculator, Mic, MicOff } from 'lucide-react'

// Misma lógica que page.tsx: base sin /api para llamadas a jobshours API
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')
const INVENTARIO_API = '/inventario'

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

// ─── Hook reconocimiento de voz ───────────────────────────────────────────────
function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Tu navegador no soporta reconocimiento de voz'); return }
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

// ─── Modal Agregar Producto ───────────────────────────────────────────────────
function AddProductModal({ isOpen, onClose, workerId, onSuccess }: {
  isOpen: boolean; onClose: () => void; workerId: number; onSuccess: () => void
}) {
  const [form, setForm] = useState({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '' })
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
    setForm({ nombre: '', precio: '', precioVenta: '', stock: '1', codigo: '', descripcion: '' })
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
      fd.append('descripcion', form.descripcion.trim())
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
                  <span className="font-black text-green-600">{formatPrice(precioVentaFinal - precioNum)}
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
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : '+ Publicar producto'}
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
                <span>Tu ganancia (100%)</span><span className="font-bold text-green-600">{formatPrice(precioNum)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Precio cliente (+10%)</span><span className="font-bold text-orange-600">{formatPrice(precioCliente)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [tab, setTab] = useState<'catalogo' | 'stats'>('catalogo')
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

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

  // Categorías
  useEffect(() => {
    if (!workerId) return
    fetch(`${INVENTARIO_API}/categorias?worker_id=${workerId}`)
      .then(r => r.json()).then(data => setCategorias(data.data ?? [])).catch(() => {})
  }, [workerId])

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
  const eliminarProducto = async (idproducto: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" de la tienda?`)) return
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      const r = await fetch(`${INVENTARIO_API}/worker-productos/${idproducto}?worker_id=${workerId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token ?? ''}` }
      })
      if (r.ok) fetchProductos()
      else alert('No se pudo eliminar')
    } catch { alert('Error de conexión') }
  }

  const cartTotal = cart.reduce((s, i) => s + (i.precio_venta ?? i.precio) * i.cantidad, 0)
  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0)
  const commission = Math.round(cartTotal * 0.08)
  const laborAmountNum = Math.max(0, parseInt(laborAmount || '0', 10) || 0)
  const totalFinal = cartTotal + commission + (laborEnabled ? laborAmountNum : 0)

  const handlePay = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) { alert('Ingresa tu nombre y email'); return }
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
          buyer_phone: buyerPhone.trim() || null,
          wants_delivery: wantsDelivery,
          delivery_address: wantsDelivery ? address : null,
          // Mano de obra opcional (servicio pre-asignado al mismo worker)
          service: laborEnabled ? {
            type: wantsDelivery ? 'express_errand' : 'fixed_job',
            description: laborDesc.trim() || null,
            offered_price: laborAmountNum,
          } : null,
        }),
      })
      const data = await r.json()
      if (r.ok && data.payment_link) {
        try {
          localStorage.setItem('last_store_order_id', String(data.store_order_id ?? data.order_id ?? ''))
          localStorage.setItem('last_store_confirmation_code', String(data.confirmation_code ?? ''))
        } catch {}
        setPayLink(data.payment_link); setConfirmationCode(data.confirmation_code ?? null)
        setDone(true); setCart([])
        window.location.href = data.payment_link
      } else { alert(data.message || 'Error al procesar el pedido') }
    } catch { alert('Error de conexión') }
    finally { setPaying(false) }
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
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-xl transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
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
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${worker.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                  {worker.status === 'active' ? '● Disponible' : '● Inactivo'}
                </span>
              </div>
            )}
            {/* Botón compartir */}
            <button
              onClick={() => {
                const url = `https://jobshours.com/tienda/${workerId}`
                const lista = productos.slice(0, 20).map(p =>
                  `• ${p.nombre} — ${formatPrice(p.precio_venta ?? p.precio)}`
                ).join('\n')
                const text = `🛍️ *${worker?.store_name ?? 'Tienda'}* en JobsHours\n\n${lista}\n\n👉 Ver catálogo completo:\n${url}\n\n_Powered by JobsHours · Tu mercado local online_`
                if (navigator.share) {
                  navigator.share({ title: worker?.store_name ?? 'Tienda', text, url }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(text)
                  alert('¡Lista copiada! Pégala en WhatsApp o donde quieras.')
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
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-orange-500">✏️ Modo propietario — toca cualquier producto para editar</p>
            <button onClick={() => { setTab('stats'); fetchStats() }}
              className="text-xs font-bold text-orange-600 bg-white border border-orange-300 px-3 py-1 rounded-lg hover:bg-orange-100 transition ml-2 whitespace-nowrap">
              📊 Ver estadísticas
            </button>
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
                  <p className="text-sm font-bold text-green-600">{formatPrice(stats.ingresos_hoy)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold mb-1">Este mes</p>
                  <p className="text-2xl font-black text-gray-900">{stats.ventas_mes}</p>
                  <p className="text-sm font-bold text-green-600">{formatPrice(stats.ingresos_mes)}</p>
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

              {/* Motivación ganancia */}
              {stats.ganancia_estimada > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
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
                  <p className="text-xs bg-white/20 rounded-lg px-3 py-1 mt-3 font-mono">jobshours.com/tienda/{workerId}</p>
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
                        <p className="text-sm font-black text-green-600">{formatPrice(p.total_ventas)}</p>
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
                  <p className="text-xs font-mono flex-1 truncate">jobshours.com/tienda/{workerId}</p>
                  <button onClick={() => navigator.clipboard.writeText(`https://jobshours.com/tienda/${workerId}`)}
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
            <p className="text-lg font-semibold">Sin productos disponibles</p>
            {isOwner && <button onClick={() => setShowAddModal(true)} className="mt-4 bg-orange-500 text-white font-bold px-5 py-2 rounded-xl hover:bg-orange-400 transition">+ Agregar primer producto</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productos.map(p => {
              const precio = p.precio_venta ?? p.precio
              const enCarrito = cart.find(i => i.idproducto === p.idproducto)
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

                    {!isOwner && (
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
                      className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition text-center">
                      Iniciar sesión en JobsHours →
                    </a>
                  </div>
                ) : (
                  <button onClick={() => { setShowCart(false); setShowCheckout(true) }}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition">
                    Ir al pago →
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
              <h2 className="font-black text-gray-900">Confirmar pedido</h2>
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
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tus datos</p>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Tu nombre *"
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Tu email *"
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Teléfono (opcional)"
                  className="w-full bg-gray-50 border border-gray-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <button onClick={() => setWantsDelivery(!wantsDelivery)}
                  className={`flex items-center gap-2 w-full text-sm font-bold transition ${wantsDelivery ? 'text-orange-500' : 'text-gray-500'}`}>
                  <Truck className="w-4 h-4" />
                  {wantsDelivery ? '✅ Con delivery' : 'Solicitar delivery (opcional)'}
                </button>
                {wantsDelivery && (
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección de entrega..."
                    className="mt-2 w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400" />
                )}
              </div>
              <button onClick={handlePay} disabled={paying || !buyerName.trim() || !buyerEmail.trim() || (wantsDelivery && !address.trim())}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                {paying ? 'Procesando...' : `Pagar ${formatPrice(totalFinal)}`}
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
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
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
    </div>
  )
}
