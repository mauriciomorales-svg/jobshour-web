/**
 * Helper para llamadas API que funciona tanto en web (proxy Next.js)
 * como en la app Android (Capacitor → URL directa a la API pública)
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '')

/**
 * Devuelve la URL completa para una ruta de API.
 * En web: '/api/v1/...' (proxy Next.js)
 * En Android: 'https://api.jobshour.dondemorales.cl/api/v1/...'
 */
export function apiUrl(path: string): string {
  // Si hay una URL base configurada (modo Android/export), úsala
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }
  // En web normal, usar rutas relativas (proxy Next.js)
  return path
}

/**
 * Wrapper de fetch que agrega automáticamente la URL base correcta
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options)
}
