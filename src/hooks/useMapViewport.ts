'use client'

import { useCallback, useEffect, useRef, useLayoutEffect, type MutableRefObject, type RefObject } from 'react'
import type { Map as LeafletMap } from 'leaflet'

import { readStoredGpsCoords } from '@/lib/formAssist'
import { LS_MAP_VIEW_LAT, LS_MAP_VIEW_LNG, readInitialMapCoords } from '@/lib/mapStorage'

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permiso de ubicación denegado. Actívalo en el navegador o en ajustes del teléfono.'
    case error.POSITION_UNAVAILABLE:
      return 'No se pudo obtener tu posición. Revisa que el GPS esté activo.'
    case error.TIMEOUT:
      return 'La ubicación tardó demasiado. Intenta de nuevo en un lugar con mejor señal.'
    default:
      return 'No se pudo obtener la ubicación. Activa el GPS y revisa permisos.'
  }
}

export type FetchNearbyFn = (categoryId?: number | null, overrideLat?: number, overrideLng?: number) => void

export type FetchNearbyThrottleRef = MutableRefObject<{
  lastCall: number
  timeoutId: ReturnType<typeof setTimeout> | null
  abortController: AbortController | null
}>

export interface UseMapViewportParams {
  userLatRef: MutableRefObject<number>
  userLngRef: MutableRefObject<number>
  setUserLat: (lat: number) => void
  setUserLng: (lng: number) => void
  activeCategory: number | null
  fetchNearby: FetchNearbyFn
  fetchNearbyRef: FetchNearbyThrottleRef
  toast: (title: string, type?: 'success' | 'error' | 'info' | 'warning', body?: string, duration?: number) => void
  mapRef: RefObject<{
    flyTo: (latlng: [number, number], zoom: number) => Promise<boolean>
    fitToPoints?: (coords: [number, number][]) => Promise<boolean>
  } | null>
  onResolvedLocation?: (lat: number, lng: number) => void
  /** Vista «mapa a pantalla»: sección mapa y pestaña inferior Mapa; no feed/solicitudes/perfil en la barra. */
  mapDiscoveryActive: boolean
}

/**
 * Vista del mapa: persistencia LS, debounce de nearby al mover, GPS, setView inicial.
 * `mapDiscoveryActive` acota nearby/flyTo/pan al tab Mapa + sección mapa.
 */
