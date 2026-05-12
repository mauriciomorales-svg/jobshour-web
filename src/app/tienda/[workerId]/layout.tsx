import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobshours.com'

export function generateStaticParams() {
  return [{ workerId: '0' }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workerId: string }>
}): Promise<Metadata> {
  const { workerId } = await params

  try {
    const res = await fetch(`${API_BASE}/api/workers/${workerId}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error('not found')

    const data = await res.json()
    const worker = data?.data ?? data

    const name: string = worker?.user?.name ?? worker?.name ?? 'Tienda en JobsHours'
    const storeName: string = worker?.store_name ?? `Tienda de ${name}`
    const bio: string = worker?.store_description ?? worker?.bio_tarjeta ?? ''
    const avatar: string | null = worker?.user?.avatar_url ?? worker?.user?.avatar ?? null

    const title = `${storeName} | JobsHours`
    const description = bio
      ? `${bio.substring(0, 140)}${bio.length > 140 ? '…' : ''}`
      : `Compra productos y contrata servicios de ${name} en JobsHours.`

    const storeUrl = `${SITE_URL}/tienda/${workerId}`
    const imageUrl = avatar ?? `${SITE_URL}/og-default.png`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: storeUrl,
        siteName: 'JobsHours',
        type: 'website',
        images: [{ url: imageUrl, width: 400, height: 400, alt: `Logo de ${storeName}` }],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [imageUrl],
      },
      alternates: { canonical: storeUrl },
    }
  } catch {
    return {
      title: 'Tienda en JobsHours',
      description: 'Compra productos y servicios de profesionales verificados en JobsHours.',
    }
  }
}

export default function TiendaWorkerLayout({ children }: { children: ReactNode }) {
  return children
}
