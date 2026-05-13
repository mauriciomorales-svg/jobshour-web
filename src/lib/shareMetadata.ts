import type { Metadata } from 'next'

const DEFAULT_SITE = 'https://jobshours.com'

export function metadataSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE).replace(/\/$/, '')
}

/** Origen HTTP para fetch en build/SSR (evita localhost del .env de dev). */
export function metadataApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || ''
  const trimmed = raw.replace(/\/api\/?$/, '')
  if (!trimmed || trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return DEFAULT_SITE
  }
  return trimmed.replace(/\/$/, '')
}

export type ExpertSharePayload = {
  name: string
  title: string | null
  store_name: string | null
  is_seller: boolean
  avatar: string | null
  categoryLabel: string | null
}

export async function fetchExpertSharePayload(workerId: string): Promise<ExpertSharePayload | null> {
  const origin = metadataApiOrigin()
  const url = `${origin}/api/v1/experts/${encodeURIComponent(workerId)}`
  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json: unknown = await res.json().catch(() => null)
    if (!json || typeof json !== 'object') return null
    const data = (json as { data?: Record<string, unknown> }).data
    if (!data || typeof data.name !== 'string') return null
    const cat = data.category as { name?: string } | null | undefined
    return {
      name: data.name,
      title: typeof data.title === 'string' ? data.title : null,
      store_name: typeof data.store_name === 'string' ? data.store_name : null,
      is_seller: Boolean(data.is_seller),
      avatar: typeof data.avatar === 'string' ? data.avatar : null,
      categoryLabel: cat && typeof cat.name === 'string' ? cat.name : null,
    }
  } catch {
    return null
  }
}

export async function buildExpertShareMetadata(
  workerId: string,
  opts: { variant: 'tienda' | 'profile' }
): Promise<Metadata> {
  const site = metadataSiteUrl()
  const path = opts.variant === 'tienda' ? `/tienda/${workerId}` : `/worker/${workerId}`
  const canonical = `${site}${path}`
  const payload = await fetchExpertSharePayload(workerId)

  const fallbackTitle = opts.variant === 'tienda' ? 'Tienda — JobsHours' : 'Perfil — JobsHours'
  const title = payload
    ? opts.variant === 'tienda'
      ? payload.is_seller && payload.store_name
        ? `${payload.store_name} — JobsHours`
        : `${payload.name} — Tienda JobsHours`
      : `${payload.name} — Servicios en JobsHours`
    : fallbackTitle

  const description = payload
    ? opts.variant === 'tienda'
      ? `Comprá en la tienda de ${payload.name} en JobsHours.${payload.categoryLabel ? ` ${payload.categoryLabel}.` : ''}`
      : `${payload.title || 'Servicios a domicilio'} — ${payload.name} en JobsHours (Chile).`
    : 'Encontrá expertos y tiendas locales en JobsHours.'

  const ogImages: NonNullable<Metadata['openGraph']>['images'] =
    payload?.avatar && payload.avatar.startsWith('http')
      ? [{ url: payload.avatar, width: 512, height: 512, alt: payload.name }]
      : [{ url: `${site}/opengraph-image`, width: 1200, height: 630, alt: 'JobsHours' }]

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'JobsHours',
      locale: 'es_CL',
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((i) => (typeof i === 'string' ? i : i instanceof URL ? i.href : i.url)),
    },
  }
}

export type DemandSharePayload = {
  id: number
  categoryName: string
  description: string
  offeredPrice: number
  clientName: string
  clientAvatar: string | null
}

function truncateMeta(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export async function fetchDemandSharePayload(demandId: string): Promise<DemandSharePayload | null> {
  const origin = metadataApiOrigin()
  const url = `${origin}/api/v1/demand/${encodeURIComponent(demandId)}`
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json: unknown = await res.json().catch(() => null)
    if (!json || typeof json !== 'object') return null
    const root = json as { status?: string; data?: Record<string, unknown> }
    if (root.status !== 'success' || !root.data || typeof root.data !== 'object') return null
    const d = root.data
    const id = typeof d.id === 'number' ? d.id : Number(d.id)
    if (!Number.isFinite(id)) return null
    const cat = d.category as { name?: string } | undefined
    const client = d.client as { name?: string; avatar?: string | null } | undefined
    const categoryName =
      cat && typeof cat.name === 'string' && cat.name.trim() ? cat.name.trim() : 'Demanda'
    const description = typeof d.description === 'string' ? d.description : ''
    const offeredPrice =
      typeof d.offered_price === 'number'
        ? d.offered_price
        : Number(d.offered_price) || 0
    const clientName =
      client && typeof client.name === 'string' && client.name.trim() ? client.name.trim() : 'JobsHours'
    const clientAvatar =
      client && typeof client.avatar === 'string' && client.avatar.startsWith('http') ? client.avatar : null
    return {
      id,
      categoryName,
      description,
      offeredPrice,
      clientName,
      clientAvatar,
    }
  } catch {
    return null
  }
}

export async function buildDemandShareMetadata(demandId: string): Promise<Metadata> {
  const site = metadataSiteUrl()
  const canonical = `${site}/d/${demandId}`
  const payload = await fetchDemandSharePayload(demandId)

  const priceFmt =
    payload && Number.isFinite(payload.offeredPrice)
      ? `$${Math.round(payload.offeredPrice).toLocaleString('es-CL')}`
      : ''

  const title = payload
    ? `${payload.categoryName} · ${priceFmt || 'Demanda'} — JobsHours`
    : 'Demanda — JobsHours'

  const description = payload
    ? truncateMeta(
        payload.description
          ? `${payload.description} · Publicado por ${payload.clientName}.`
          : `Solicitud en ${payload.categoryName}. ${payload.clientName} busca ayuda en JobsHours.`,
        200,
      )
    : 'Mirá esta solicitud y sumate como socio en JobsHours (Chile).'

  const ogImages: NonNullable<Metadata['openGraph']>['images'] =
    payload?.clientAvatar && payload.clientAvatar.startsWith('http')
      ? [{ url: payload.clientAvatar, width: 512, height: 512, alt: payload.clientName }]
      : [{ url: `${site}/opengraph-image`, width: 1200, height: 630, alt: 'JobsHours' }]

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'JobsHours',
      locale: 'es_CL',
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((i) => (typeof i === 'string' ? i : i instanceof URL ? i.href : i.url)),
    },
  }
}
