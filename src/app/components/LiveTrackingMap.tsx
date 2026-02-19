'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'

interface LiveTrackingMapProps {
  workerLocation: { lat: number; lng: number } | null
  destinationLocation: { lat: number; lng: number } | null
  routeHistory?: Array<{ lat: number; lng: number; timestamp: number }>
  eta?: number // minutos estimados
  onMapReady?: (map: L.Map) => void
}

// Icono personalizado para worker en movimiento
const workerIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#10b981" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Icono para destino
const destinationIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="#ef4444" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

// Componente interno para actualizar el mapa cuando cambia la ubicación
function MapUpdater({ workerLocation }: { workerLocation: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (workerLocation) {
      map.setView([workerLocation.lat, workerLocation.lng], map.getZoom(), {
        animate: true,
        duration: 1.5,
      })
    }
  }, [workerLocation, map])

  return null
}

export default function LiveTrackingMap({
  workerLocation,
  destinationLocation,
  routeHistory = [],
  eta,
  onMapReady,
}: LiveTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Calcular ruta si hay historial
  const routePolyline = routeHistory.length > 1
    ? routeHistory.map(point => [point.lat, point.lng] as [number, number])
    : workerLocation && destinationLocation
    ? [[workerLocation.lat, workerLocation.lng], [destinationLocation.lat, destinationLocation.lng]]
    : []

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border-2 border-green-500 shadow-lg">
      <MapContainer
        center={workerLocation || [-37.6672, -72.5730]}
        zoom={15}
        minZoom={10}
        maxZoom={19}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map
          onMapReady?.(map)
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater workerLocation={workerLocation} />

        {/* Ruta recorrida (historial) */}
        {routeHistory.length > 1 && (
          <Polyline
            positions={routeHistory.map(p => [p.lat, p.lng] as [number, number])}
            color="#3b82f6"
            weight={4}
            opacity={0.6}
          />
        )}

        {/* Ruta directa (si no hay historial) */}
        {routeHistory.length <= 1 && routePolyline.length === 2 && (
          <Polyline
            positions={routePolyline}
            color="#10b981"
            weight={3}
            opacity={0.5}
            dashArray="10, 10"
          />
        )}

        {/* Marcador del worker */}
        {workerLocation && (
          <Marker
            position={[workerLocation.lat, workerLocation.lng]}
            icon={workerIcon}
          />
        )}

        {/* Marcador del destino */}
        {destinationLocation && (
          <Marker
            position={[destinationLocation.lat, destinationLocation.lng]}
            icon={destinationIcon}
          />
        )}
      </MapContainer>

      {/* Overlay con información */}
      <div className="absolute top-2 left-2 right-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-gray-700">En camino</span>
            </div>
            {eta !== undefined && (
              <span className="font-bold text-green-600">
                Llegada: {Math.round(eta)} min
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
