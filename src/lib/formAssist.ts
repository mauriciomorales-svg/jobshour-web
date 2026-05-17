/**
 * Sugerencias y borradores locales para formularios de solicitud/demanda.
 * No guarda datos sensibles (tokens, teléfonos completos).
 */

export type DemandTypeKey = 'fixed_job' | 'ride_share' | 'express_errand'

export interface RecentLocation {
  label: string
  lat?: number
  lng?: number
  usedAt: string
}

export interface LastPublishDemandDraft {
  demandType: DemandTypeKey
  categoryId?: number | null
  description?: string
  offeredPrice?: string
  urgency?: 'low' | 'medium' | 'high'
  ttlMinutes?: number
  pickupAddress?: string
  deliveryAddress?: string
  pickupLat?: number
  pickupLng?: number
  departureTime?: string
  seats?: number
  destinationName?: string
  storeName?: string
  itemsCount?: string
  loadType?: 'light' | 'medium' | 'heavy'
  requiresVehicle?: boolean
  scheduledAt?: string
  workersNeeded?: number
  recurrence?: 'once' | 'daily' | 'weekly' | 'custom'
  savedAt: string
}

export interface LastDirectRequestDraft {
  requestType: DemandTypeKey
  description?: string
  urgency?: 'normal' | 'urgent'
  pickupAddress?: string
  rideDeliveryAddress?: string
  departureTime?: string
  seats?: number
  storeName?: string
  deliveryAddress?: string
  itemsCount?: string
  loadType?: 'light' | 'medium' | 'heavy'
  requiresVehicle?: boolean
  savedAt: string
}

const LS_RECENT_LOCATIONS = 'jh_recent_locations_v1'
const LS_LAST_PUBLISH = 'jh_last_publish_demand_v1'
const LS_LAST_DIRECT = 'jh_last_direct_request_v1'
const MAX_RECENT_LOCATIONS = 8

function getUserScope(): string {
  if (typeof window === 'undefined') return 'guest'
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return 'guest'
    const u = JSON.parse(raw) as { id?: number | string }
    if (u?.id != null) return String(u.id)
  } catch {
    /* ignore */
  }
  return 'guest'
}

function scopedKey(base: string): string {
  return `${base}_${getUserScope()}`
}

/** datetime-local: próximos 30 min, redondeado a 5 min. */
export function suggestNextDepartureLocal(offsetMinutes = 30): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000)
  const mins = d.getMinutes()
  const rounded = Math.ceil(mins / 5) * 5
  if (rounded >= 60) {
    d.setHours(d.getHours() + 1)
    d.setMinutes(rounded - 60)
  } else {
    d.setMinutes(rounded)
  }
  d.setSeconds(0, 0)
  return toDatetimeLocalValue(d)
}

/** Programación: próxima hora en punto. */
export function suggestScheduledLocal(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toDatetimeLocalValue(d)
}

export function toDatetimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function readStoredGpsCoords(): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const lat = parseFloat(localStorage.getItem('user_lat') ?? '')
    const lng = parseFloat(localStorage.getItem('user_lng') ?? '')
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (Math.abs(lat) < 0.01 || Math.abs(lat) > 90) return null
    return { lat, lng }
  } catch {
    return null
  }
}

export function recordRecentLocation(label: string, lat?: number, lng?: number): void {
  const trimmed = label.trim()
  if (trimmed.length < 3) return
  if (typeof window === 'undefined') return
  try {
    const key = scopedKey(LS_RECENT_LOCATIONS)
    const raw = localStorage.getItem(key)
    const list: RecentLocation[] = raw ? JSON.parse(raw) : []
    const normalized = trimmed.slice(0, 200)
    const next: RecentLocation[] = [
      {
        label: normalized,
        lat: typeof lat === 'number' && Number.isFinite(lat) ? lat : undefined,
        lng: typeof lng === 'number' && Number.isFinite(lng) ? lng : undefined,
        usedAt: new Date().toISOString(),
      },
      ...list.filter((x) => x.label.toLowerCase() !== normalized.toLowerCase()),
    ].slice(0, MAX_RECENT_LOCATIONS)
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function getRecentLocations(limit = 5): RecentLocation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(scopedKey(LS_RECENT_LOCATIONS))
    const list: RecentLocation[] = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.slice(0, limit)
  } catch {
    return []
  }
}

export function saveLastPublishDemand(draft: Omit<LastPublishDemandDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const payload: LastPublishDemandDraft = { ...draft, savedAt: new Date().toISOString() }
    localStorage.setItem(scopedKey(LS_LAST_PUBLISH), JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadLastPublishDemand(): LastPublishDemandDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(scopedKey(LS_LAST_PUBLISH))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastPublishDemandDraft
    if (!parsed?.demandType || !parsed.savedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function hasLastPublishDemand(): boolean {
  return loadLastPublishDemand() != null
}

export function saveLastDirectRequest(draft: Omit<LastDirectRequestDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const payload: LastDirectRequestDraft = { ...draft, savedAt: new Date().toISOString() }
    localStorage.setItem(scopedKey(LS_LAST_DIRECT), JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function loadLastDirectRequest(): LastDirectRequestDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(scopedKey(LS_LAST_DIRECT))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastDirectRequestDraft
    if (!parsed?.requestType || !parsed.savedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function hasLastDirectRequest(): boolean {
  return loadLastDirectRequest() != null
}

/** Etiqueta corta para chip de ubicación reciente. */
export function formatRecentLocationChip(label: string, max = 28): string {
  const t = label.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
