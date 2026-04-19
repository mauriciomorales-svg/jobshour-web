import { NextRequest, NextResponse } from 'next/server'

/**
 * Sumidero de eventos de producto (`trackEvent`). Mismo origen que la web → sin CORS.
 * Body JSON: `{ name: string, payload: object, t: number }` (acepta también `event` como alias de `name`).
 *
 * Opcional (servidor): `ANALYTICS_FORWARD_URL` — POST reenviado al backend Laravel u otro.
 */
export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const obj = raw as Record<string, unknown>
  const name =
    typeof obj.name === 'string'
      ? obj.name
      : typeof obj.event === 'string'
        ? obj.event
        : null
  const t = typeof obj.t === 'number' ? obj.t : NaN
  if (!name || !Number.isFinite(t)) {
    return NextResponse.json({ error: 'invalid_shape' }, { status: 400 })
  }

  const payload =
    obj.payload !== null &&
    typeof obj.payload === 'object' &&
    !Array.isArray(obj.payload)
      ? (obj.payload as Record<string, unknown>)
      : {}

  const forward = process.env.ANALYTICS_FORWARD_URL?.trim()
  const forwardSecret = process.env.ANALYTICS_FORWARD_SECRET?.trim()
  const authForward = req.headers.get('authorization')
  if (forward) {
    try {
      await fetch(forward, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.get('x-forwarded-for')
            ? { 'X-Forwarded-For': req.headers.get('x-forwarded-for')! }
            : {}),
          ...(forwardSecret ? { 'X-Analytics-Secret': forwardSecret } : {}),
          ...(authForward ? { Authorization: authForward } : {}),
        },
        body: JSON.stringify({ name, payload, t }),
      })
    } catch {
      /* no bloquear al cliente */
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[jh-analytics ingest]', name, payload, new Date(t).toISOString())
  }

  return new NextResponse(null, { status: 204 })
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
