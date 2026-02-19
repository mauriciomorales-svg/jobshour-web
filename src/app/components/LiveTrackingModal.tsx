'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useLocationTracking } from '@/hooks/useLocationTracking'
import TrackingStatusCard from './TrackingStatusCard'

const LiveTrackingMap = dynamic(() => import('./LiveTrackingMap'), { ssr: false })

interface LiveTrackingModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: number
  workerName: string
  workerAvatar: string | null
  clientName?: string
  clientAvatar?: string | null
  destinationAddress?: string
  destinationLat?: number
  destinationLng?: number
  isWorker?: boolean // Si es true, el usuario actual es el worker (debe enviar ubicación)
}

export default function LiveTrackingModal({
  isOpen,
  onClose,
  requestId,
  workerName,
  workerAvatar,
  clientName,
  clientAvatar,
  destinationAddress,
  destinationLat,
  destinationLng,
  isWorker = false,
}: LiveTrackingModalProps) {
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeHistory, setRouteHistory] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([])
  const [eta, setEta] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isTrackingActive, setIsTrackingActive] = useState(false)

  // Hook de tracking para workers (envía ubicación)
  const { location: currentLocation, isTracking, error: trackingError } = useLocationTracking({
    enabled: isOpen && isWorker,
    requestId: isOpen ? requestId : undefined,
    interval: 10000, // 10 segundos
    onLocationUpdate: (loc) => {
      setWorkerLocation({ lat: loc.lat, lng: loc.lng })
      setRouteHistory(prev => [...prev, { lat: loc.lat, lng: loc.lng, timestamp: loc.timestamp }])
    },
    onError: (err) => {
      console.error('Error en tracking:', err)
    },
  })

  // Para clientes: WebSocket + polling fallback para obtener ubicación del worker
  useEffect(() => {
    if (!isOpen || isWorker) return

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return

    let echo: any = null
    let interval: NodeJS.Timeout | null = null

    // Intentar usar WebSocket primero
    import('@/lib/echo').then(({ getEcho }) => {
      try {
        echo = getEcho()
        if (echo) {
          const channel = echo.private(`request.${requestId}`)
          
          channel
            .listen('.location.updated', (data: any) => {
              if (data.location) {
                const newLocation = {
                  lat: data.location.lat,
                  lng: data.location.lng,
                }
                setWorkerLocation(newLocation)
                setIsTrackingActive(true)

                // Agregar al historial si cambió significativamente (>50m)
                setRouteHistory(prev => {
                  if (prev.length === 0) {
                    return [{ ...newLocation, timestamp: Date.now() }]
                  }
                  const last = prev[prev.length - 1]
                  const dist = calculateDistance(last.lat, last.lng, newLocation.lat, newLocation.lng)
                  if (dist > 0.05) { // >50 metros
                    return [...prev, { ...newLocation, timestamp: Date.now() }]
                  }
                  return prev
                })

                // Calcular distancia y ETA si hay destino
                if (destinationLat && destinationLng) {
                  const dist = calculateDistance(
                    newLocation.lat,
                    newLocation.lng,
                    destinationLat,
                    destinationLng
                  )
              setDistance(dist)
              
              // Calcular ETA mejorado (con Google Maps si está disponible)
              import('@/lib/googleMapsETA').then(({ calculateETA }) => {
                calculateETA(newLocation.lat, newLocation.lng, destinationLat, destinationLng)
                  .then(result => {
                    setEta(result.duration)
                    setDistance(result.distance)
                  })
                  .catch(() => {
                    // Fallback a cálculo simple
                    setEta(Math.round(dist * 2))
                  })
              }).catch(() => {
                // Fallback si no se puede importar
                setEta(Math.round(dist * 2))
              })
                }
              }
            })
            .error((err: any) => {
              console.warn('WebSocket error, falling back to polling:', err)
            })
        }
      } catch (err) {
        console.warn('Error setting up WebSocket, using polling:', err)
      }
    })

    // Polling como fallback (cada 5 segundos)
    const fetchWorkerLocation = async () => {
      try {
        const response = await fetch(`https://jobshour.dondemorales.cl/api/v1/requests/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.data?.last_known_lat && data.data?.last_known_lng) {
            const newLocation = {
              lat: data.data.last_known_lat,
              lng: data.data.last_known_lng,
            }
            setWorkerLocation(newLocation)
            setIsTrackingActive(true)

            // Agregar al historial si cambió significativamente (>50m)
            setRouteHistory(prev => {
              if (prev.length === 0) {
                return [{ ...newLocation, timestamp: Date.now() }]
              }
              const last = prev[prev.length - 1]
              const dist = calculateDistance(last.lat, last.lng, newLocation.lat, newLocation.lng)
              if (dist > 0.05) { // >50 metros
                return [...prev, { ...newLocation, timestamp: Date.now() }]
              }
              return prev
            })

            // Calcular distancia y ETA si hay destino
            if (destinationLat && destinationLng) {
              const dist = calculateDistance(
                newLocation.lat,
                newLocation.lng,
                destinationLat,
                destinationLng
              )
              setDistance(dist)
              
              // Calcular ETA mejorado (con Google Maps si está disponible)
              import('@/lib/googleMapsETA').then(({ calculateETA }) => {
                calculateETA(newLocation.lat, newLocation.lng, destinationLat, destinationLng)
                  .then(result => {
                    setEta(result.duration)
                    setDistance(result.distance)
                  })
                  .catch(() => {
                    // Fallback a cálculo simple
                    setEta(Math.round(dist * 2))
                  })
              }).catch(() => {
                // Fallback si no se puede importar
                setEta(Math.round(dist * 2))
              })
            }
          } else {
            setIsTrackingActive(false)
          }
        }
      } catch (err) {
        console.error('Error obteniendo ubicación del worker:', err)
        setIsTrackingActive(false)
      }
    }

    // Obtener ubicación inicial inmediatamente
    fetchWorkerLocation()
    
    // Polling cada 5 segundos como fallback
    interval = setInterval(fetchWorkerLocation, 5000)

    return () => {
      if (interval) clearInterval(interval)
      if (echo) {
        try {
          echo.leave(`request.${requestId}`)
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen, isWorker, requestId, destinationLat, destinationLng])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95%] max-w-4xl mx-4 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={workerAvatar || `https://i.pravatar.cc/60?u=${workerName}`}
                  alt={workerName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
                />
                {isTrackingActive && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                )}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Tracking en Tiempo Real</h3>
                <p className="text-white/90 text-sm">{workerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mapa */}
          <div className="h-96 rounded-xl overflow-hidden border-2 border-green-500">
            <LiveTrackingMap
              workerLocation={workerLocation}
              destinationLocation={destinationLat && destinationLng ? { lat: destinationLat, lng: destinationLng } : null}
              routeHistory={routeHistory}
              eta={eta || undefined}
            />
          </div>

          {/* Status Card */}
          <TrackingStatusCard
            requestId={requestId}
            workerName={workerName}
            workerAvatar={workerAvatar}
            destinationAddress={destinationAddress}
            onClose={undefined}
          />

          {/* Mensaje para workers */}
          {isWorker && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📍</div>
                <div>
                  <p className="font-bold text-blue-900 text-sm mb-1">Compartiendo tu ubicación</p>
                  <p className="text-xs text-blue-700">
                    {isTracking
                      ? 'Tu ubicación se está compartiendo automáticamente con el cliente.'
                      : trackingError
                      ? `Error: ${trackingError}`
                      : 'Iniciando seguimiento...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje para clientes */}
          {!isWorker && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">👀</div>
                <div>
                  <p className="font-bold text-green-900 text-sm mb-1">Siguiendo a {workerName}</p>
                  <p className="text-xs text-green-700">
                    {isTrackingActive
                      ? 'La ubicación se actualiza automáticamente cada 5 segundos.'
                      : 'Esperando actualización de ubicación...'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
          >
            Cerrar Tracking
          </button>
        </div>
      </div>
    </div>
  )
}
