'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import dynamic from 'next/dynamic'
const VoiceInput = dynamic(() => import('./VoiceInput'), { ssr: false })
const AddressAutocomplete = dynamic(() => import('./AddressAutocomplete'), { ssr: false })
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
type TravelRole = 'driver' | 'passenger'

export default function PublishDemandModal({ userLat, userLng, categories, onClose, onPublished }: Props) {
  const [demandType, setDemandType] = useState<DemandType>('fixed_job')
  const [travelRole, setTravelRole] = useState<TravelRole>('passenger')
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

  // Asignar categoría automáticamente según tipo (usar primera disponible si no hay match)
  useEffect(() => {
    if (demandType === 'fixed_job') setCategoryId(null)
    // Para ride_share y express_errand, dejar que el usuario elija
  }, [demandType])

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
        payload.travel_role = travelRole
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
          travel_role: travelRole,
          seats,
          departure_time: new Date(departureTime).toISOString(),
          destination_name: destinationName.trim() || deliveryAddress.trim(),
          origin_address: pickupAddress.trim(),
          destination_address: deliveryAddress.trim(),
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

      const res = await apiFetch('/api/v1/demand/publish', fetchOptions)

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

  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">¿Qué necesitas?</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

          {/* Categoría */}
          <div>
            <label className="block text-sm font-semibold mb-2">Categoría <span className="text-red-500">*</span></label>
            <CategoryPicker
              categories={categories}
              selectedId={categoryId}
              onSelect={(id) => setCategoryId(id)}
              placeholder="¿Qué tipo de servicio?"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold mb-2">¿Qué necesitas? <span className="text-red-500">*</span></label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente lo que necesitas..."
                className="w-full h-24 px-3 py-2 pr-10 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2">
                <VoiceInput onTranscript={(t) => setDescription(prev => prev ? prev + ' ' + t : t)} />
              </div>
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-semibold mb-2">Precio ofrecido (CLP)</label>
            <input
              type="number"
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(e.target.value)}
              placeholder="Ej: 5000 (opcional)"
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Opciones avanzadas colapsables */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold"
          >
            <span>⚙️ Opciones avanzadas</span>
            <span>{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 border border-slate-200 rounded-xl p-3">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-500">Tipo de servicio</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['fixed_job','🔧 Trabajo'],['ride_share','🚗 Viaje'],['express_errand','📦 Compra']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setDemandType(val as DemandType)}
                      className={`py-2 rounded-lg text-xs font-semibold transition ${demandType === val ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'bg-gray-100 text-gray-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos ride_share */}
              {demandType === 'ride_share' && (
                <div className="space-y-2">
                  <AddressAutocomplete value={pickupAddress} onChange={setPickupAddress} onSelect={(v, lat, lng) => { setPickupAddress(v); setPickupLat(lat); setPickupLng(lng) }} placeholder="Origen" />
                  <AddressAutocomplete value={deliveryAddress} onChange={(v) => { setDeliveryAddress(v); setDestinationName(v) }} onSelect={(v, lat, lng) => { setDeliveryAddress(v); setDestinationName(v); setDeliveryLat(lat); setDeliveryLng(lng) }} placeholder="Destino" />
                  <input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}

              {/* Campos express_errand */}
              {demandType === 'express_errand' && (
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Nombre del negocio" className="w-full px-3 py-2 border rounded-lg text-sm" />
              )}

              {/* Urgencia */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-500">Urgencia</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low','medium','high'] as const).map(level => (
                    <button key={level} onClick={() => setUrgency(level)}
                      className={`py-2 rounded-lg text-xs font-semibold transition ${urgency === level ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : 'bg-gray-100 text-gray-500'}`}>
                      {level === 'low' ? 'Baja' : level === 'medium' ? 'Media' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Foto */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-500">Foto (opcional)</label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold">×</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-sm text-gray-500">
                    <span>📷 Agregar foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)) } }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Botón Publicar */}
          <button
            onClick={handlePublish}
            disabled={saving || !categoryId || !description.trim()}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publicando...' : '✨ Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
