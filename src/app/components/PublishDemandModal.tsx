'use client'

import { useState, useEffect } from 'react'
import CategoryPicker from './CategoryPicker'

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

  // Programación y multi-worker
  const [scheduledAt, setScheduledAt] = useState('')
  const [workersNeeded, setWorkersNeeded] = useState(1)
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'custom'>('once')
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])

  // Imagen adjunta
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

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
        workers_needed: workersNeeded,
        recurrence,
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
        ...(recurrence === 'custom' && recurrenceDays.length > 0 ? { recurrence_days: recurrenceDays } : {}),
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

      // Use FormData if there's an image, otherwise JSON
      let fetchOptions: RequestInit
      if (imageFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object' && key === 'payload') {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, String(value))
            }
          }
        })
        formData.append('image', imageFile)
        fetchOptions = {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        }
      } else {
        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      }

      const res = await fetch('/api/v1/demand/publish', fetchOptions)

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
            <CategoryPicker
              categories={categories}
              selectedId={categoryId}
              onSelect={(id) => setCategoryId(id)}
              placeholder="Buscar categoría..."
            />
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

          {/* Imagen adjunta (opcional) */}
          <div>
            <label className="block text-sm font-medium mb-2">Foto (opcional)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold hover:bg-red-600"
                >×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-500">
                <span>📷</span>
                <span>Agregar foto del producto o lugar</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setImageFile(file)
                      setImagePreview(URL.createObjectURL(file))
                    }
                  }}
                />
              </label>
            )}
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

          {/* Opciones avanzadas */}
          <div className="space-y-3 bg-purple-50 p-3 rounded-lg">
            <h3 className="font-bold text-sm text-purple-800">⚡ Opciones avanzadas</h3>

            {/* Programar para después */}
            <div>
              <label className="block text-xs font-medium mb-1">📅 Programar para después (opcional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              {scheduledAt && (
                <button onClick={() => setScheduledAt('')} className="text-xs text-red-500 mt-1 hover:underline">✕ Quitar programación (publicar ahora)</button>
              )}
            </div>

            {/* Multi-worker */}
            <div>
              <label className="block text-xs font-medium mb-1">👥 ¿Cuántas personas necesitas?</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWorkersNeeded(Math.max(1, workersNeeded - 1))}
                  className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-300"
                >−</button>
                <span className="w-10 text-center font-bold text-lg">{workersNeeded}</span>
                <button
                  onClick={() => setWorkersNeeded(Math.min(20, workersNeeded + 1))}
                  className="w-8 h-8 rounded-lg bg-purple-200 text-purple-700 font-bold text-lg hover:bg-purple-300"
                >+</button>
                <span className="text-xs text-gray-500 ml-2">
                  {workersNeeded === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>

            {/* Recurrencia */}
            <div>
              <label className="block text-xs font-medium mb-1">🔄 ¿Se repite?</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: 'once' as const, label: 'Una vez' },
                  { value: 'daily' as const, label: 'Diario' },
                  { value: 'weekly' as const, label: 'Semanal' },
                  { value: 'custom' as const, label: 'Personalizado' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRecurrence(opt.value)}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition ${
                      recurrence === opt.value
                        ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {recurrence === 'custom' && (
                <div className="flex gap-1 mt-2">
                  {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day, i) => (
                    <button
                      key={i}
                      onClick={() => setRecurrenceDays(prev =>
                        prev.includes(i + 1) ? prev.filter(d => d !== i + 1) : [...prev, i + 1]
                      )}
                      className={`w-9 h-9 rounded-full text-[10px] font-bold transition ${
                        recurrenceDays.includes(i + 1)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
