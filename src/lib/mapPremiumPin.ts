import type { MapPoint } from '@/app/components/MapSection'

function isHttpUrl(u: string | null | undefined): boolean {
  if (!u || typeof u !== 'string') return false
  const t = u.trim().toLowerCase()
  return t.startsWith('http://') || t.startsWith('https://')
}

/** Pin morado del mapa (web externa + opcional tienda JobsHours). */
export function isPremiumStoreMapPoint(p: MapPoint): boolean {
  const anyP = p as MapPoint & { pinType?: string }
  if (p.pin_type === 'premium_store' || anyP.pinType === 'premium_store') return true
  if (p.store_plan === 'premium' && isHttpUrl(p.store_url ?? undefined)) return true
  const id = Number(p.id)
  if (Number.isFinite(id) && id >= 900_000 && id < 1_000_000 && isHttpUrl(p.store_url ?? undefined)) return true
  return false
}

/**
 * Asegura `pin_type` en cada experto del nearby (defensa ante proxies / camelCase / campos parciales).
 * No usar para filas de demanda: esas vienen de otro endpoint con `pin_type: 'demand'`.
 */
export function normalizeExpertMapPointPinTypes<T extends Record<string, unknown>>(w: T): T & { pin_type: MapPoint['pin_type'] } {
  const raw = (w.pin_type as string | undefined) || (w as { pinType?: string }).pinType
  const storePlan = w.store_plan as string | undefined
  const storeUrl = w.store_url as string | null | undefined
  const id = Number(w.id)

  if (raw === 'premium_store') {
    return { ...w, pin_type: 'premium_store' }
  }
  if (storePlan === 'premium' && isHttpUrl(storeUrl)) {
    return { ...w, pin_type: 'premium_store' }
  }
  if (Number.isFinite(id) && id >= 900_000 && id < 1_000_000 && isHttpUrl(storeUrl)) {
    return { ...w, pin_type: 'premium_store' }
  }
  return { ...w, pin_type: 'worker' }
}
