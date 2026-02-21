'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface TrackingStatusCardProps {
  requestId: number
  workerName: string
  workerAvatar: string | null
  destinationAddress?: string
  onClose?: () => void
}

export default function TrackingStatusCard({
  requestId,
  workerName,
  workerAvatar,
  destinationAddress,
  onClose,
}: TrackingStatusCardProps) {
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [eta, setEta] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isTracking, setIsTracking] = useState(false)

  useEffect(() => {
    // Escuchar actualizaciones de ubicación via WebSocket o polling
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return

    // Polling cada 5 segundos para obtener ubicación actualizada
    const interval = setInterval(async () => {
      try {
        const response = await apiFetch(`/api/v1/requests/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.data?.last_known_lat && data.data?.last_known_lng) {
            setWorkerLocation({
              lat: data.data.last_known_lat,
              lng: data.data.last_known_lng,
            })
            setIsTracking(true)

            // Calcular distancia y ETA si hay destino
            if (data.data?.delivery_lat && data.data?.delivery_lng) {
              const dist = calculateDistance(
                data.data.last_known_lat,
                data.data.last_known_lng,
                data.data.delivery_lat,
                data.data.delivery_lng
              )
              setDistance(dist)
              // ETA aproximado: distancia en km * 2 minutos por km (velocidad promedio 30 km/h)
              setEta(Math.round(dist * 2))
            }
          }
        }
      } catch (err) {
        console.error('Error obteniendo ubicación:', err)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [requestId])

  // Función para calcular distancia en km
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-4 border-2 border-green-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={workerAvatar || `https://i.pravatar.cc/60?u=${workerName}`}
              alt={workerName}
              className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
            />
            {isTracking && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">{workerName}</p>
            <p className="text-xs text-gray-500">
              {isTracking ? '📍 En camino' : '⏳ Esperando ubicación...'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Información de tracking */}
      {workerLocation && (
        <div className="space-y-2">
          {destinationAddress && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>🎯</span>
              <span className="truncate">{destinationAddress}</span>
            </div>
          )}

          {distance !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span className="text-sm font-semibold text-gray-700">
                  {distance.toFixed(2)} km
                </span>
              </div>
              {eta !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <span className="text-sm font-bold text-green-600">
                    {eta} min
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Barra de progreso visual */}
          {distance !== null && distance > 0 && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-1000"
                style={{
                  width: `${Math.min(100, Math.max(0, (1 - distance / 10) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {!workerLocation && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin text-green-500 text-2xl mb-2">📍</div>
          <p className="text-xs text-gray-500">Esperando actualización de ubicación...</p>
        </div>
      )}
    </div>
  )
}
