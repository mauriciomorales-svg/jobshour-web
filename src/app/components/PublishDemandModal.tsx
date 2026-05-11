'use client'

import { useState, useEffect } from 'react'
import { Wrench, Car, Package, ShoppingCart } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import dynamic from 'next/dynamic'
const VoiceInput = dynamic(() => import('./VoiceInput'), { ssr: false })
import CategoryPicker from './CategoryPicker'
import StoreBrowserInline from './StoreBrowserInline'
import { trackEvent } from '@/lib/analytics'
import { isJhFlowDebugEnabled, jhFlowHintOnce, jhFlowLog } from '@/lib/jhFlowLog'
import { demandTypeGlossary, feedbackCopy, surfaceCopy, type DemandTypeKey } from '@/lib/userFacingCopy'
import { ModalShell } from '@/app/components/ui/ModalShell'
import type { MapPoint } from '@/app/components/MapSection'

interface Category {
  id: number
  slug?: string
  name: string
  icon: string
  color: string
}

/** datetime-local → `Y-m-d H:i:s` sin duplicar `:00` si el navegador ya manda segundos */
function formatDepartureForApi(raw: string): string {
  if (!raw) return ''
  const s = raw.includes('T') ? raw.replace('T', ' ') : raw.trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return `${s}:00`
  return s
}

function slugHints(slug: string, hints: string[]): boolean {
  const s = slug.toLowerCase()
  return hints.some((h) => s.includes(h))
}

/** Alineado con categorías reales (ej. Fletes y Mudanzas / truck), no solo "viaje" + car */
function pickRideShareCategoryId(categories: Category[]): number | null {
  const hit = categories.find((c) => {
    const name = (c.name || '').toLowerCase()
    const slug = (c.slug || '').toLowerCase()
    const icon = (c.icon || '').toLowerCase()
    return (
      name.includes('viaje') ||
      name.includes('flete') ||
      name.includes('mudanza') ||
      name.includes('transporte') ||
      slugHints(slug, ['viaje', 'ride', 'flete', 'mudanza', 'transporte', 'movilidad']) ||
      icon === 'car' ||
      icon === 'truck'
    )
  })
  return hit?.id ?? null
}

function pickErrandCategoryId(categories: Category[]): number | null {
  const hit = categories.find((c) => {
    const name = (c.name || '').toLowerCase()
    const slug = (c.slug || '').toLowerCase()
    const icon = (c.icon || '').toLowerCase()
    return (
      name.includes('mandado') ||
      name.includes('recado') ||
      name.includes('trámite') ||
      name.includes('tramite') ||
      slugHints(slug, ['mandado', 'recado', 'recados', 'tramite', 'errand']) ||
      icon === 'package' ||
      icon === 'motorcycle'
    )
  })
  return hit?.id ?? null
}

function firstApiErrorLine(data: { message?: string; errors?: Record<string, string[]> }): string {
  if (data.errors && typeof data.errors === 'object') {
    const lines = Object.entries(data.errors).flatMap(([key, msgs]) =>
      Array.isArray(msgs) ? msgs.map((m) => `${m} (${key})`) : [`${msgs} (${key})`],
    )
    if (lines.length) return [data.message, ...lines].filter(Boolean).join(' ')
  }
  return data.message || 'Error al publicar demanda'
}

/** Tarjeta + pin para mostrar al instante sin esperar al API de listados */
export interface PublishedDemandSnapshot {
  feedItem: {
    id: number
    worker_id: null
    type?: 'ride_share' | 'express_errand' | 'fixed_job'
    category_type: 'fixed' | 'travel' | 'errand'
    status: string
    template: 'premium' | 'standard' | 'historical' | 'minimal'
    pos: { lat: number; lng: number }
    client: { id?: number; name: string; avatar: string | null }
    category: { name: string; color: string; icon?: string }
    offered_price: number | null
    urgency: string
    distance_km: number
    pickup_address?: string
    delivery_address?: string
    created_at: string
    workers_needed?: number
    workers_accepted?: number
    recurrence?: string
    recurrence_days?: number[] | null
    description?: string
    payload?: Record<string, unknown> | null
    scheduled_at?: string | null
  }
  mapPoint: MapPoint
}

function mapUrgencyToDb(u: 'low' | 'medium' | 'high'): 'normal' | 'urgent' {
  return u === 'high' ? 'urgent' : 'normal'
}

