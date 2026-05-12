import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobshours.com'

/** Placeholder para export estático de Capacitor */
export function generateStaticParams() {
  return [{ id: '0' }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  try {
    const res = await fetch(`${API_BASE}/api/workers/${id}`, {
      next: { revalidate: 300 }, // 5 min cache
    })
    if (!res.ok) throw new Error('not found')

    const data = await res.json()
    const worker = data?.data ?? data

    const name: string = worker?.user?.name ?? worker?.name ?? 'Profesional en JobsHours'
    const bio: string = worker?.bio_tarjeta ?? worker?.bio ?? ''
    const avatar: string | null = worker?.user?.avatar_url ?? worker?.user?.avatar ?? null
    const categories: string = (worker?.categories ?? [])
      .map((c: any) => c.display_name ?? c.name)
      .slice(0, 3)
      .join(', ')

    const title = `${name} — ${categories || 'Profesional'} | JobsHours`
    const description = bio
      ? `${bio.substring(0, 140)}${bio.length > 140 ? '…' : ''}`
      : `Contrata a ${name} en JobsHours: profesionales verificados cerca de ti.`

    const profileUrl = `${SITE_URL}/worker/${id}`
    const imageUrl = avatar ?? `${SITE_URL}/og-default.png`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: profileUrl,
        siteName: 'JobsHours',
        type: 'profile',
        images: [
          {
            url: imageUrl,
            width: 400,
            height: 400,
            alt: `Foto de perfil de ${name}`,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: profileUrl,
      },
    }
  } catch {
    return {
      title: 'Profesional en JobsHours',
      description: 'Contrata profesionales verificados cerca de ti en JobsHours.',
    }
  }
}

export default function WorkerPublicLayout({ children }: { children: ReactNode }) {
  return children
}
