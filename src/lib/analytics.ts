/**
 * Eventos de producto (retención, embudo).
 * - `window` CustomEvent `jh_analytics` — suscripciones en devtools o extensiones.
 * - Opcional: `NEXT_PUBLIC_ANALYTICS_INGEST` — URL del POST (absoluta o relativa, p. ej. `/api/jh-analytics`).
 *   Body: `{ name, payload, t }`. En servidor: `src/app/api/jh-analytics/route.ts` + opcional `ANALYTICS_FORWARD_URL`.
 * - En desarrollo: `console.debug`.
 */

export type AnalyticsEvent = { name: string; payload: Record<string, unknown>; t: number }

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
  try {
    window.dispatchEvent(new CustomEvent('jh_analytics', { detail: { name, payload: p, t } }))
  } catch {
    /* ignore */
  }
  sendAnalyticsIngest({ name, payload: p, t })
  if (process.env.NODE_ENV === 'development') {
    console.debug('[jh_analytics]', name, payload)
  }
}
