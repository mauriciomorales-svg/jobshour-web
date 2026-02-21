'use client'

import { motion } from 'framer-motion'

interface ServiceRequest {
  id: number
  type?: 'ride_share' | 'express_errand' | 'fixed_job'
  category_type: 'fixed' | 'travel' | 'errand'
  status: string
  template: 'premium' | 'standard' | 'historical' | 'minimal'
  pos: { lat: number; lng: number }
  client: { id?: number; name: string; avatar: string | null }
  category: { name: string; color: string; icon?: string }
  offered_price: number
  urgency: string
  distance_km: number
  pickup_address?: string
  delivery_address?: string
  created_at: string
  completed_at?: string
  scheduled_at?: string | null
  workers_needed?: number
  workers_accepted?: number
  recurrence?: string
  recurrence_days?: number[] | null
  description?: string
  worker_id?: number | null
  payload?: {
    image?: string
    seats?: number
    departure_time?: string
    destination_name?: string
    vehicle_type?: string
    store_name?: string
    items_count?: number
    load_type?: string
    requires_vehicle?: boolean
    category?: string
    tools_provided?: boolean
    estimated_hours?: number
  }
}

interface ServiceCardProps {
  request: ServiceRequest
  index: number
  onClick: () => void
  isHighlighted?: boolean
  currentUserId?: number
  onRequestService?: (request: ServiceRequest) => void
  onOpenChat?: (request: ServiceRequest) => void
  onGoToLocation?: (request: ServiceRequest) => void
}

