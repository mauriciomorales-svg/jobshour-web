'use client'

import { useEffect, useState } from 'react'
import { getPublicApiBase } from '@/lib/api'

export interface ZoneInfo {
  enabled: boolean
  center_lat: number
  center_lng: number
  radius_km: number
  zone_name: string
}

let _cache: ZoneInfo | null = null

export function useZoneInfo() {
  const [zone, setZone] = useState<ZoneInfo | null>(_cache)

  useEffect(() => {
    if (_cache) return
    fetch(`${getPublicApiBase()}/api/v1/zone-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ZoneInfo | null) => {
        if (data) {
          _cache = data
          setZone(data)
        }
      })
      .catch(() => {})
  }, [])

  return zone
}
