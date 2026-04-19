'use client'

import { useCallback, useRef, useState, type MutableRefObject } from 'react'

import { getPublicApiBase } from '@/lib/api'
import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from '@/lib/mapStorage'
import type { MapPoint } from '@/app/components/MapSection'

export interface SearchMeta {
  city: string | null
  radius_searched: string
  total_found: number
  is_fallback: boolean
}

type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

export interface UseNearbyFetchParams {
  user: { id: number } | null
  userLatRef: MutableRefObject<number>
  userLngRef: MutableRefObject<number>
  workerStatus: WorkerStatus
  toast: (title: string, type?: 'success' | 'error' | 'info' | 'warning', body?: string, duration?: number) => void
}

export function useNearbyFetch({
  user,
  userLatRef,
  userLngRef,
  workerStatus,
  toast,
}: UseNearbyFetchParams) {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const hasLoadedOnceRef = useRef(false)
  const fetchNearbyRef = useRef<{
    lastCall: number
    timeoutId: ReturnType<typeof setTimeout> | null
    abortController: AbortController | null
  }>({ lastCall: 0, timeoutId: null, abortController: null })

  const fetchNearby = useCallback(
    (categoryId?: number | null, overrideLat?: number, overrideLng?: number) => {
      const now = Date.now()
      const timeSinceLastCall = now - fetchNearbyRef.current.lastCall
      const throttleMs = 2000

      if (timeSinceLastCall < throttleMs && fetchNearbyRef.current.lastCall !== 0) {
        if (fetchNearbyRef.current.timeoutId) clearTimeout(fetchNearbyRef.current.timeoutId)
        const delay = throttleMs - timeSinceLastCall
        console.log(`⏭️ fetchNearby: throttling ${Math.round(delay)}ms`)
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

      if (fetchNearbyRef.current.abortController) {
        fetchNearbyRef.current.abortController.abort()
      }
      const abortController = new AbortController()
      fetchNearbyRef.current.abortController = abortController

      if (!overrideLat && !hasLoadedOnceRef.current) setLoading(true)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

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
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))),
        fetch(`${getPublicApiBase()}/api/v1/demand/nearby?${params}`, { headers, signal: abortController.signal })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .catch(() => ({ data: [], meta: {} })),
      ])
        .then(([expertsData, demandsData]) => {
          const workers = (expertsData.data ?? []).map((w: any) => ({
            ...w,
            pin_type: (w.pin_type ?? 'worker') as any,
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

          setPoints([...workers, ...demands])
          setMeta(expertsData.meta ?? null)
          hasLoadedOnceRef.current = true
          setLoading(false)
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          console.error('Error fetching experts/demands:', err)
          toast('No se pudieron cargar los expertos. Revisa tu conexión e intenta de nuevo.', 'error')
          hasLoadedOnceRef.current = true
          setLoading(false)
        })
    },
    // userLatRef / userLngRef: refs estables; leer .current dentro del callback
    [user, workerStatus, toast],
  )

  return {
    points,
    setPoints,
    meta,
    loading,
    fetchNearby,
    fetchNearbyRef,
  }
}
