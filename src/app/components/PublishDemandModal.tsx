'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

interface Props {
  userLat: number
  userLng: number
  categories: Category[]
  onClose: () => void
  onPublished: () => void
}

type DemandType = 'fixed_job' | 'ride_share' | 'express_errand'

export default function PublishDemandModal({ userLat, userLng, categories, onClose, onPublished }: Props) {
  const [demandType, setDemandType] = useState<DemandType>('fixed_job')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [offeredPrice, setOfferedPrice] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  const [ttlMinutes, setTtlMinutes] = useState(30)
  
  // Campos para ride_share
  const [pickupAddress, setPickupAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [pickupLat, setPickupLat] = useState(userLat)
  const [pickupLng, setPickupLng] = useState(userLng)
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null)
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null)
  const [departureTime, setDepartureTime] = useState('')
  const [seats, setSeats] = useState(1)
  const [destinationName, setDestinationName] = useState('')
  
  // Campos para express_errand
  const [storeName, setStoreName] = useState('')
  const [itemsCount, setItemsCount] = useState('')
  const [loadType, setLoadType] = useState<'light' | 'medium' | 'heavy'>('medium')
  const [requiresVehicle, setRequiresVehicle] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Obtener ubicación actual como pickup por defecto
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPickupLat(position.coords.latitude)
          setPickupLng(position.coords.longitude)
        },
        () => {
          // Usar coordenadas proporcionadas si falla geolocalización
        }
      )
    }
  }, [])

  const handlePublish = async () => {
    setError('')
    
    // Validaciones básicas
    if (!categoryId) {
      setError('Selecciona una categoría')
      return
    }
    if (!description.trim()) {
      setError('Ingresa una descripción')
      return
    }

    // Validaciones específicas por tipo
    if (demandType === 'ride_share') {
      if (!pickupAddress.trim() || !deliveryAddress.trim()) {
        setError('Ingresa origen y destino')
        return
      }
      if (!departureTime) {
        setError('Selecciona hora de salida')
        return
      }
      const departureDate = new Date(departureTime)
      if (departureDate <= new Date()) {
        setError('La hora de salida debe ser en el futuro')
        return
      }
    }

    if (demandType === 'express_errand') {
      if (!storeName.trim()) {
        setError('Ingresa el nombre del negocio')
        return
      }
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError('Debes iniciar sesión')
        setSaving(false)
        return
      }

      const payload: any = {
        category_id: categoryId,
        description: description.trim(),
        lat: pickupLat,
        lng: pickupLng,
        offered_price: offeredPrice ? parseFloat(offeredPrice) : null,
        urgency,
        ttl_minutes: ttlMinutes,
        type: demandType,
        category_type: demandType === 'ride_share' ? 'travel' : demandType === 'express_errand' ? 'errand' : 'fixed',
      }

      // Agregar campos específicos según el tipo
      if (demandType === 'ride_share') {
        payload.pickup_address = pickupAddress.trim()
        payload.delivery_address = deliveryAddress.trim()
        payload.pickup_lat = pickupLat
        payload.pickup_lng = pickupLng
        payload.delivery_lat = deliveryLat
        payload.delivery_lng = deliveryLng
        payload.departure_time = new Date(departureTime).toISOString()
        payload.seats = seats
        payload.destination_name = destinationName.trim() || deliveryAddress.trim()
        payload.payload = {
          seats,
          departure_time: new Date(departureTime).toISOString(),
          destination_name: destinationName.trim() || deliveryAddress.trim(),
        }
      } else if (demandType === 'express_errand') {
        payload.store_name = storeName.trim()
        payload.items_count = itemsCount ? parseInt(itemsCount) : null
        payload.load_type = loadType
        payload.requires_vehicle = requiresVehicle
        payload.payload = {
          store_name: storeName.trim(),
          items_count: itemsCount ? parseInt(itemsCount) : null,
          load_type: loadType,
          requires_vehicle: requiresVehicle,
        }
      }

      const res = await fetch('/api/v1/demand/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.status === 'success') {
        // Mostrar mensaje de éxito
        setError('')
        // Pequeño delay para mostrar feedback visual
        setTimeout(() => {
          onPublished()
          onClose()
        }, 300)
      } else {
        setError(data.message || data.errors ? JSON.stringify(data.errors) : 'Error al publicar demanda')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Publicar Demanda</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tipo de Demanda */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Servicio</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDemandType('fixed_job')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  demandType === 'fixed_job' 
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                🔧 Trabajo
              </button>
              <button
                onClick={() => setDemandType('ride_share')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  demandType === 'ride_share' 
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                🚗 Viaje
              </button>
              <button
                onClick={() => setDemandType('express_errand')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  demandType === 'express_errand' 
                    ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                📦 Compra
              </button>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium mb-2">Categoría</label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Selecciona...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Campos específicos para RIDE_SHARE */}
          {demandType === 'ride_share' && (
            <div className="space-y-3 bg-green-50 p-3 rounded-lg">
              <h3 className="font-bold text-sm text-green-800">Detalles del Viaje</h3>
              
              <div>
                <label className="block text-xs font-medium mb-1">Origen</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Ej: Renaico, Calle Principal 123"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Destino</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value)
                    setDestinationName(e.target.value)
                  }}
                  placeholder="Ej: Angol, Hospital"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Hora de Salida</label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Asientos Necesarios</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Campos específicos para EXPRESS_ERRAND */}
          {demandType === 'express_errand' && (
            <div className="space-y-3 bg-orange-50 p-3 rounded-lg">
              <h3 className="font-bold text-sm text-orange-800">Detalles de la Compra</h3>
              
              <div>
                <label className="block text-xs font-medium mb-1">Nombre del Negocio</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ej: Supermercado Angol"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Cantidad de Artículos</label>
                <input
                  type="number"
                  min="1"
                  value={itemsCount}
                  onChange={(e) => setItemsCount(e.target.value)}
                  placeholder="Ej: 15"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Tipo de Carga</label>
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
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={demandType === 'ride_share' 
                ? "Detalles adicionales del viaje..." 
                : demandType === 'express_errand'
                ? "Lista de productos o detalles de la compra..."
                : "Describe lo que necesitas..."}
              className="w-full h-24 px-3 py-2 border rounded-lg text-sm resize-none"
              maxLength={500}
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium mb-2">Precio Ofrecido (CLP)</label>
            <input
              type="number"
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(e.target.value)}
              placeholder="Ej: 5000"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Urgencia */}
          <div>
            <label className="block text-sm font-medium mb-2">Urgencia</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setUrgency(level)}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    urgency === level 
                      ? 'bg-red-100 text-red-700 ring-2 ring-red-500' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {level === 'low' ? 'Baja' : level === 'medium' ? 'Media' : 'Alta'}
                </button>
              ))}
            </div>
          </div>

          {/* TTL */}
          <div>
            <label className="block text-sm font-medium mb-2">Visible por (minutos)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Botón Publicar */}
          <button
            onClick={handlePublish}
            disabled={saving || !categoryId || !description.trim()}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publicando...' : 'Publicar Demanda'}
          </button>
        </div>
      </div>
    </div>
  )
}
