import { useEffect, useRef, useState } from 'react'

interface Location {
  lat: number
  lng: number
  accuracy: number | null
  timestamp: number
}

interface UseLocationTrackingOptions {
  enabled: boolean
  requestId?: number
  interval?: number // milisegundos entre updates
  onLocationUpdate?: (location: Location) => void
  onError?: (error: GeolocationPositionError) => void
}

export function useLocationTracking({
  enabled,
  requestId,
  interval = 10000, // 10 segundos por defecto
  onLocationUpdate,
  onError,
}: UseLocationTrackingOptions) {
  const [location, setLocation] = useState<Location | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled || !requestId) {
      // Limpiar tracking si se desactiva
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsTracking(false)
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador')
      return
    }

    setIsTracking(true)
    setError(null)

    // Función para enviar ubicación al backend
    const sendLocationUpdate = async (coords: GeolocationCoordinates) => {
      const now = Date.now()
      // Evitar enviar demasiado frecuentemente (mínimo cada 8 segundos)
      if (now - lastSentRef.current < 8000) {
        return
      }

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        console.warn('No hay token para enviar ubicación')
        return
      }

      try {
        const response = await fetch(`https://jobshour.dondemorales.cl/api/v1/requests/${requestId}/activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: coords.latitude,
            lng: coords.longitude,
          }),
        })

        if (response.ok) {
          lastSentRef.current = now
          const newLocation: Location = {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: now,
          }
          setLocation(newLocation)
          onLocationUpdate?.(newLocation)
        } else {
          const data = await response.json()
          console.warn('Error enviando ubicación:', data.message)
        }
      } catch (err) {
        console.error('Error en sendLocationUpdate:', err)
      }
    }

    // Obtener ubicación inicial
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocationUpdate(position.coords)
      },
      (err) => {
        setError(`Error obteniendo ubicación: ${err.message}`)
        onError?.(err)
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    )

    // Configurar watchPosition para actualizaciones continuas
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocationUpdate(position.coords)
      },
      (err) => {
        setError(`Error en tracking: ${err.message}`)
        onError?.(err)
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    )

    // También enviar periódicamente como backup (cada intervalo)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocationUpdate(position.coords)
        },
        (err) => {
          console.warn('Error en intervalo de tracking:', err)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 5000,
        }
      )
    }, interval)

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsTracking(false)
    }
  }, [enabled, requestId, interval, onLocationUpdate, onError])

  return {
    location,
    isTracking,
    error,
  }
}