function buildOptimisticSnapshot(input: {
  requestId: number
  publisher: { id: number; name: string; avatarUrl: string | null } | null
  demandType: DemandType
  resolvedCategoryId: number
  categories: Category[]
  description: string
  offeredPrice: string
  urgency: 'low' | 'medium' | 'high'
  pickupLat: number
  pickupLng: number
  workersNeeded: number
  recurrence: 'once' | 'daily' | 'weekly' | 'custom'
  recurrenceDays: number[]
  scheduledAt: string
  pickupAddress?: string
  deliveryAddress?: string
  payloadForCard: Record<string, unknown> | null
}): PublishedDemandSnapshot | null {
  if (input.demandType === 'buscar_producto') return null

  const cat = input.categories.find((c) => c.id === input.resolvedCategoryId)
  const dbUrgency = mapUrgencyToDb(input.urgency)
  const parsedPrice = input.offeredPrice ? Math.round(parseFloat(input.offeredPrice)) : null
  const category_type: 'fixed' | 'travel' | 'errand' =
    input.demandType === 'ride_share' ? 'travel' : input.demandType === 'express_errand' ? 'errand' : 'fixed'

  const feedItem: PublishedDemandSnapshot['feedItem'] = {
    id: input.requestId,
    worker_id: null,
    type: input.demandType as 'fixed_job' | 'ride_share' | 'express_errand',
    category_type,
    status: 'pending',
    template: 'standard',
    description: input.description,
    pos: { lat: input.pickupLat, lng: input.pickupLng },
    client: {
      id: input.publisher?.id,
      name: input.publisher?.name ?? 'Tú',
      avatar: input.publisher?.avatarUrl ?? null,
    },
    category: {
      name: cat?.name ?? 'General',
      color: cat?.color ?? '#f59e0b',
      icon: cat?.icon,
    },
    offered_price: parsedPrice,
    urgency: dbUrgency,
    distance_km: 0,
    pickup_address: input.pickupAddress,
    delivery_address: input.deliveryAddress,
    created_at: new Date().toISOString(),
    workers_needed: input.workersNeeded,
    workers_accepted: 0,
    recurrence: input.recurrence,
    recurrence_days: input.recurrenceDays.length > 0 ? input.recurrenceDays : null,
    scheduled_at: input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null,
    payload: input.payloadForCard,
  }

  const mapPoint: MapPoint = {
    id: input.requestId,
    pos: { lat: input.pickupLat, lng: input.pickupLng },
    name: feedItem.client.name,
    avatar: feedItem.client.avatar,
    price: parsedPrice ?? 0,
    category_color: feedItem.category.color,
    category_slug: cat?.slug ?? null,
    category_name: feedItem.category.name,
    fresh_score: 0,
    status: 'demand',
    pin_type: 'demand',
    urgency: dbUrgency,
    payload: (feedItem.payload ?? null) as MapPoint['payload'],
    description: input.description,
    distance_km: 0,
  }

  return { feedItem, mapPoint }
}

export interface PublishDemandInitialDraft {
  /** Texto inicial (p. ej. últimos mensajes del chat o descripción del pedido actual) */
  description?: string
}

interface Props {
  userLat: number
  userLng: number
  categories: Category[]
  publisher: { id: number; name: string; avatarUrl: string | null } | null
  /** Si viene desde el chat u otro flujo: precarga el mismo formulario centralizado */
  initialDraft?: PublishDemandInitialDraft | null
  onClose: () => void
  onPublished: (snapshot?: PublishedDemandSnapshot) => void
}

type DemandType = 'fixed_job' | 'ride_share' | 'express_errand' | 'buscar_producto'
type TravelRole = 'driver' | 'passenger'

const DEMAND_TYPE_CARDS: {
  val: DemandType
  Icon: typeof Wrench
  label: string
  sub: string
  accent: 'amber' | 'orange'
}[] = [
  { val: 'fixed_job', Icon: Wrench, label: 'Trabajo', sub: 'Electricista, plomero…', accent: 'amber' },
  { val: 'ride_share', Icon: Car, label: 'Viaje', sub: 'Llevarme o traerme', accent: 'amber' },
  { val: 'express_errand', Icon: Package, label: 'Mandado', sub: 'Compras, delivery', accent: 'amber' },
  { val: 'buscar_producto', Icon: ShoppingCart, label: 'Buscar tiendas', sub: 'Tiendas cercanas', accent: 'orange' },
]

