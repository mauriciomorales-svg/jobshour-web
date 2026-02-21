'use client'

import { MapContainer, TileLayer, Marker, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, forwardRef, useImperativeHandle, useState, useCallback, useRef } from 'react'

export interface MapPoint {
  id: number
  user_id?: number
  pos: { lat: number; lng: number }
  name: string
  avatar: string | null
  price: number
  category_color: string
  category_slug: string | null
  category_name?: string
  fresh_score: number
  status: 'active' | 'intermediate' | 'inactive' | 'demand'
  microcopy?: string
  has_video?: boolean
  urgency?: 'normal' | 'urgent'
  pin_type?: 'worker' | 'demand'
  travel_role?: 'driver' | 'passenger' | null
  payload?: Record<string, any> | null
  description?: string
  distance_km?: number
  active_route?: {
    available_seats?: number
    destination?: { address: string }
    departure_time?: string
  }
}

const STATUS_STYLES = {
  active: { ring: '#22c55e', dot: '#22c55e', bg: '#22c55e', opacity: '1', shadow: '0 8px 24px rgba(34,197,94,0.25)', grayscale: '' }, // Verde - Disponibilidad inmediata
  intermediate: { ring: '#38bdf8', dot: '#38bdf8', bg: '#38bdf8', opacity: '0.9', shadow: '0 6px 18px rgba(56,189,248,0.3)', grayscale: '' }, // Azul cielo - Modo escucha
  inactive: { ring: '#6b7280', dot: '#6b7280', bg: '#6b7280', opacity: '0.5', shadow: '0 4px 12px rgba(107,114,128,0.15)', grayscale: 'filter:grayscale(0.4);' }, // PLOMO/Gris - Desactivo
  demand: { ring: '#d97706', dot: '#d97706', bg: 'linear-gradient(135deg, #d97706, #f59e0b)', opacity: '1', shadow: '0 8px 24px rgba(217,119,6,0.4)', grayscale: '' }, // Dorado OSCURO - Demanda activa (más oscuro/naranja que amarillo)
}

