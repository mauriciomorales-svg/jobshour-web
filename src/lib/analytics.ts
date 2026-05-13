/**
 * Eventos de producto (retención, embudo).
 * Hub Mis ganancias (worker): `worker_earnings_open_from_hub` (perfil),
 * `worker_earnings_hub_open`, `worker_earnings_hub_period`, `worker_earnings_hub_refresh`,
 * `worker_earnings_hub_retry_store`, `worker_earnings_hub_nav_jobs`, `worker_earnings_hub_nav_tienda_stats`.
 * Mapa — tienda premium (handoff web externa): `premium_store_handoff_open`, `premium_store_external_click`,
 * `premium_store_jobshours_tienda_click`.
 * - `window` CustomEvent `jh_analytics` — suscripciones en devtools o extensiones.
 * - Opcional: `NEXT_PUBLIC_ANALYTICS_INGEST` — URL del POST (absoluta o relativa, p. ej. `/api/jh-analytics`).
 *   Body: `{ name, payload, t }`. En servidor: `src/app/api/jh-analytics/route.ts` + opcional `ANALYTICS_FORWARD_URL`.
 * - En desarrollo: `console.debug`.
 */

export type AnalyticsEvent = { name: string; payload: Record<string, unknown>; t: number }
const LOCAL_EVENTS_KEY = 'jh_analytics_events'
const LOCAL_MAX_EVENTS = 1500

export function sendAnalyticsIngest(ev: AnalyticsEvent) {
  const base = process.env.NEXT_PUBLIC_ANALYTICS_INGEST?.trim()
  if (!base || typeof window === 'undefined') return
  const body = JSON.stringify(ev)
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('token')
      : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  /** sendBeacon no permite Authorization; con sesión iniciada usamos fetch para adjuntar user_id en API. */
  if (token) {
    try {
      fetch(base, { method: 'POST', headers, body, keepalive: true }).catch(() => {})
    } catch {
      /* ignore */
    }
    return
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(base, new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    fetch(base, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}

export function trackEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const t = Date.now()
  const p = payload ?? {}
  const ev: AnalyticsEvent = { name, payload: p, t }
  try {
    window.dispatchEvent(new CustomEvent('jh_analytics', { detail: ev }))
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY)
    const list = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
    list.push(ev)
    const trimmed = list.slice(-LOCAL_MAX_EVENTS)
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
  sendAnalyticsIngest(ev)
  if (process.env.NODE_ENV === 'development') {
    console.debug('[jh_analytics]', name, payload)
  }
}

export function getLocalAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e) => e && typeof e.name === 'string' && typeof e.t === 'number')
  } catch {
    return []
  }
}