export default function PublishDemandModal({ userLat, userLng, categories, publisher, initialDraft, onClose, onPublished }: Props) {
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
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})

  // Asignar categoría automáticamente según tipo (usar primera disponible si no hay match)
  useEffect(() => {
    if (demandType === 'fixed_job') setCategoryId(null)
    // Para ride_share y express_errand, dejar que el usuario elija
  }, [demandType])

  useEffect(() => {
    trackEvent('demand_publish_modal_open', {})
    jhFlowHintOnce()
  }, [])

  useEffect(() => {
    const d = initialDraft?.description?.trim()
    if (d) setDescription(d.slice(0, 500))
  }, [initialDraft])

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
    const errs: Record<string,string> = {}

    const resolvedCategoryId =
      demandType === 'ride_share'
        ? pickRideShareCategoryId(categories) ?? categoryId
        : demandType === 'express_errand'
          ? pickErrandCategoryId(categories) ?? categoryId
          : categoryId

    // Validaciones básicas
    if (demandType === 'fixed_job' && !categoryId) errs.category = 'Selecciona una categoría'
    if (
      (demandType === 'ride_share' || demandType === 'express_errand') &&
      !resolvedCategoryId
    ) {
      errs.category =
        'No hay categoría de viaje o mandado en el sistema. Pide a un administrador revisar las categorías activas.'
    }
    if (!description.trim()) errs.description = 'Describe lo que necesitas'

    // Validaciones por tipo
    if (demandType === 'ride_share') {
      if (!pickupAddress.trim()) errs.pickup = 'Ingresa el origen'
      if (!deliveryAddress.trim()) errs.delivery = 'Ingresa el destino'
      if (!departureTime) errs.departure = 'Selecciona hora de salida'
      else if (new Date(departureTime) <= new Date()) errs.departure = 'La hora debe ser en el futuro'
    }
    if (demandType === 'express_errand') {
      if (!storeName.trim()) errs.storeName = 'Ingresa el nombre del negocio'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      // Scroll al primer error
      setTimeout(() => document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    setFieldErrors({})

    setSaving(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError('Debes iniciar sesión')
        setSaving(false)
        return
      }

      const payload: any = {
        category_id: resolvedCategoryId,
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
        const depStr = formatDepartureForApi(departureTime)
        payload.travel_role = travelRole
        payload.pickup_address = pickupAddress.trim()
        payload.delivery_address = deliveryAddress.trim()
        payload.pickup_lat = pickupLat
        payload.pickup_lng = pickupLng
        payload.delivery_lat = deliveryLat
        payload.delivery_lng = deliveryLng
        // Enviar como string local (sin convertir a UTC) para que el backend valide correctamente
        payload.departure_time = depStr
        payload.seats = seats
        payload.destination_name = destinationName.trim() || deliveryAddress.trim()
        payload.payload = {
          travel_role: travelRole,
          seats,
          departure_time: depStr,
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

      if (isJhFlowDebugEnabled()) {
        jhFlowLog('POST /api/v1/demand/publish', {
          offered_price: payload.offered_price,
          type: payload.type,
          category_id: payload.category_id,
          ttl_minutes: payload.ttl_minutes,
          has_image: Boolean(imageFile),
          demandMode: imageFile ? 'multipart' : 'json',
        })
      }

      const res = await apiFetch('/api/v1/demand/publish', fetchOptions)

      const data = await res.json()
      if (isJhFlowDebugEnabled()) {
        jhFlowLog('demand/publish → resultado', { ok: res.ok, http: res.status, status: data?.status, body: data })
      }
      if (res.ok && data.status === 'success') {
        trackEvent('demand_publish_success', {
          type: demandType,
          category_type: demandType === 'ride_share' ? 'travel' : demandType === 'express_errand' ? 'errand' : 'fixed',
        })
        setError('')
        const requestId = Number(data?.data?.request_id)
        let snapshot: PublishedDemandSnapshot | undefined
        if (Number.isFinite(requestId) && resolvedCategoryId != null) {
          const payloadForCard: Record<string, unknown> | null =
            demandType === 'ride_share' && payload.payload && typeof payload.payload === 'object'
              ? { ...(payload.payload as Record<string, unknown>) }
              : demandType === 'express_errand' && payload.payload && typeof payload.payload === 'object'
                ? { ...(payload.payload as Record<string, unknown>) }
                : null
          snapshot =
            buildOptimisticSnapshot({
              requestId,
              publisher,
              demandType,
              resolvedCategoryId,
              categories,
              description: description.trim(),
              offeredPrice,
              urgency,
              pickupLat,
              pickupLng,
              workersNeeded,
              recurrence,
              recurrenceDays,
              scheduledAt,
              pickupAddress: demandType === 'ride_share' ? pickupAddress.trim() : undefined,
              deliveryAddress: demandType === 'ride_share' ? deliveryAddress.trim() : undefined,
              payloadForCard,
            }) ?? undefined
        }
        onPublished(snapshot)
        onClose()
      } else {
        const msg = firstApiErrorLine(data)
        trackEvent('demand_publish_error', { type: demandType, message: String(msg).slice(0, 200) })
        setError(msg)
      }
    } catch (err: any) {
      trackEvent('demand_publish_error', { type: demandType, message: err?.message || 'connection' })
      setError(err.message || feedbackCopy.networkError)
    } finally {
      setSaving(false)
    }
  }

  const [showAdvanced, setShowAdvanced] = useState(false)

  const inputCls = "w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"

  return (
    <ModalShell
      onClose={onClose}
      titleId="demand-modal-title"
      title="¿Qué necesitas?"
      subtitle="Publica tu solicitud y recibe respuestas"
      variant="bottomSheet"
      bodyClassName="max-h-[78vh] px-5 py-4 space-y-5 pb-8"
    >
          {error && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between bg-teal-500/10 border border-teal-500/25 rounded-xl px-3 py-2">
            <span className="text-xs font-black text-teal-300 uppercase tracking-wide">Esencial</span>
            <span className="text-[10px] text-slate-400">Lo minimo para publicar</span>
          </div>

          {/* Tipo de servicio — PRIMERO y visible */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de solicitud</label>
            <p className="text-[11px] text-slate-500 mb-3 -mt-1">Elige una opción; luego completa los datos abajo.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMAND_TYPE_CARDS.map(({ val, Icon, label, sub, accent }) => {
                const selected = demandType === val
                const isOrange = accent === 'orange'
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setDemandType(val)
                      trackEvent('demand_type_select', { type: val })
                    }}
                    title={demandTypeGlossary[val as DemandTypeKey].body}
                    aria-pressed={selected}
                    className={`min-h-[104px] py-3 px-3 rounded-2xl text-left flex flex-col justify-between gap-2 transition active:scale-[0.98] motion-safe:transition-transform ${
                      selected
                        ? isOrange
                          ? 'bg-orange-500/15 ring-2 ring-orange-400 shadow-[0_0_0_1px_rgba(251,146,60,0.15)]'
                          : 'bg-amber-500/15 ring-2 ring-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]'
                        : 'bg-slate-800/90 border border-slate-700/90 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selected
                          ? isOrange
                            ? 'bg-orange-500/25 text-orange-200'
                            : 'bg-amber-500/25 text-amber-200'
                          : 'bg-slate-700/70 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`block text-xs font-black leading-tight ${
                          selected ? (isOrange ? 'text-orange-200' : 'text-amber-100') : 'text-slate-100'
                        }`}
                      >
                        {label}
                      </span>
                      <span className={`block text-[10px] leading-snug mt-0.5 ${selected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {sub}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Buscar tiendas — mientras se habilita búsqueda real por producto */}
          {demandType === 'buscar_producto' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 space-y-3">
              <p className="text-orange-300 font-black text-sm">🛒 Tiendas cercanas</p>
              <p className="text-slate-400 text-xs">Busca por nombre de tienda o vendedor. Toca una tienda para ver su catálogo.</p>
              <StoreBrowserInline userLat={userLat} userLng={userLng} />
            </div>
          )}

          {/* Categoría — solo para trabajo general */}
          {demandType === 'fixed_job' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Categoría <span className="text-amber-500">*</span>
              </label>
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={(id) => { setCategoryId(id); setFieldErrors(e => ({...e, category: ''})) }}
                placeholder="¿Qué tipo de servicio?"
              />
              {fieldErrors.category && <p data-field-error className="text-red-400 text-xs mt-1">{fieldErrors.category}</p>}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Descripción <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors(er => ({...er, description: ''})) }}
                placeholder="Describe brevemente lo que necesitas..."
                className={`w-full min-h-[104px] px-3.5 py-2.5 pb-9 pr-12 bg-slate-800 border text-white placeholder:text-slate-500 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition ${fieldErrors.description ? 'border-red-500' : 'border-slate-700'}`}
                maxLength={500}
                rows={4}
              />
              <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[10px] tabular-nums text-slate-500">
                {description.length}/500
              </span>
              <div className="absolute bottom-2 right-2.5">
                <VoiceInput onTranscript={(t) => setDescription(prev => prev ? prev + ' ' + t : t)} />
              </div>
            </div>
            {fieldErrors.description && <p data-field-error className="text-red-400 text-xs mt-1.5">{fieldErrors.description}</p>}
          </div>

          {/* Precio */}
          <div className="pt-1 border-t border-slate-800/90">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">¿Cuánto pagarías? <span className="text-slate-600 font-normal normal-case">(opcional)</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                placeholder="Ej: 10000"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Pesos chilenos (CLP). El trabajador puede proponer otro monto.</p>
          </div>

          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wide">Sugerido</span>
            <span className="text-[10px] text-slate-400">Mejora la coordinacion</span>
          </div>

          {/* Campos ride_share */}
          {demandType === 'ride_share' && (
            <div className="space-y-3 bg-teal-500/5 border border-teal-500/20 rounded-xl p-3">
              <p className="text-xs font-black text-teal-400 uppercase tracking-wider">Detalles del viaje</p>
              <div>
                <input type="text" value={pickupAddress} onChange={e => { setPickupAddress(e.target.value); setFieldErrors(er => ({...er, pickup: ''})) }} placeholder="Origen (ej: Plaza de Renaico)" className={inputCls} />
                {fieldErrors.pickup && <p data-field-error className="text-red-400 text-xs mt-1">{fieldErrors.pickup}</p>}
              </div>
              <div>
                <input type="text" value={deliveryAddress} onChange={e => { setDeliveryAddress(e.target.value); setDestinationName(e.target.value); setFieldErrors(er => ({...er, delivery: ''})) }} placeholder="Destino (ej: Hospital de Angol)" className={inputCls} />
                {fieldErrors.delivery && <p data-field-error className="text-red-400 text-xs mt-1">{fieldErrors.delivery}</p>}
              </div>
              <div>
                <input type="datetime-local" value={departureTime} onChange={e => { setDepartureTime(e.target.value); setFieldErrors(er => ({...er, departure: ''})) }} className={inputCls} />
                {fieldErrors.departure && <p data-field-error className="text-red-400 text-xs mt-1">{fieldErrors.departure}</p>}
              </div>
            </div>
          )}

          {/* Campos express_errand */}
          {demandType === 'express_errand' && (
            <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider">Detalles de compra/recado</p>
              <div>
                <input type="text" value={storeName} onChange={e => { setStoreName(e.target.value); setFieldErrors(er => ({...er, storeName: ''})) }} placeholder="Nombre del negocio (ej: Supermercado Angol)" className={inputCls} />
                {fieldErrors.storeName && <p data-field-error className="text-red-400 text-xs mt-1">{fieldErrors.storeName}</p>}
              </div>
              {storeName.trim().length > 2 && (
                <a href={`https://maps.google.com/maps?saddr=Mi+ubicaci%C3%B3n&daddr=${encodeURIComponent(storeName)}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition">
                  <span>📍</span><span>Cómo llegar (Google Maps)</span>
                </a>
              )}
            </div>
          )}

          {/* Opciones avanzadas */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Más opciones
            </span>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showAdvanced && (
            <div className="space-y-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              {/* Urgencia */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Urgencia</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['low','🟢','Baja'],['medium','🟡','Media'],['high','🔴','Alta']] as const).map(([level, dot, label]) => (
                    <button key={level} type="button" onClick={() => setUrgency(level)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${urgency === level ? 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-500' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                      <span>{dot}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Foto */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Foto (opcional)</label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full text-sm font-black flex items-center justify-center transition">×</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl cursor-pointer text-sm text-slate-500 hover:text-slate-400 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>Agregar foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)) } }} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Botón Publicar — no aplica en buscar_producto */}
          {demandType !== 'buscar_producto' && (
            <>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-2xl font-black text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {surfaceCopy.publishing}
                  </span>
                ) : surfaceCopy.publishDemandCta}
              </button>
              <p className="text-[10px] text-slate-600 text-center pb-2">Los trabajadores cercanos recibirán una notificación</p>
            </>
          )}
    </ModalShell>
  )
}
