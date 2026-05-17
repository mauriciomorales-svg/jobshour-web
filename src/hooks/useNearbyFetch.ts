'use client'

import { useCallback, useRef, useState, type MutableRefObject } from 'react'

import { getPublicApiBase } from '@/lib/api'
import { normalizeExpertMapPointPinTypes } from '@/lib/mapPremiumPin'
import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from '@/lib/mapStorage'
import type { MapPoint } from '@/app/components/MapSection'

export interface SearchMeta {
  city: string | null
  radius_searched: string
  total_found: number
  is_fallback: boolean
  outside_zone?: boolean
  zone_name?: string
}

export type NearbyFetchError = 'none' | 'network' | 'server' | 'timeout'

type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

export interface UseNearbyFetchParams {
  user: { id: number } | null
  userLatRef: MutableRefObject<number>
  userLngRef: MutableRefObject<number>
  workerStatus: WorkerStatus
  toast: (title: string, type?: 'success' | 'error' | 'info' | 'warning', body?: string, duration?: number) => void
  /** Tras la primera respuesta exitosa con pines (misma secuencia de fetch). */
  onNearbyResults?: (points: MapPoint[]) => void
}

export function useNearbyFetch({
  user,
  userLatRef,
  userLngRef,
  workerStatus,
  toast,
  onNearbyResults,
}: UseNearbyFetchParams) {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [outsideZone, setOutsideZone] = useState(false)
  const [fetchError, setFetchError] = useState<NearbyFetchError>('none')
  const hasLoadedOnceRef = useRef(false)
  const fetchSeqRef = useRef(0)
  const abortedByTimeoutRef = useRef(false)
  const fetchNearbyRef = useRef<{
    lastCall: number
    timeoutId: ReturnType<typeof setTimeout> | null
    abortController: AbortController | null
    networkTimeoutId: ReturnType<typeof setTimeout> | null
  }>({ lastCall: 0, timeoutId: null, abortController: null, networkTimeoutId: null })

  const fetchNearby = useCallback(
    (categoryId?: number | null, overrideLat?: number, overrideLng?: number) => {
      const now = Date.now()
      const timeSinceLastCall = now - fetchNearbyRef.current.lastCall
      const throttleMs = 1200

      if (timeSinceLastCall < throttleMs && fetchNearbyRef.current.lastCall !== 0) {
        if (fetchNearbyRef.current.timeoutId) clearTimeout(fetchNearbyRef.current.timeoutId)
        const delay = throttleMs - timeSinceLastCall
        fetchNearbyRef.current.timeoutId = setTimeout(() => {
          fetchNearbyRef.current.timeoutId = null
          fetchNearbyRef.current.lastCall = 0
          fetchNearby(categoryId, overrideLat, overrideLng)
        }, delay)
        return
      }

      if (fetchNearbyRef.current.timeoutId) {
        clearTimeout(fetchNearbyRef.current.timeoutId)
        fetchNearbyRef.current.timeoutId = null
      }

      fetchNearbyRef.current.lastCall = now
      abortedByTimeoutRef.current = false

      if (fetchNearbyRef.current.networkTimeoutId) {
        clearTimeout(fetchNearbyRef.current.networkTimeoutId)
        fetchNearbyRef.current.networkTimeoutId = null
      }
      if (fetchNearbyRef.current.abortController) {
        fetchNearbyRef.current.abortController.abort()
      }
      const abortController = new AbortController()
      fetchNearbyRef.current.abortController = abortController

      const seq = ++fetchSeqRef.current
      const NETWORK_MS = 30_000
      const myNetworkTimeoutId = setTimeout(() => {
        if (fetchNearbyRef.current.networkTimeoutId === myNetworkTimeoutId) {
          fetchNearbyRef.current.networkTimeoutId = null
        }
        abortedByTimeoutRef.current = true
        abortController.abort()
      }, NETWORK_MS)
      fetchNearbyRef.current.networkTimeoutId = myNetworkTimeoutId

      if (!overrideLat && !hasLoadedOnceRef.current) setLoading(true)
      setFetchError('none')

      let token: string | null = null
      try {
        token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      } catch {
        token = null
      }

      const lat = overrideLat ?? userLatRef.current ?? DEFAULT_MAP_LAT
      const lng = overrideLng ?? userLngRef.current ?? DEFAULT_MAP_LNG

      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '50',
      })
      if (categoryId) params.append('categories[]', String(categoryId))

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      Promise.all([
        fetch(`${getPublicApiBase()}/api/v1/experts/nearby?${params}`, { headers, signal: abortController.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`experts HTTP ${r.status}`)))),
        fetch(`${getPublicApiBase()}/api/v1/demand/nearby?${params}`, { headers, signal: abortController.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`demands HTTP ${r.status}`))))
          .catch((demandErr) => {
            console.warn('demand/nearby falló:', demandErr)
            toast('No se pudieron cargar las demandas en el mapa.', 'warning')
            return { data: [], meta: {} }
          }),
      ])
        .then(([expertsData, demandsData]) => {
          if (expertsData?.meta?.outside_zone) {
            setOutsideZone(true)
            setPoints([])
            const z = expertsData.meta?.zone
            setMeta({
              city: expertsData.meta?.city ?? null,
              radius_searched: String(expertsData.meta?.radius_searched ?? '0'),
              total_found: expertsData.meta?.total_found ?? 0,
              is_fallback: expertsData.meta?.is_fallback ?? false,
              outside_zone: true,
              zone_name: typeof z?.zone_name === 'string' ? z.zone_name : undefined,
            })
            hasLoadedOnceRef.current = true
            return
          }
          setOutsideZone(false)

          const workers = (expertsData.data ?? []).map((w: any) => ({
            ...normalizeExpertMapPointPinTypes(w),
            active_route: w.active_route || null,
            user_id: w.user_id || null,
          }))

          const demands = (demandsData.data ?? []).map((d: any) => ({
            id: d.id,
            pos: d.pos,
            name: d.client_name,
            avatar: d.client_avatar,
            price: d.offered_price,
            category_color: d.category_color,
            category_slug: d.category_slug,
            category_name: d.category_name,
            fresh_score: 0,
            status: 'demand' as const,
            pin_type: 'demand' as const,
            urgency: d.urgency,
            travel_role: d.travel_role ?? null,
            payload: d.payload ?? null,
            description: d.description,
            distance_km: d.distance_km,
          }))

          if (user && workers.length > 0) {
            const userInResults = workers.find((w: any) => {
              return (w.user_id && w.user_id === user.id) || (w.id && w.id === user.id)
            })
            if (!userInResults && workerStatus !== 'inactive') {
              console.warn('⚠️ Usuario no visible en mapa. Estado:', workerStatus)
            }
          }

          const allPoints: MapPoint[] = [...workers, ...demands]
          if (seq !== fetchSeqRef.current) return
          setPoints(allPoints)
          setMeta(expertsData.meta ?? null)
          hasLoadedOnceRef.current = true
          onNearbyResults?.(allPoints)
        })
        .catch((err) => {
          if (err?.name === 'AbortError') {
            if (abortedByTimeoutRef.current && seq === fetchSeqRef.current) {
              setFetchError('timeout')
            }
            return
          }
          console.error('Error fetching experts/demands:', err)
          const msg = String(err?.message ?? err)
          if (msg.includes('HTTP 5')) {
            setFetchError('server')
          } else {
            setFetchError('network')
          }
          hasLoadedOnceRef.current = true
        })
        .finally(() => {
          clearTimeout(myNetworkTimeoutId)
          if (fetchNearbyRef.current.networkTimeoutId === myNetworkTimeoutId) {
            fetchNearbyRef.current.networkTimeoutId = null
          }
          if (seq !== fetchSeqRef.current) return
          setLoading(false)
        })
    },
    [user, workerStatus, toast, onNearbyResults, userLatRef, userLngRef],
  )

  const retryFetch = useCallback(
    (categoryId?: number | null) => {
      fetchNearbyRef.current.lastCall = 0
      fetchNearby(categoryId, userLatRef.current, userLngRef.current)
    },
    [fetchNearby, fetchNearbyRef, userLatRef, userLngRef],
  )

  return {
    points,
    setPoints,
    meta,
    loading,
    outsideZone,
    fetchError,
    fetchNearby,
    fetchNearbyRef,
    retryFetch,
  }
}