const TYPE_CONFIG = {
  fixed:  { gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-500',  icon: '🔧', label: 'Trabajo fijo'   },
  travel: { gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-500',   icon: '🚗', label: 'Viaje compartido' },
  errand: { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500', icon: '🛍️', label: 'Mandado express' },
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return ''
  // Si ya viene formateado (ej: "hace 2 meses") devolverlo directo
  if (dateStr.startsWith('hace') || dateStr.startsWith('Hace')) return dateStr
  const diff = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diff)) return dateStr
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Ahora mismo'
  if (m < 60) return `hace ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function PayloadChips({ request }: { request: ServiceRequest }) {
  if (!request.payload || Array.isArray(request.payload)) return null
  const chips: string[] = []
  if (request.type === 'ride_share') {
    if (request.payload.seats) chips.push(`👥 ${request.payload.seats} asientos`)
    if (request.payload.destination_name) chips.push(`📍 → ${request.payload.destination_name}`)
    if (request.payload.vehicle_type) chips.push(`🚘 ${request.payload.vehicle_type}`)
  }
  if (request.type === 'express_errand') {
    if (request.payload.store_name) chips.push(`🏪 ${request.payload.store_name}`)
    if (request.payload.items_count) chips.push(`📦 ${request.payload.items_count} items`)
    if (request.payload.requires_vehicle) chips.push(`🚐 Requiere vehículo`)
  }
  if (request.type === 'fixed_job') {
    if (request.payload.category) chips.push(`🔧 ${request.payload.category}`)
    if (request.payload.estimated_hours) chips.push(`⏱️ ${request.payload.estimated_hours}h est.`)
    if (request.payload.tools_provided) chips.push(`🧰 Herramientas incluidas`)
  }
  // Chips universales (scheduling, multi-worker, recurrence)
  if (request.scheduled_at) {
    const d = new Date(request.scheduled_at)
    chips.push(`📅 ${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`)
  }
  if (request.workers_needed && request.workers_needed > 1) {
    const accepted = request.workers_accepted ?? 0
    chips.push(`👥 ${accepted}/${request.workers_needed} personas`)
  }
  if (request.recurrence && request.recurrence !== 'once') {
    const labels: Record<string, string> = { daily: '🔄 Diario', weekly: '🔄 Semanal', custom: '🔄 Personalizado' }
    chips.push(labels[request.recurrence] || '🔄 Recurrente')
  }
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((c, i) => (
        <span key={i} className="text-xs bg-white/15 px-2 py-0.5 rounded-full">{c}</span>
      ))}
    </div>
  )
}

function ActionButtons({ request, onRequestService, onOpenChat, onGoToLocation }: Pick<ServiceCardProps, 'request' | 'onRequestService' | 'onOpenChat' | 'onGoToLocation'>) {
  const isDone = request.status === 'completed' || request.status === 'taken'
  return (
    <div className="mt-3 space-y-2">
      {isDone ? (
        <div className="w-full text-center py-2.5 bg-white/10 rounded-xl text-sm text-white/60 font-semibold">
          ✅ Ya tomada
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onRequestService?.(request) }}
          className="w-full py-3 bg-white text-slate-900 rounded-xl text-sm font-black hover:bg-white/90 active:scale-95 transition flex items-center justify-center gap-2 shadow-lg"
        >
          <span>⚡</span>
          <span>Tomar esta solicitud · ${request.offered_price.toLocaleString('es-CL')}</span>
        </button>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {onGoToLocation && (
          <button
            onClick={(e) => { e.stopPropagation(); onGoToLocation(request) }}
            className="flex items-center justify-center gap-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Mapa
          </button>
        )}
        {request.pos?.lat && request.pos?.lng && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${request.pos.lat},${request.pos.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition active:scale-95"
          >
            �️ Llegar
          </a>
        )}
        {onOpenChat && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenChat(request) }}
            className="flex items-center justify-center gap-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition active:scale-95"
          >
            💬 Chat
          </button>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`🔥 ¡Mira esta solicitud en JobsHours!\n${request.description || 'Servicio disponible'}\n💰 $${request.offered_price.toLocaleString('es-CL')}\n📍 ${request.pickup_address || 'Ver en mapa'}\n👉 ${typeof window !== 'undefined' ? window.location.origin : ''}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-xl text-sm font-bold transition active:scale-95"
        >
          📲 Compartir
        </a>
      </div>
    </div>
  )
}

export default function ServiceCard({ request, index, onClick, isHighlighted, currentUserId, onRequestService, onOpenChat, onGoToLocation }: ServiceCardProps) {
  const isOwnDemand = !!(currentUserId && request.client?.id && request.client.id === currentUserId)
  const cfg = TYPE_CONFIG[request.category_type] || TYPE_CONFIG.fixed

  if (request.template === 'historical') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ delay: index * 0.01 }}
        className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{cfg.icon}</span>
          <span className="text-sm text-slate-400">
            Alguien ganó <span className="font-bold text-emerald-500">${request.offered_price.toLocaleString('es-CL')}</span>
          </span>
        </div>
        <span className="text-xs text-slate-600">{request.completed_at ? formatTimeAgo(request.completed_at) : ''}</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={`relative rounded-2xl bg-gradient-to-br ${cfg.gradient} overflow-hidden shadow-xl ${
        isHighlighted ? 'ring-4 ring-white/60' : ''
      }`}
    >
      {/* Urgency ribbon */}
      {(request.urgency === 'high' || request.urgency === 'urgent') && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-wide">
          🔥 URGENTE
        </div>
      )}

      <div className="p-4">
        {/* Header: cliente + tipo + tiempo */}
        <div className="flex items-center gap-3 mb-3">
          {request.client.avatar ? (
            <img
              src={request.client.avatar}
              alt={request.client.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/40 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-base shrink-0 border-2 border-white/30">
              {request.client.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-bold text-base truncate">{request.client.name}</p>
              {isOwnDemand && (
                <span className="shrink-0 text-[9px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded-full">(yo)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background: request.category?.color || '#f59e0b', color: 'white'}}>
                {request.category?.name || cfg.label}
              </span>
              <span className="text-white/50 text-xs">{formatTimeAgo(request.created_at)}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-black text-xl">${request.offered_price.toLocaleString('es-CL')}</p>
            <p className="text-white/70 text-xs">oferta</p>
          </div>
        </div>

        {/* Descripción */}
        {request.description && (
          <p className="text-white/90 text-base leading-snug mb-2 line-clamp-2">{request.description}</p>
        )}

        {/* Imagen adjunta */}
        {request.payload?.image && (
          <div className="mt-2 mb-2 rounded-xl overflow-hidden">
            <img src={request.payload.image} alt="Foto adjunta" className="w-full h-32 object-cover rounded-xl border border-white/10" />
          </div>
        )}

        {/* Chips de payload */}
        <PayloadChips request={request} />

        {/* Dirección + Ruta + Distancia */}
        <div className="mt-3 bg-black/20 rounded-xl p-2.5 text-sm text-white/80 space-y-1.5">
          {/* Origen → Destino para viajes y mandados */}
          {request.pickup_address && request.delivery_address ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
                <span className="font-medium truncate">{request.pickup_address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                <span className="font-medium truncate">{request.delivery_address}</span>
              </div>
            </div>
          ) : request.pickup_address ? (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="font-medium truncate">{request.pickup_address}</span>
            </div>
          ) : null}
          {request.distance_km > 0.01 && (
            <div className="flex items-center gap-3">
              <span className="font-bold">{request.distance_km.toFixed(1)} km</span>
              <span className="text-white/40">·</span>
              <span>🚶 ~{Math.round(request.distance_km * 12)} min</span>
              <span className="text-white/40">·</span>
              <span>🚗 ~{Math.max(1, Math.round(request.distance_km * 2))} min</span>
            </div>
          )}
          {!request.pickup_address && !request.delivery_address && request.distance_km <= 0.01 && (
            <span className="text-white/50">📍 Ubicación disponible en el mapa</span>
          )}
        </div>

        {/* Botones de acción — SIEMPRE visibles */}
        <ActionButtons
          request={request}
          onRequestService={onRequestService}
          onOpenChat={onOpenChat}
          onGoToLocation={onGoToLocation}
        />
      </div>
    </motion.div>
  )
}