export function useMapViewport({
  userLatRef,
  userLngRef,
  setUserLat,
  setUserLng,
  activeCategory,
  fetchNearby,
  fetchNearbyRef,
  toast,
  mapRef,
  onResolvedLocation,
  mapDiscoveryActive,
}: UseMapViewportParams) {
  const mapPannedByUserRef = useRef(false)
  const mapViewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapDiscoveryActiveRef = useRef(mapDiscoveryActive)
  const prevMapDiscoveryRef = useRef<boolean | null>(null)

  useLayoutEffect(() => {
    mapDiscoveryActiveRef.current = mapDiscoveryActive
  }, [mapDiscoveryActive])

  const applyLocationToViewport = useCallback(
    (lat: number, lng: number, zoom = 15, opts?: { forceMapUi?: boolean }) => {
      const discovery = opts?.forceMapUi === true || mapDiscoveryActiveRef.current
      try {
        localStorage.setItem('user_lat', String(lat))
        localStorage.setItem('user_lng', String(lng))
        if (discovery) {
          localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
          localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
        }
      } catch {
        /* ignore */
      }
      if (discovery) {
        mapPannedByUserRef.current = true
      }
      userLatRef.current = lat
      userLngRef.current = lng
      setUserLat(lat)
      setUserLng(lng)
      if (discovery) {
        fetchNearbyRef.current.lastCall = 0
        queueMicrotask(() => {
          fetchNearby(activeCategory, lat, lng)
        })
        void mapRef.current?.flyTo([lat, lng], zoom)
      }
      onResolvedLocation?.(lat, lng)
    },
    [activeCategory, fetchNearby, fetchNearbyRef, mapRef, onResolvedLocation, setUserLat, setUserLng, userLatRef, userLngRef],
  )

  const handleMapViewportMove = useCallback(
    (lat: number, lng: number) => {
      if (!mapDiscoveryActiveRef.current) return
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) < 0.01) return
      mapPannedByUserRef.current = true
      try {
        localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
        localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
      } catch {
        /* ignore */
      }
      userLatRef.current = lat
      userLngRef.current = lng
      setUserLat(lat)
      setUserLng(lng)

      if (mapViewportTimerRef.current) clearTimeout(mapViewportTimerRef.current)
      mapViewportTimerRef.current = setTimeout(() => {
        mapViewportTimerRef.current = null
        fetchNearby(activeCategory, lat, lng)
      }, 400)
    },
    [activeCategory, fetchNearby, setUserLat, setUserLng],
  )

  const handleCenterOnMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast('Tu navegador no permite ubicación', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        applyLocationToViewport(lat, lng, 15)
      },
      (err) => {
        const stored = readStoredGpsCoords()
        if (stored) {
          applyLocationToViewport(stored.lat, stored.lng, 14)
          toast('Ubicación aproximada', 'info', 'Usamos tu última posición guardada. Activa el GPS para mayor precisión.')
          return
        }
        toast(geolocationErrorMessage(err), 'error')
      },
      // maximumAge 0: evita caché del navegador (a veces devolvía un punto fijo / zona Renaico).
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }, [toast, applyLocationToViewport])

  const handleLeafletMapReady = useCallback((map: LeafletMap) => {
    // No fijar Angol/Renaico aquí: la vista inicial la define fitToPoints al cargar workers.
    requestAnimationFrame(() => map.invalidateSize())
  }, [])

  // Sincroniza estado + primera carga nearby con las mismas coords que guardamos en LS (no uses solo userLat del primer render).
  useEffect(() => {
    let cancelled = false
    const v = readInitialMapCoords()
    userLatRef.current = v.lat
    userLngRef.current = v.lng
    setUserLat(v.lat)
    setUserLng(v.lng)
    fetchNearbyRef.current.lastCall = 0
    queueMicrotask(() => {
      if (!cancelled && mapDiscoveryActiveRef.current) fetchNearby(null, v.lat, v.lng)
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          // Solo perfil / nearby en background; el mapa se centra en workers o con el FAB «Mi ubicación».
          try {
            localStorage.setItem('user_lat', String(lat))
            localStorage.setItem('user_lng', String(lng))
          } catch {
            /* ignore */
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      )
    }

    const onExternalLocationSet = (event: Event) => {
      const custom = event as CustomEvent<{ lat?: number; lng?: number }>
      const lat = custom.detail?.lat
      const lng = custom.detail?.lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      applyLocationToViewport(Number(lat), Number(lng), 15, { forceMapUi: true })
    }
    window.addEventListener('jh:location-selected', onExternalLocationSet as EventListener)

    return () => {
      cancelled = true
      window.removeEventListener('jh:location-selected', onExternalLocationSet as EventListener)
      if (mapViewportTimerRef.current) {
        clearTimeout(mapViewportTimerRef.current)
        mapViewportTimerRef.current = null
      }
    }
  }, [applyLocationToViewport, fetchNearby, fetchNearbyRef, setUserLat, setUserLng, userLatRef, userLngRef])

  /** Al volver a la sección mapa: refrescar nearby con el último centro conocido. */
  useEffect(() => {
    const prev = prevMapDiscoveryRef.current
    prevMapDiscoveryRef.current = mapDiscoveryActive
    if (!mapDiscoveryActive || prev !== false) return
    fetchNearbyRef.current.lastCall = 0
    queueMicrotask(() => {
      fetchNearby(activeCategory, userLatRef.current, userLngRef.current)
    })
  }, [mapDiscoveryActive, activeCategory, fetchNearby, fetchNearbyRef, userLatRef, userLngRef])

  return {
    handleMapViewportMove,
    handleCenterOnMyLocation,
    handleLeafletMapReady,
  }
}
