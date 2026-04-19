'use client'

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import type { Map as LeafletMap } from 'leaflet'

import { LS_MAP_VIEW_LAT, LS_MAP_VIEW_LNG, readInitialMapCoords } from '@/lib/mapStorage'

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
  mapRef: RefObject<{ flyTo: (latlng: [number, number], zoom: number) => Promise<boolean> } | null>
}

/**
 * Vista del mapa: persistencia LS, debounce de nearby al mover, GPS de perfil, setView inicial.
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
}: UseMapViewportParams) {
  const mapPannedByUserRef = useRef(false)
  const mapViewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMapViewportMove = useCallback(
    (lat: number, lng: number) => {
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
        try {
          localStorage.setItem('user_lat', String(lat))
          localStorage.setItem('user_lng', String(lng))
        } catch {
          /* ignore */
        }
        void mapRef.current?.flyTo([lat, lng], 15)
      },
      () => {
        toast('No se pudo obtener la ubicación. Activa el GPS y revisa permisos.', 'error')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    )
  }, [toast, mapRef])

  const handleLeafletMapReady = useCallback((map: LeafletMap) => {
    const v = readInitialMapCoords()
    console.log('[map] vista inicial', v.lat.toFixed(4), v.lng.toFixed(4))
    map.setView([v.lat, v.lng], 15, { animate: false })
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
      if (!cancelled) fetchNearby(null, v.lat, v.lng)
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem('user_lat', String(pos.coords.latitude))
            localStorage.setItem('user_lng', String(pos.coords.longitude))
          } catch {
            /* ignore */
          }
        },
        () => {},
        { timeout: 12000, maximumAge: 600_000 },
      )
    }

    return () => {
      cancelled = true
      if (mapViewportTimerRef.current) {
        clearTimeout(mapViewportTimerRef.current)
        mapViewportTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje: una sola carga inicial / restauración
  }, [])

  return {
    handleMapViewportMove,
    handleCenterOnMyLocation,
    handleLeafletMapReady,
  }
}
