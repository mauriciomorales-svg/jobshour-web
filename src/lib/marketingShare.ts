/**
 * URLs públicas y mensajes virales coherentes con marca JobsHours.
 * Centraliza origen del sitio para staging/local sin romper prod.
 */

const DEFAULT_SITE = 'https://jobshours.com'

export function getSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    DEFAULT_SITE
  return raw.replace(/\/$/, '')
}

/** Host + path corto para UI (ej. jobshours.com/tienda/12). */
export function displayPublicUrl(pathOrFullUrl: string): string {
  try {
    const u = pathOrFullUrl.startsWith('http')
      ? new URL(pathOrFullUrl)
      : new URL(pathOrFullUrl.replace(/^\//, ''), `${getSiteOrigin()}/`)
    return `${u.host}${u.pathname}${u.search}`
  } catch {
    return pathOrFullUrl.replace(/^https?:\/\//, '')
  }
}

export function publicWorkerProfileUrl(workerId: string | number | undefined | null): string {
  const id = workerId ?? ''
  if (id === '') return `${getSiteOrigin()}/`
  return `${getSiteOrigin()}/worker/${id}`
}

export function publicTiendaUrl(workerId: string | number): string {
  return `${getSiteOrigin()}/tienda/${workerId}`
}

/** Atribución ligera para enlaces compartidos por WhatsApp / redes. */
export function withShareUtm(url: string, campaign: string): string {
  try {
    const base = url.startsWith('http') ? url : `${getSiteOrigin()}${url.startsWith('/') ? '' : '/'}${url}`
    const u = new URL(base)
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'share')
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'social')
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    return url
  }
}

export function whatsAppInviteProfileText(profileUrl: string): string {
  return `¿Necesitas ayuda con algo? En JobsHours encontrarás personas con habilidades reales cerca de ti 📍\nMira este perfil: ${profileUrl}`
}

export function whatsAppQuoteShareText(opts: {
  quoteUrl: string
  storeName?: string | null
  totalFormatted?: string
}): string {
  const store = opts.storeName?.trim() || 'JobsHours'
  const totalLine =
    opts.totalFormatted && opts.totalFormatted.length > 0
      ? `\nTotal: ${opts.totalFormatted}`
      : ''
  const url = withShareUtm(opts.quoteUrl, 'integrated_quote')
  return `Te comparto mi lote listo en ${store} (JobsHours).${totalLine}\nVer y pagar aquí:\n${url}`
}

export function profileNativeShareText(profileUrl: string): string {
  return `¿Necesitas ayuda con algo? Encuentra trabajadores verificados cerca de ti en JobsHours 👇\n${profileUrl}`
}

export function profileIntroWhatsAppText(profileName: string, profileUrl: string): string {
  return `¡Hola! Soy ${profileName} y ofrezco mis servicios en JobsHours 🔧\nMírame aquí: ${profileUrl}`
}

export function openWhatsAppWithText(text: string): void {
  if (typeof window === 'undefined') return
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
