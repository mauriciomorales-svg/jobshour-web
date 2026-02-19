'use client'

import { motion } from 'framer-motion'

interface ServiceRequest {
  id: number
  type?: 'ride_share' | 'express_errand' | 'fixed_job'
  category_type: 'fixed' | 'travel' | 'errand'
  status: string
  template: 'premium' | 'standard' | 'historical' | 'minimal'
  pos: { lat: number; lng: number }
  client: { name: string; avatar: string | null }
  category: { name: string; color: string }
  offered_price: number
  urgency: string
  distance_km: number
  created_at: string
  completed_at?: string
  description?: string
  payload?: {
    // ride_share
    seats?: number
    departure_time?: string
    destination_name?: string
    vehicle_type?: string
    // express_errand
    store_name?: string
    items_count?: number
    load_type?: string
    requires_vehicle?: boolean
    // fixed_job
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
  onRequestService?: (request: ServiceRequest) => void
  onOpenChat?: (request: ServiceRequest) => void
  onGoToLocation?: (request: ServiceRequest) => void
}

export default function ServiceCard({ request, index, onClick, isHighlighted, onRequestService, onOpenChat, onGoToLocation }: ServiceCardProps) {
  const template = request.template

  const colors = {
    fixed: 'from-amber-500 to-yellow-600',
    travel: 'from-blue-400 to-blue-600',
    errand: 'from-purple-400 to-purple-600',
  }

  const icons = {
    fixed: '🔧',
    travel: '🚗',
    errand: '🛍️',
  }

  if (template === 'premium') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`relative w-full h-48 rounded-2xl bg-gradient-to-r ${colors[request.category_type]} p-6 cursor-pointer shadow-2xl overflow-hidden ${
          isHighlighted ? 'ring-4 ring-white ring-opacity-50 animate-pulse' : ''
        }`}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative z-10 text-white h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{icons[request.category_type]}</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-bold uppercase">Premium</span>
            </div>
            <h3 className="text-3xl font-black mb-2">${request.offered_price.toLocaleString()}</h3>
            <p className="text-sm opacity-90 line-clamp-2">{request.description}</p>
            
            {/* Renderizado diferenciado por tipo */}
            {request.type === 'ride_share' && request.payload && (
              <div className="mt-2 flex gap-2 text-xs">
                {request.payload.seats && (
                  <span className="bg-white/20 px-2 py-1 rounded">👥 {request.payload.seats} asientos</span>
                )}
                {request.payload.destination_name && (
                  <span className="bg-white/20 px-2 py-1 rounded">📍 → {request.payload.destination_name}</span>
                )}
              </div>
            )}
            
            {request.type === 'express_errand' && request.payload && (
              <div className="mt-2 flex gap-2 text-xs">
                {request.payload.store_name && (
                  <span className="bg-white/20 px-2 py-1 rounded">🏪 {request.payload.store_name}</span>
                )}
                {request.payload.items_count && (
                  <span className="bg-white/20 px-2 py-1 rounded">📦 {request.payload.items_count} items</span>
                )}
              </div>
            )}
            
