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
