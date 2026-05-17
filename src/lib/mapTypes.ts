import type { MapPoint } from '@/app/components/MapSection'
import { normalizeExpertMapPointPinTypes } from '@/lib/mapPremiumPin'

export interface GeoPos {
  lat: number
  lng: number
}

/** Fila de `GET /api/v1/experts/nearby` */
export interface ExpertNearby {
  id: number
  user_id?: number | null
  pos: GeoPos
  name: string
  avatar?: string | null
  price?: number
  category_color?: string
  category_slug?: string | null
  category_name?: string | null
  fresh_score?: number
  status?: string
  user_mode?: string | null
  active_route?: unknown
  microcopy?: string
  has_video?: boolean
  is_seller?: boolean
  store_name?: string | null
  public_store_host?: string | null
  pin_type?: string
  store_plan?: string
  store_url?: string | null
  linked_worker_id?: number
}

/** Fila de `GET /api/v1/demand/nearby` */
export interface DemandNearby {
  id: number
  pos: GeoPos
  client_name: string
  client_avatar?: string | null
  offered_price?: number | null
  category_color?: string
  category_slug?: string | null
  category_name?: string | null
  urgency?: string
  travel_role?: string | null
  payload?: Record<string, unknown> | null
  description?: string
  distance_km?: number
}

export function expertNearbyToMapPoint(w: ExpertNearby): MapPoint {
  return {
    ...normalizeExpertMapPointPinTypes(w as Record<string, unknown>),
    active_route: (w.active_route as MapPoint['active_route']) || null,
    user_id: w.user_id ?? null,
  } as MapPoint
}

export function demandNearbyToMapPoint(d: DemandNearby): MapPoint {
  return {
    id: d.id,
    pos: d.pos,
    name: d.client_name,
    avatar: d.client_avatar ?? null,
    price: d.offered_price ?? undefined,
    category_color: d.category_color,
    category_slug: d.category_slug ?? undefined,
    category_name: d.category_name ?? undefined,
    fresh_score: 0,
    status: 'demand',
    pin_type: 'demand',
    urgency: d.urgency,
    travel_role: d.travel_role ?? null,
    payload: d.payload ?? null,
    description: d.description,
    distance_km: d.distance_km,
  }
}