function createPointIcon(p: MapPoint, isHighlighted = false) {
  // Pines dorados para demanda - con avatar del worker
  if (p.pin_type === 'demand') {
    const avatar = p.avatar || `https://i.pravatar.cc/100?u=${p.id}`
    const price = `$${Math.round(p.price / 1000)}k`
    const isDriver = p.travel_role === 'driver'
    const isPassenger = p.travel_role === 'passenger'
    const isTravelPin = isDriver || isPassenger

    // Colores según rol de viaje
    const pinColor = isDriver ? '#10b981' : isPassenger ? '#3b82f6' : '#f59e0b'
    const pinGradient = isDriver
      ? 'linear-gradient(135deg,#10b981,#059669)'
      : isPassenger
      ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
      : 'linear-gradient(135deg,#f59e0b,#eab308)'
    const pinGlow = isDriver
      ? 'rgba(16,185,129,0.5)'
      : isPassenger
      ? 'rgba(59,130,246,0.5)'
      : 'rgba(245,158,11,0.5)'
    const travelEmoji = isDriver ? '🚗' : isPassenger ? '🙋' : ''
    const seats = p.payload?.seats ? `·${p.payload.seats}💺` : ''
    const dest = p.payload?.destination_name || p.payload?.destination_address || ''
    const destShort = dest.length > 12 ? dest.slice(0, 12) + '…' : dest

    const urgentBadge = p.urgency === 'urgent' ? `
      <div style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:white;font-size:10px;font-weight:900;padding:2px 6px;border-radius:999px;border:2px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);animation:pulse 1.5s infinite;pointer-events:none">🔥</div>
    ` : ''
    const highlightRing = isHighlighted ? `
      <div style="position:absolute;inset:-12px;border-radius:999px;border:4px solid #ef4444;animation:pulse 1s infinite;pointer-events:none"></div>
      <div style="position:absolute;inset:-20px;border-radius:999px;border:2px solid rgba(239,68,68,0.3);animation:pulse 1.5s infinite;pointer-events:none"></div>
    ` : ''
    const size = isHighlighted ? 60 : 48
    const iconW = isHighlighted ? 190 : 170
    const iconH = isHighlighted ? 110 : 90

    const labelText = isTravelPin
      ? `${travelEmoji} ${(p.name || '').split(' ')[0]}${seats}${destShort ? ' → ' + destShort : ''}`
      : `${isHighlighted ? '📍 ' : ''}${(p.name || '').split(' ')[0]} · ${price}`

    return L.divIcon({
      className: 'leaflet-marker-icon-demand',
      iconSize: [iconW, iconH],
      iconAnchor: [iconW / 2, iconH],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:opacity 0.3s;pointer-events:auto;${isHighlighted ? 'z-index:9999!important;' : ''}">
          <div style="width:${size}px;height:${size}px;border-radius:999px;padding:2.5px;background:white;box-shadow:${isHighlighted ? `0 0 30px rgba(239,68,68,0.6),0 8px 24px ${pinGlow}` : `0 8px 24px ${pinGlow}`};position:relative;border:3px solid ${isHighlighted ? '#ef4444' : pinColor};pointer-events:none">
            <img src="${avatar}" style="width:100%;height:100%;border-radius:999px;object-fit:cover;pointer-events:none" />
            <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;background:${pinColor};border:2px solid white;border-radius:999px;animation:pulse 2s infinite;pointer-events:none"></div>
            ${urgentBadge}
            ${highlightRing}
          </div>
          <div style="background:${isHighlighted ? `linear-gradient(135deg,#ef4444,${pinColor})` : pinGradient};color:#ffffff;padding:${isHighlighted ? '5px 14px' : '4px 10px'};border-radius:999px;font-size:${isHighlighted ? '13px' : '10px'};font-weight:900;font-style:italic;margin-top:5px;box-shadow:0 4px 12px ${pinGlow};white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;border:2px solid white;letter-spacing:-0.02em;pointer-events:none">
            ${labelText}
          </div>
        </div>
      `,
    })
  }
  
  // Pines normales para workers
  const s = STATUS_STYLES[p.status as 'active' | 'intermediate' | 'inactive'] || STATUS_STYLES.inactive
  const avatar = p.avatar || `https://i.pravatar.cc/100?u=${p.id}`
  const name = p.name.split(' ')[0]
  const price = p.status !== 'inactive' ? `$${Math.round(p.price / 1000)}k` : ''
  
  // Si tiene ruta activa con asientos, mostrar información de viaje
  const hasTravelMode = p.active_route?.available_seats && p.active_route.available_seats > 0
  const travelInfo = hasTravelMode ? `👥${p.active_route?.available_seats}` : ''
  
  const label = p.status === 'active' 
    ? hasTravelMode 
      ? `${name} • ${travelInfo}`
      : `${name} • ${price}`
    : p.status === 'intermediate' 
      ? `${name} • consultar`
      : name

  // P0-4: Badge de urgencia
  const urgentBadge = p.urgency === 'urgent' ? `
    <div style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:white;font-size:10px;font-weight:900;padding:2px 6px;border-radius:999px;border:2px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);animation:pulse 1.5s infinite;pointer-events:none">
      🔥
    </div>
  ` : ''

  return L.divIcon({
    className: 'leaflet-marker-icon-worker',
    iconSize: [130, 82],
    iconAnchor: [65, 82],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;opacity:${s.opacity};transition:opacity 0.3s;pointer-events:auto">
        <div style="width:48px;height:48px;border-radius:999px;padding:2.5px;background:white;box-shadow:${s.shadow};position:relative;border:2.5px solid ${s.ring};pointer-events:none">
          <img src="${avatar}" style="width:100%;height:100%;border-radius:999px;object-fit:cover;${s.grayscale};pointer-events:none" />
          <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;background:${s.dot};border:2px solid white;border-radius:999px;${p.status === 'active' ? 'animation:pulse 2s infinite' : ''};pointer-events:none"></div>
          ${urgentBadge}
        </div>
        <div style="background:${s.bg};color:#ffffff;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:900;font-style:italic;margin-top:5px;box-shadow:0 4px 12px rgba(0,0,0,0.15);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;border:2px solid white;letter-spacing:-0.02em;pointer-events:none">
          ${label}
        </div>
      </div>
    `,
  })
}

function MapClickHandler({ onClick }: { onClick: () => void }) {
  const { useMapEvents } = require('react-leaflet')
  useMapEvents({ 
    click: (e: any) => {
      // Solo cerrar si el click NO fue en un marcador
      // Los marcadores tienen la clase 'leaflet-marker-icon'
      const target = e.originalEvent?.target
      if (target && (
        target.closest('.leaflet-marker-icon') || 
        target.closest('.leaflet-marker-icon-demand') ||
        target.closest('.leaflet-marker-icon-worker')
      )) {
        // El click fue en un marcador, no cerrar
        return
      }
      onClick()
    }
  })
  return null
}

// Componente simple para mostrar marcadores sin clustering
function MapMarkers({ points, onPointClick, highlightedId }: { points: MapPoint[]; onPointClick?: (p: MapPoint) => void; highlightedId?: number | null }) {
  return (
    <>
      {points.map((p, idx) => {
        if (!p.pos || typeof p.pos.lat !== 'number' || typeof p.pos.lng !== 'number' || isNaN(p.pos.lat) || isNaN(p.pos.lng)) {
          return null
        }
        const isHighlighted = highlightedId === p.id && p.pin_type === 'demand'
        return (
          <Marker
            key={`${p.pin_type || 'point'}-${p.id}-${idx}-${isHighlighted ? 'hl' : ''}`}
            position={[p.pos.lat, p.pos.lng]}
            icon={createPointIcon(p, isHighlighted)}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={{
              click: (e) => {
                // Prevenir que el evento se propague al mapa
                e.originalEvent.stopPropagation()
                e.originalEvent.stopImmediatePropagation()
                // Prevenir el evento de Leaflet también
                if (e.originalEvent) {
                  e.originalEvent.preventDefault()
                }
                console.log('📍 Pin clickeado:', p.pin_type || 'worker', p.id, p.name)
                onPointClick?.(p)
              },
            }}
            interactive={true}
            bubblingMouseEvents={false}
          />
        )
      })}
    </>
  )
}

function MapMoveHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter()
      onMove(center.lat, center.lng)
    }
  })
  return null
}

// Componente para exponer la instancia del mapa
function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    if (map) {
      console.log('🗺️ MapController: Mapa inicializado, notificando...')
      onMapReady(map)
    }
  }, [map, onMapReady])
  
  return null
}

const MapSection = forwardRef<any, { points: MapPoint[]; onPointClick?: (p: MapPoint) => void | Promise<void>; onMapClick?: () => void; mapCenter?: { lat: number; lng: number; zoom: number } | null; highlightedId?: number | null; onMapMove?: (lat: number, lng: number) => void }>(({ points, onPointClick, onMapClick, mapCenter, highlightedId, onMapMove }, ref) => {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  // Usar ref para acceder siempre al valor más reciente de mapInstance
  const mapInstanceRef = useRef<L.Map | null>(null)
  
  // Mantener el ref sincronizado con el state
  useEffect(() => {
    mapInstanceRef.current = mapInstance
  }, [mapInstance])
  
  useEffect(() => {
    if (mapInstance && mapCenter) {
      console.log('🗺️ Centrando mapa en:', mapCenter)
      mapInstance.flyTo([mapCenter.lat, mapCenter.lng], mapCenter.zoom, { duration: 1.5 })
    }
  }, [mapInstance, mapCenter])
  
  // Callback para cuando el mapa esté listo
  const handleMapReady = useCallback((map: L.Map) => {
    console.log('🗺️ MapSection: Mapa recibido y guardado en estado')
    setMapInstance(map)
    mapInstanceRef.current = map
    ;(window as any).__leafletMap = map
  }, [])
  
  // Función auxiliar para obtener el mapa (siempre busca el más reciente)
  const getMapInstance = useCallback((): L.Map | null => {
    // Primero intentar el ref (valor más reciente)
    if (mapInstanceRef.current) {
      return mapInstanceRef.current
    }
    
    // Si no, buscar en el DOM
    const container = document.querySelector('.leaflet-container') as any
    if (container) {
      const map = container._leaflet || 
                  container.__leaflet_map ||
                  (container._leaflet_id && (window as any).L?.maps?.[container._leaflet_id])
      
      if (map && (typeof map.flyTo === 'function' || typeof map.setView === 'function')) {
        return map
      }
    }
    
    return null
  }, [])
  
  // Exponer el ref - siempre disponible, pero puede que mapInstance aún no esté listo
  useImperativeHandle(ref, () => ({
    flyTo: (latlng: [number, number], zoom: number): Promise<boolean> => {
      console.log('🗺️ MapSection.flyTo llamado:', latlng, zoom)
      
      return new Promise((resolve) => {
        // Función auxiliar para ejecutar flyTo en una instancia de mapa
        const executeFlyTo = (map: L.Map): boolean => {
          try {
            map.invalidateSize()
            if (typeof map.flyTo === 'function') {
              map.flyTo(latlng, zoom, { duration: 1.5 })
              console.log('✅ flyTo ejecutado exitosamente')
              return true
            } else if (typeof map.setView === 'function') {
              map.setView(latlng, zoom, { animate: true, duration: 1.5 })
              console.log('✅ setView ejecutado como fallback')
              return true
            } else {
              console.error('❌ El mapa no tiene métodos flyTo ni setView')
              return false
            }
          } catch (error) {
            console.error('❌ Error ejecutando flyTo/setView:', error)
            return false
          }
        }
        
        // Intentar obtener el mapa inmediatamente
        const map = getMapInstance()
        
        if (map) {
          console.log('✅ Mapa encontrado, ejecutando flyTo')
          resolve(executeFlyTo(map))
          return
        }
        
        // Si no está disponible, esperar a que se inicialice
        console.warn('⚠️ Mapa no encontrado, esperando inicialización...')
        let checkCount = 0
        const maxChecks = 40 // 2 segundos máximo (40 * 50ms)
        
        const checkInterval = setInterval(() => {
          checkCount++
          
          const currentMap = getMapInstance()
          if (currentMap) {
            clearInterval(checkInterval)
            console.log('✅ Mapa encontrado durante espera')
            resolve(executeFlyTo(currentMap))
            return
          }
          
          // Si alcanzamos el máximo de intentos, fallar
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval)
            console.error('❌ Mapa nunca se inicializó después de', maxChecks * 50, 'ms')
            resolve(false)
          }
        }, 50) // Verificar cada 50ms
      })
    },
    // Exponer también el mapInstance directamente para debugging
    getMapInstance: () => mapInstanceRef.current,
    isReady: () => mapInstanceRef.current !== null || getMapInstance() !== null
  }), [getMapInstance])
  
  return (
    <MapContainer
      center={[-37.6672, -72.5730]}
      zoom={15}
      minZoom={10}
      maxZoom={19}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <MapController onMapReady={handleMapReady} />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}
      {onMapMove && <MapMoveHandler onMove={onMapMove} />}
      <MapMarkers points={points} onPointClick={onPointClick} highlightedId={highlightedId} />
    </MapContainer>
  )
})

MapSection.displayName = 'MapSection'

export default MapSection
