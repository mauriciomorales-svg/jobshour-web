'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ShoppingCart, Search, Package, Minus, Plus, Trash2, X, MapPin, Star, Loader2, ArrowLeft, CreditCard, Truck, CheckCircle } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api'
const INVENTARIO_API = 'http://64.227.55.223:8003/api'

interface Producto {
  idproducto: number
  nombre: string
  precio: number
  precio_venta?: number
  stock_actual: number
  activo: boolean
  imagen_url?: string | null
  descripcion?: string | null
}

interface CartItem extends Producto {
  cantidad: number
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
  const [notFound, setNotFound] = useState(false)

  // Fetch worker info
  useEffect(() => {
    if (!workerId) return
    fetch(`${API_BASE}/v1/experts/${workerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data && data.data.is_seller) {
          setWorker(data.data)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
  }, [workerId])

  // Fetch productos
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      const url = buscar
        ? `${INVENTARIO_API}/productos/buscar?q=${encodeURIComponent(buscar)}&limite=100`
        : `${INVENTARIO_API}/productos/buscar?limite=100`
      const r = await fetch(url)
      const data = await r.json()
      setProductos((data.data ?? []).filter((p: Producto) => p.activo && p.stock_actual > 0))
    } catch {
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [buscar])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  // Cart helpers
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
  const cartTotal = cart.reduce((s, i) => s + (i.precio_venta ?? i.precio) * i.cantidad, 0)
  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0)
  const commission = Math.round(cartTotal * 0.08)
  const totalFinal = cartTotal + commission

  const handlePay = async () => {
    setPaying(true)
    try {
      const r = await fetch(`${API_BASE}/v1/store/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: workerId,
          items: cart.map(i => ({ idproducto: i.idproducto, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio_venta ?? i.precio })),
          total: totalFinal,
          wants_delivery: wantsDelivery,
          delivery_address: wantsDelivery ? address : null,
        }),
      })
      const data = await r.json()
      if (r.ok && data.payment_link) {
        setPayLink(data.payment_link)
        setDone(true)
        setCart([])
      } else {
        alert(data.message || 'Error al procesar el pedido')
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setPaying(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
        <div>
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-white text-2xl font-black mb-2">Tienda no encontrada</h1>
          <p className="text-slate-400 mb-6">Este trabajador no tiene una tienda activa.</p>
          <a href="https://jobshours.com" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">Ir a JobsHours →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-slate-300 text-xs py-2 px-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <a href="https://jobshours.com" className="flex items-center gap-1 hover:text-white transition">
            <ArrowLeft className="w-3 h-3" /> Volver a JobsHours
          </a>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Powered by JobsHours</span>
        </div>
      </div>

      {/* Navbar */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo tienda */}
          <div className="flex items-center gap-3">
            {worker?.avatar ? (
              <img src={worker.avatar} alt={worker.name} className="w-10 h-10 rounded-full object-cover border-2 border-orange-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">
                🛒
              </div>
            )}
            <div>
              <p className="font-black text-gray-900 leading-tight">{worker?.store_name ?? 'Tienda'}</p>
              <p className="text-xs text-gray-500">por {worker?.name ?? '...'}</p>
            </div>
          </div>

          {/* Carrito */}
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-xl transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                {cartCount}
              </span>
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
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-white">{worker?.store_name ?? 'Tienda'}</h1>
            <p className="text-slate-400 mt-1">Vendedor: <span className="text-white font-semibold">{worker?.name}</span></p>
            {worker && (
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-yellow-400" /> {worker.fresh_score.toFixed(1)}
                  <span className="text-slate-400 font-normal">({worker.rating_count} reseñas)</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${worker.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                  {worker.status === 'active' ? '● Disponible' : '● Inactivo'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-gray-200 text-gray-800 pl-9 pr-4 py-2.5 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
        </div>
      </div>

      {/* Grid productos */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold">Sin productos disponibles</p>
            <p className="text-sm mt-1">Vuelve pronto, el catálogo se actualiza constantemente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productos.map(p => {
              const precio = p.precio_venta ?? p.precio
              const enCarrito = cart.find(i => i.idproducto === p.idproducto)
              return (
                <div key={p.idproducto} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-36 object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-gray-800 text-sm font-bold line-clamp-2 min-h-[2.5rem]">{p.nombre}</p>
                    <p className="text-orange-500 font-black text-base mt-1">{formatPrice(precio)}</p>
                    <p className="text-gray-400 text-xs mb-3">{p.stock_actual} disponibles</p>
                    {enCarrito ? (
                      <div className="flex items-center justify-between bg-orange-50 rounded-lg px-2 py-1">
                        <button onClick={() => updateQty(p.idproducto, enCarrito.cantidad - 1)} className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black text-orange-600">{enCarrito.cantidad}</span>
                        <button onClick={() => updateQty(p.idproducto, enCarrito.cantidad + 1)} className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="w-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        Agregar al carrito
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 text-xs text-center py-6 px-4">
        <p>Tienda de <span className="text-white font-bold">{worker?.name}</span> · Powered by <a href="https://jobshours.com" className="text-orange-400 hover:text-orange-300">JobsHours</a></p>
      </footer>

      {/* Cart Drawer */}
      {showCart && !showCheckout && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-500" /> Carrito ({cartCount})</h2>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : cart.map(item => (
                <div key={item.idproducto} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg shrink-0 flex items-center justify-center"><Package className="w-6 h-6 text-gray-400" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 line-clamp-2">{item.nombre}</p>
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
                <button onClick={() => { setShowCart(false); setShowCheckout(true) }} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition">
                  Ir al pago →
                </button>
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
              {/* Resumen */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                {cart.map(i => (
                  <div key={i.idproducto} className="flex justify-between text-sm">
                    <span className="text-gray-600">{i.nombre} x{i.cantidad}</span>
                    <span className="font-bold">{formatPrice((i.precio_venta ?? i.precio) * i.cantidad)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between text-xs text-gray-400">
                  <span>Comisión plataforma (8%)</span><span>{formatPrice(commission)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-base">
                  <span>Total</span><span className="text-orange-500">{formatPrice(totalFinal)}</span>
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-gray-50 rounded-xl p-3">
                <button onClick={() => setWantsDelivery(!wantsDelivery)} className={`flex items-center gap-2 w-full text-sm font-bold transition ${wantsDelivery ? 'text-orange-500' : 'text-gray-500'}`}>
                  <Truck className="w-4 h-4" />
                  {wantsDelivery ? '✅ Con delivery' : 'Solicitar delivery (opcional)'}
                </button>
                {wantsDelivery && (
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Dirección de entrega..."
                    className="mt-2 w-full bg-white border border-gray-200 text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                  />
                )}
              </div>

              <button
                onClick={handlePay}
                disabled={paying || (wantsDelivery && !address.trim())}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
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
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-gray-900 font-black text-xl mb-1">¡Pedido creado!</h3>
            <p className="text-gray-500 text-sm mb-6">El vendedor fue notificado. Completa el pago para confirmar tu pedido.</p>
            <a
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-3 rounded-xl transition mb-3"
            >
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