            {request.type === 'fixed_job' && request.payload && (
              <div className="mt-2 flex gap-2 text-xs">
                {request.payload.category && (
                  <span className="bg-white/20 px-2 py-1 rounded">🔧 {request.payload.category}</span>
                )}
                {request.payload.estimated_hours && (
                  <span className="bg-white/20 px-2 py-1 rounded">⏱️ {request.payload.estimated_hours}h</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full font-bold">
              📍 {request.distance_km}km
            </span>
            <span className="text-xs bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full font-bold uppercase">
              {request.urgency === 'high' ? '🔥 Urgente' : request.urgency}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  if (template === 'standard') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className={`bg-slate-800 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-all ${
          isHighlighted ? 'ring-2 ring-amber-500 border-amber-500' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${colors[request.category_type]} flex items-center justify-center text-2xl shrink-0`}>
            {icons[request.category_type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white truncate">{request.description || request.category.name}</h4>
            <p className="text-sm text-slate-400">{request.category.name}</p>
            
            {request.type === 'ride_share' && request.payload?.destination_name && (
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <span>🚗</span>
                <span>→ {request.payload.destination_name}</span>
                {request.payload.seats && <span className="text-blue-300">({request.payload.seats} asientos)</span>}
              </p>
            )}
            
            {request.type === 'express_errand' && request.payload?.store_name && (
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                <span>📦</span>
                <span>{request.payload.store_name}</span>
                {request.payload.items_count && <span className="text-purple-300">({request.payload.items_count} items)</span>}
              </p>
            )}
            
            <div className="mt-2 flex items-center gap-3">
              <span className="text-lg font-black text-emerald-400">${request.offered_price.toLocaleString()}</span>
              <span className="text-xs text-slate-500">📍 {request.distance_km}km</span>
              <span className="text-xs text-slate-500">⏱️ {request.created_at}</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (template === 'historical') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: index * 0.01 }}
        className="bg-slate-900/50 rounded-lg p-3 border border-slate-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">✅</span>
            <span className="text-sm text-slate-400">Alguien ganó ${request.offered_price.toLocaleString()}</span>
          </div>
          <span className="text-xs text-slate-600">{request.completed_at}</span>
        </div>
      </motion.div>
    )
  }

  if (template === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClick}
        className={`bg-slate-800 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-600 transition-all ${
          isHighlighted ? 'ring-2 ring-amber-500 border-amber-500' : ''
        }`}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl shrink-0">{icons[request.category_type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white mb-1">{request.description || 'Servicio'}</p>
            
            {/* Renderizado polimórfico para minimal */}
            {request.type === 'ride_share' && request.payload && (
              <div className="flex gap-2 text-xs text-slate-400 mb-2">
                {request.payload.seats && <span>👥 {request.payload.seats}</span>}
                {request.payload.destination_name && <span>→ {request.payload.destination_name}</span>}
              </div>
            )}
            
            {request.type === 'express_errand' && request.payload && (
              <div className="flex gap-2 text-xs text-slate-400 mb-2">
                {request.payload.store_name && <span>🏪 {request.payload.store_name}</span>}
                {request.payload.items_count && <span>📦 {request.payload.items_count} items</span>}
              </div>
            )}
            
            {request.type === 'fixed_job' && request.payload && (
              <div className="flex gap-2 text-xs text-slate-400 mb-2">
                {request.payload.category && <span>🔧 {request.payload.category}</span>}
                {request.payload.estimated_hours && <span>⏱️ {request.payload.estimated_hours}h</span>}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-emerald-400">${request.offered_price.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{request.distance_km.toFixed(2)}km</p>
          </div>
        </div>
        
        {/* Información de distancia */}
        <div className="mb-3 flex items-center justify-between text-xs bg-slate-700/50 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">🚶</span>
            <div>
              <p className="text-slate-300 font-semibold">{Math.round(request.distance_km * 12)} min</p>
              <p className="text-slate-500 text-[10px]">a pie</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-600"></div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">🚗</span>
            <div>
              <p className="text-slate-300 font-semibold">{Math.round(request.distance_km * 2)} min</p>
              <p className="text-slate-500 text-[10px]">en auto</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-600"></div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">📍</span>
            <div>
              <p className="text-slate-300 font-semibold">{request.distance_km.toFixed(2)} km</p>
              <p className="text-slate-500 text-[10px]">distancia</p>
            </div>
          </div>
        </div>
        
        {/* Botón de acción */}
        <div className="mb-2">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onRequestService?.(request);
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold py-2.5 px-4 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <span>💰</span>
            <span>Tomar Solicitud</span>
          </button>
        </div>
        
        {/* Botón para ir a ubicación exacta */}
        {onGoToLocation && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onGoToLocation(request)
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Ir a la ubicación exacta</span>
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  return null
}
