/**
 * Helper para llamadas API que funciona tanto en web (proxy Next.js)
 * como en la app Android (Capacitor → URL directa a la API pública)
 *
 * Si el bundle se construyó con NEXT_PUBLIC_API_URL=localhost (p. ej. .env.local en el VPS),
 * en el navegador usamos el origen real (jobshours.com) para que marcadores y API funcionen.
 */

const FALLBACK_ORIGIN = 'https://jobshour.dondemorales.cl'

function isLocalhostUrl(base: string): boolean {
  return (
    base.includes('localhost') ||
    base.includes('127.0.0.1') ||
    base.includes('0.0.0.0')
  )
}

/**
 * Base pública para fetch desde el cliente (sin /api final).
 */
export function getPublicApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || ''
  const baked = raw.replace(/\/api$/, '')
  const looksDev = !raw || isLocalhostUrl(baked)

  if (typeof window !== 'undefined') {
    if (looksDev) {
      return window.location.origin.replace(/\/$/, '')
    }
    return baked || FALLBACK_ORIGIN
  }

  if (looksDev) {
    return FALLBACK_ORIGIN
  }
  return baked || FALLBACK_ORIGIN
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '')

/**
 * Devuelve la URL completa para una ruta de API.
 */
export function apiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${getPublicApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  }
  if (API_BASE_URL && !isLocalhostUrl(API_BASE_URL)) {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Wrapper de fetch que agrega automáticamente la URL base correcta
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options)
}
