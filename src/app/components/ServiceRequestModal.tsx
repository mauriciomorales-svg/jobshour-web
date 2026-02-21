'use client'

import { useState, useEffect } from 'react'

interface Props {
  expert: {
    id: number
    name: string
    avatar: string | null
    hourly_rate: number
    category?: { name: string; color: string; icon: string } | null
    pos?: { lat: number; lng: number }
    active_route?: {
      origin?: { address?: string; lat?: number; lng?: number }
      destination?: { address?: string; lat?: number; lng?: number }
      departure_time?: string
      available_seats?: number
    } | null
  }
  currentUser?: { id?: number; name?: string; avatar?: string | null; avatarUrl?: string | null } | null
  onClose: () => void
  onSent: (requestId: number) => void
}

export default function ServiceRequestModal({ expert, currentUser, onClose, onSent }: Props) {
  // Verificación defensiva
  if (!expert || !expert.id) {
    console.error('❌ ServiceRequestModal: expert no válido', expert)
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow-2xl">
          <p className="text-red-500">Error: Datos del trabajador no válidos</p>
          <button onClick={onClose} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg">Cerrar</button>
        </div>
      </div>
    )
  }

  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [requestType, setRequestType] = useState<'fixed_job' | 'ride_share' | 'express_errand'>('fixed_job')
  
  // Campos para recados/express_errand
  const [cargaTipo, setCargaTipo] = useState<'sobre' | 'paquete' | 'bulto' | null>(null)
  const [cargaPeso, setCargaPeso] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [storeName, setStoreName] = useState('')
  const [itemsCount, setItemsCount] = useState('')
  const [loadType, setLoadType] = useState<'light' | 'medium' | 'heavy'>('medium')
  const [requiresVehicle, setRequiresVehicle] = useState(false)
  
  // Campos para ride_share
  const [pickupAddress, setPickupAddress] = useState('')
  const [rideDeliveryAddress, setRideDeliveryAddress] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [seats, setSeats] = useState(1)
  
  const isRecados = expert.category?.icon === 'package'
  const hasActiveRoute = expert.active_route && expert.active_route.destination
  
  // Detectar tipo de solicitud automáticamente
  useEffect(() => {
    if (hasActiveRoute && expert.active_route) {
      setRequestType('ride_share')
      setRideDeliveryAddress(expert.active_route.destination?.address || '')
      setPickupAddress(expert.active_route.origin?.address || 'Mi ubicación')
      if (expert.active_route.departure_time) {
        // Convertir ISO a datetime-local
        const dt = new Date(expert.active_route.departure_time)
        const localDateTime = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setDepartureTime(localDateTime)
      }
      setSeats(expert.active_route.available_seats || 1)
    } else if (isRecados) {
      setRequestType('express_errand')
    }
  }, [hasActiveRoute, isRecados, expert.active_route])

  // Verificar autenticación
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
  const user = currentUser

  // Si no hay token o usuario, cerrar modal y mostrar error
  if (!token || !user) {
    return (
      <div className="fixed inset-0 z-[300] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-5 pb-8 animate-slide-up">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Sesión expirada</h3>
            <p className="text-sm text-gray-600 mb-4">Debes iniciar sesión para solicitar servicios</p>
            <button 
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Verificar perfil completo (avatar puede estar en .avatar o .avatarUrl)
  const userAvatar = user.avatar || user.avatarUrl
  if (!userAvatar || !user.name || user.name === 'Usuario') {
    return (
      <div className="fixed inset-0 z-[300] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-5 pb-8 animate-slide-up">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Completa tu perfil</h3>
            <p className="text-sm text-gray-600 mb-4">Necesitas agregar tu foto y nombre para solicitar servicios</p>
            <button 
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    // Verificar autenticación (ya verificado arriba, pero por seguridad)
    if (!token) {
      setError('Debes iniciar sesión para solicitar servicios')
      return
    }

    setSending(true)
    setError('')
    try {
      const payload: any = {
        worker_id: expert.id,
        type: requestType,
        category_type: requestType === 'ride_share' ? 'travel' : requestType === 'express_errand' ? 'errand' : 'fixed',
        description: description.trim() || null,
        urgency,
        offered_price: expert.hourly_rate,
      }

      // Campos específicos para ride_share
      if (requestType === 'ride_share') {
        if (!pickupAddress.trim() || !rideDeliveryAddress.trim()) {
          setError('Ingresa origen y destino')
          setSending(false)
          return
        }
        if (!departureTime) {
          setError('Selecciona hora de salida')
          setSending(false)
          return
        }
        const departureDate = new Date(departureTime)
        if (departureDate <= new Date()) {
          setError('La hora de salida debe ser en el futuro')
          setSending(false)
          return
        }
        
        payload.pickup_address = pickupAddress.trim()
        payload.delivery_address = rideDeliveryAddress.trim()
        payload.pickup_lat = expert.active_route?.origin?.lat || expert.pos?.lat || null
        payload.pickup_lng = expert.active_route?.origin?.lng || expert.pos?.lng || null
        payload.delivery_lat = expert.active_route?.destination?.lat || null
        payload.delivery_lng = expert.active_route?.destination?.lng || null
        payload.departure_time = new Date(departureTime).toISOString()
        payload.seats = seats
        payload.destination_name = rideDeliveryAddress.trim()
        payload.payload = {
          seats,
          departure_time: new Date(departureTime).toISOString(),
          destination_name: rideDeliveryAddress.trim(),
        }
      }
      
      // Campos específicos para express_errand
      if (requestType === 'express_errand') {
        payload.carga_tipo = cargaTipo
        payload.carga_peso = cargaPeso ? parseFloat(cargaPeso) : null
        payload.delivery_address = deliveryAddress.trim() || null
        payload.store_name = storeName.trim() || null
        payload.items_count = itemsCount ? parseInt(itemsCount) : null
        payload.load_type = loadType
        payload.requires_vehicle = requiresVehicle
        if (expert.pos) {
          payload.delivery_lat = expert.pos.lat
          payload.delivery_lng = expert.pos.lng
        }
        payload.payload = {
          store_name: storeName.trim() || null,
          items_count: itemsCount ? parseInt(itemsCount) : null,
          load_type: loadType,
          requires_vehicle: requiresVehicle,
        }
      }
      
      const r = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (r.ok) {
        // Éxito - cerrar modal y notificar
        onSent(data.data.id)
      } else {
        // Mostrar error detallado
        const errorMsg = data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'Error al enviar solicitud')
        setError(errorMsg)
        // Scroll al error para mejor UX
        setTimeout(() => {
          const errorElement = document.querySelector('.text-red-500')
          errorElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)
      }
    } catch (err: any) {
      console.error('Error completo:', err)
      console.error('Error message:', err?.message)
      console.error('Error stack:', err?.stack)
      setError(err?.message || 'Error de conexión - revisa consola (F12)')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-5 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">Solicitar servicio</h3>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Worker info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
          <img
            src={expert.avatar || `https://i.pravatar.cc/80?u=${expert.id}`}
            alt={expert.name}
            className="w-11 h-11 rounded-lg object-cover"
          />
          <div className="flex-1">
            <p className="font-bold text-sm text-gray-900">{expert.name}</p>
            {expert.category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: expert.category.color }}>
                {expert.category.name}
              </span>
            )}
            {hasActiveRoute && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 mt-1 inline-block">
                🚗 Viaje disponible
              </span>
            )}
          </div>
          <span className="font-bold text-blue-600 text-sm">${expert.hourly_rate.toLocaleString('es-CL')}/hr</span>
        </div>

        {/* Selector de tipo de solicitud */}
        {!hasActiveRoute && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-2">Tipo de Servicio</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setRequestType('fixed_job')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                  requestType === 'fixed_job' 
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                🔧 Trabajo
              </button>
              <button
                onClick={() => setRequestType('ride_share')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                  requestType === 'ride_share' 
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                🚗 Viaje
              </button>
              <button
                onClick={() => setRequestType('express_errand')}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                  requestType === 'express_errand' 
                    ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                📦 Compra
              </button>
            </div>
          </div>
        )}

        {/* Campos específicos para RIDE_SHARE */}
        {requestType === 'ride_share' && (
          <div className="space-y-3 mb-4 bg-green-50 p-3 rounded-lg">
            <h4 className="text-xs font-bold text-green-800 mb-2">Detalles del Viaje</h4>
            
            <div>
              <label className="text-xs font-medium mb-1 block">Origen</label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Ej: Renaico, Calle Principal 123"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Destino</label>
              <input
                type="text"
                value={rideDeliveryAddress}
                onChange={(e) => setRideDeliveryAddress(e.target.value)}
                placeholder="Ej: Angol, Hospital"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Hora de Salida</label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Asientos Necesarios</label>
              <input
                type="number"
                min="1"
                max="8"
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {/* Campos específicos para EXPRESS_ERRAND */}
        {requestType === 'express_errand' && (
          <div className="space-y-3 mb-4 bg-orange-50 p-3 rounded-lg">
            <h4 className="text-xs font-bold text-orange-800 mb-2">Detalles de la Compra</h4>
            
            <div>
              <label className="text-xs font-medium mb-1 block">Nombre del Negocio</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej: Supermercado Angol"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Cantidad de Artículos</label>
              <input
                type="number"
                min="1"
                value={itemsCount}
                onChange={(e) => setItemsCount(e.target.value)}
                placeholder="Ej: 15"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Tipo de Carga</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'medium', 'heavy'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setLoadType(type)}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${
                      loadType === type 
                        ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {type === 'light' ? 'Ligera' : type === 'medium' ? 'Media' : 'Pesada'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requiresVehicle}
                onChange={(e) => setRequiresVehicle(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-xs">Requiere vehículo</label>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Dirección de Entrega</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Calle, número, comuna"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {/* Campos específicos para Recados (legacy - mantener compatibilidad) */}
        {isRecados && requestType === 'express_errand' && !storeName && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Tipo de carga</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCargaTipo('sobre')}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${cargaTipo === 'sobre' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  📄 Sobre
                </button>
                <button
                  onClick={() => setCargaTipo('paquete')}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${cargaTipo === 'paquete' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  📦 Paquete
                </button>
                <button
                  onClick={() => setCargaTipo('bulto')}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${cargaTipo === 'bulto' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-gray-100 text-gray-500'}`}
                >
                  🛍️ Bulto
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Peso aproximado (kg)</label>
              <input
                type="number"
                value={cargaPeso}
                onChange={e => setCargaPeso(e.target.value)}
                placeholder="Ej: 2.5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Dirección de entrega</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Calle, número, comuna"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            {deliveryAddress && (
              <button
                onClick={() => {
                  const encodedAddress = encodeURIComponent(deliveryAddress)
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
                  window.open(url, '_blank')
                }}
                className="w-full bg-green-500 text-white py-2 rounded-xl font-bold text-sm hover:bg-green-600 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Abrir en Google Maps
              </button>
            )}
          </div>
        )}

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={
            requestType === 'ride_share' 
              ? "Detalles adicionales del viaje (opcional)..." 
              : requestType === 'express_errand'
              ? "Lista de productos o detalles de la compra..."
              : "Describe brevemente lo que necesitas..."
          }
          className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
          maxLength={500}
        />

        {/* Urgency */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setUrgency('normal')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${urgency === 'normal' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-500'}`}
          >
            Normal
          </button>
          <button
            onClick={() => setUrgency('urgent')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${urgency === 'urgent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500'}`}
          >
            Urgente
          </button>
        </div>

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50"
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Enviando...
            </span>
          ) : 'Enviar solicitud'}
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-2">El trabajador tiene 5 minutos para responder</p>
      </div>
    </div>
  )
}
