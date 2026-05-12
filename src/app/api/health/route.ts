import { NextResponse } from 'next/server'

/** Salud del runtime Next (UptimeRobot / balanceador). No llama a Laravel. */
export function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
