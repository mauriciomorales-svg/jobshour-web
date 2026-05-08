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
  onResolvedLocation?: (lat: number, lng: number) => void
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
  onResolvedLocation,
}: UseMapViewportParams) {
  const mapPannedByUserRef = useRef(false)
  const mapViewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const applyLocationToViewport = useCallback(
    (lat: number, lng: number, zoom = 15) => {
      try {
        localStorage.setItem('user_lat', String(lat))
        localStorage.setItem('user_lng', String(lng))
        localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
        localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
      } catch {
        /* ignore */
      }
      mapPannedByUserRef.current = true
      userLatRef.current = lat
      userLngRef.current = lng
      setUserLat(lat)
      setUserLng(lng)
      fetchNearbyRef.current.lastCall = 0
      queueMicrotask(() => {
        fetchNearby(activeCategory, lat, lng)
      })
      void mapRef.current?.flyTo([lat, lng], zoom)
      onResolvedLocation?.(lat, lng)
    },
    [activeCategory, fetchNearby, fetchNearbyRef, mapRef, onResolvedLocation, setUserLat, setUserLng, userLatRef, userLngRef],
  )

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
        applyLocationToViewport(lat, lng, 15)
      },
      () => {
        toast('No se pudo obtener la ubicación. Activa el GPS y revisa permisos.', 'error')
      },
      // maximumAge 0: evita caché del navegador (a veces devolvía un punto fijo / zona Renaico).
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }, [toast, applyLocationToViewport])

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
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          // Si el usuario no ha movido manualmente el mapa, usamos GPS real para evitar quedar pegados al fallback.
          if (!mapPannedByUserRef.current) {
            applyLocationToViewport(lat, lng, 15)
            return
          }
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
      applyLocationToViewport(Number(lat), Number(lng), 15)
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

  return {
    handleMapViewportMove,
    handleCenterOnMyLocation,
    handleLeafletMapReady,
  }
}
