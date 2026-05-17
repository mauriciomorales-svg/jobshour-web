import type { PublishDemandInitialDraft } from '@/app/components/PublishDemandModal'

const STORAGE_KEY = 'jh_pubdemanda_draft'
const MAX_RETURN_URL_LEN = 2048

/**
 * Valida una URL de retorno tras publicar demanda (evita open redirect).
 * Permite https en cualquier entorno; http solo a localhost/127.0.0.1 en desarrollo.
 */
export function sanitizePubdemandaReturnUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().slice(0, MAX_RETURN_URL_LEN)
  if (!s) return null
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return null
  }
  const scheme = u.protocol.toLowerCase()
  if (scheme === 'https:') {
    /* ok */
  } else if (scheme === 'http:') {
    const host = u.hostname.toLowerCase()
    const dev =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
    const pageLocal =
      typeof window !== 'undefined' &&
      (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')
    if (!(dev && pageLocal && (host === 'localhost' || host === '127.0.0.1'))) return null
  } else {
    return null
  }
  if (u.username !== '' || u.password !== '') return null
  if (!u.hostname) return null
  return u.toString()
}

export type PubdemandaDraft = PublishDemandInitialDraft & { lat: number; lng: number }

function defaultDepartureLocal(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function mapTipo(raw: string | null): PublishDemandInitialDraft['demandType'] {
  const t = (raw || 'mandado').toLowerCase().trim()
  if (['viaje', 'ride', 'flete', 'transporte'].some(x => t.includes(x))) return 'ride_share'
  if (['trabajo', 'servicio', 'fixed', 'reparacion', 'reparación', 'hogar'].some(x => t.includes(x))) return 'fixed_job'
  return 'express_errand'
}

/**
 * Query de integración (?pubdemanda=1&lat=&lng=…) para abrir JobsHours
 * con el modal de publicar demanda (p. ej. desde una tienda externa).
 *
 * Para publicar desde el **servidor** de la tienda (p. ej. tras webhook de pago), usar la API
 * `POST /api/v1/integrations/store-demand` — ver `jobshour-api/docs/INTEGRACION-TIENDA-DEMANDA.md`.
 *
 * Ejemplo (mandado / delivery):
 * `https://jobshours.com/?pubdemanda=1&lat=-36.6&lng=-72.1&q=…&source=dondemorales&return=https%3A%2F%2Fdondemorales.cl%2Fgracias`
 */
export function parsePubdemandaSearchParams(sp: URLSearchParams): PubdemandaDraft | null {
  const on = sp.get('pubdemanda') === '1' || sp.get('jh_pubdemanda') === '1'
  if (!on) return null
  const lat = Number(sp.get('lat'))
  const lng = Number(sp.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }
  const desc = (sp.get('q') || sp.get('descripcion') || sp.get('desc') || '').trim().slice(0, 500)
  const tienda = (sp.get('tienda') || sp.get('store') || '').trim().slice(0, 255)
  const tipo = mapTipo(sp.get('tipo'))
  const origen = (sp.get('origen') || sp.get('pickup') || '').trim().slice(0, 255)
  const destino = (sp.get('destino') || sp.get('delivery') || '').trim().slice(0, 255)
  const destNombre = (sp.get('destino_nombre') || '').trim().slice(0, 255)
  const departure = (sp.get('salida') || '').trim() || (tipo === 'ride_share' ? defaultDepartureLocal() : undefined)
  const sourceRaw = (sp.get('source') || sp.get('utm_source') || '').trim().slice(0, 80)
  const returnRaw = sp.get('return') || sp.get('redirect')
  const returnAfterPublish = sanitizePubdemandaReturnUrl(returnRaw)

  const draft: PubdemandaDraft = {
    lat,
    lng,
    demandType: tipo,
    description: desc || (tienda ? `Pedido desde ${tienda} (delivery / mandado).` : 'Pedido desde sitio externo.'),
    externalSource: sourceRaw || undefined,
  }
  if (tienda) draft.storeName = tienda
  if (origen) draft.pickupAddress = origen
  if (destino) draft.deliveryAddress = destino
  if (destNombre) draft.destinationName = destNombre
  if (departure) draft.departureTime = departure
  if (returnAfterPublish) draft.returnAfterPublish = returnAfterPublish
  return draft
}

export function persistPubdemandaDraft(draft: PubdemandaDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function consumePubdemandaDraft(): PubdemandaDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const o = JSON.parse(raw) as PubdemandaDraft
    if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return null
    const ret = sanitizePubdemandaReturnUrl(o.returnAfterPublish)
    if (ret) o.returnAfterPublish = ret
    else delete o.returnAfterPublish
    return o
  } catch {
    return null
  }
}

/** Arma el enlace para un botón “Pedir en JobsHours” desde un sitio externo. */
export function buildPubdemandaJobsHoursUrl(opts: {
  jobsHoursOrigin: string
  lat: number
  lng: number
  q?: string
  tipo?: string
  tienda?: string
  source?: string
  /** URL https (o http localhost en dev) a la que volver tras publicar la demanda */
  returnUrl?: string
}): string {
  const base = opts.jobsHoursOrigin.replace(/\/$/, '')
  const u = new URL(`${base}/`)
  u.searchParams.set('pubdemanda', '1')
  u.searchParams.set('lat', String(opts.lat))
  u.searchParams.set('lng', String(opts.lng))
  if (opts.q) u.searchParams.set('q', opts.q)
  if (opts.tipo) u.searchParams.set('tipo', opts.tipo)
  if (opts.tienda) u.searchParams.set('tienda', opts.tienda)
  if (opts.source) u.searchParams.set('source', opts.source)
  const ret = opts.returnUrl ? sanitizePubdemandaReturnUrl(opts.returnUrl) : null
  if (ret) u.searchParams.set('return', ret)
  return u.toString()
}
