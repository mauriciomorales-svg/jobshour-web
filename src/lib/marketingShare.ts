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

/** Invitación genérica (p. ej. QR en Amigos): mensaje corto + enlace con UTM. */
export function whatsAppInviteProfileText(profileUrl: string): string {
  const url = withShareUtm(profileUrl, 'worker_profile_invite')
  return `JobsHours — ver tarjeta de perfil:\n${url}`
}

/** Compartir perfil de un worker (vista pública / terceros). */
export function whatsAppWorkerProfileShareText(opts: { workerName: string; profileUrl: string }): string {
  const url = withShareUtm(opts.profileUrl, 'worker_profile_share')
  const name = opts.workerName.trim() || 'Este perfil'
  return `${name} en JobsHours\n👉 Ver tarjeta:\n${url}`
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
  return `Te comparto mi Feria de Pulgas en ${store} (JobsHours).${totalLine}\nVer y pagar aquí:\n${url}`
}

export function publicProductUrl(workerId: string | number, productId: string | number, productName?: string | null): string {
  const safeName = (productName || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'producto'
  return `${getSiteOrigin()}/p/${workerId}-${productId}-${safeName}`
}

/** Ficha corta pública para compartir una demanda (Publicación dorada / feed). */
export function publicDemandUrl(demandId: string | number): string {
  return `${getSiteOrigin()}/d/${demandId}`
}

export function whatsAppDemandShareText(opts: {
  categoryLabel: string
  summary: string
  priceFormatted: string
  demandUrl: string
}): string {
  const url = withShareUtm(opts.demandUrl, 'demand_share')
  const head = opts.summary.trim() || opts.categoryLabel
  const price = opts.priceFormatted ? `\n💰 ${opts.priceFormatted}` : ''
  return `Mirá esta demanda en JobsHours 💼\n${head}${price}\n👉 Ver tarjeta y tomar:\n${url}`
}

export function whatsAppProductShareText(opts: {
  productName: string
  storeName?: string | null
  priceFormatted?: string
  productUrl: string
}): string {
  const store = opts.storeName?.trim() || 'mi tienda'
  const price = opts.priceFormatted ? `\nPrecio: ${opts.priceFormatted}` : ''
  const url = withShareUtm(opts.productUrl, 'product_share')
  return `Te comparto este producto de ${store} en JobsHours:\n${opts.productName}${price}\nVer ficha:\n${url}`
}

/** Compartir nativo desde el hub (incluye UTM en el enlace del texto). */
export function profileNativeShareText(profileUrl: string, profileName?: string): string {
  const url = withShareUtm(profileUrl, 'worker_profile_share')
  const head = profileName?.trim() ? `${profileName.trim()} · JobsHours` : 'Perfil en JobsHours'
  return `${head}\n👉 Ver tarjeta:\n${url}`
}

/** El worker se presenta por WhatsApp (desde su propia tarjeta en el hub). */
export function profileIntroWhatsAppText(profileName: string, profileUrl: string): string {
  const url = withShareUtm(profileUrl, 'worker_profile_intro')
  return `Soy ${profileName} en JobsHours.\n👉 Ver mi tarjeta:\n${url}`
}

export function openWhatsAppWithText(text: string): void {
  if (typeof window === 'undefined') return
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
