import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function normalizeApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api').trim()
  return raw.replace(/\/api\/?$/i, '').replace(/\/$/, '')
}

function primaryHosts(): Set<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_PRIMARY_HOST || 'jobshours.com').toLowerCase().trim()
  const base = fromEnv.replace(/^www\./, '')
  return new Set([base, `www.${base}`, 'localhost', '127.0.0.1'])
}

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get('host') || ''
  const host = rawHost.split(':')[0]?.toLowerCase() || ''
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/inventario') ||
    /\.(ico|png|jpg|jpeg|gif|webp|svg|txt|xml|webmanifest|js|css|map|woff2?)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  const primaries = primaryHosts()
  if (!host || primaries.has(host)) {
    return NextResponse.next()
  }

  try {
    const origin = normalizeApiOrigin()
    const url = `${origin}/api/v1/store-host/resolve?host=${encodeURIComponent(host)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.next()
    }
    const body = (await res.json()) as { status?: string; data?: { worker_id?: number } | null }
    const wid = body?.status === 'success' && body?.data?.worker_id != null ? Number(body.data.worker_id) : NaN
    if (!Number.isFinite(wid) || wid <= 0) {
      return NextResponse.next()
    }

    if (pathname === '/') {
      const u = request.nextUrl.clone()
      u.pathname = `/tienda/${wid}`
      return NextResponse.rewrite(u)
    }

    return NextResponse.next()
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
