/**
 * Pasarela de pago en el cliente (Next.js).
 * - Por defecto: Mercado Pago (alineado con producción actual).
 * - Flow solo si NEXT_PUBLIC_PAYMENT_GATEWAY=flow.
 *
 * La clave pública del brick puede venir de NEXT_PUBLIC_MP_PUBLIC_KEY o del API
 * GET /api/v1/payments/mp/brick-config (misma MP_PUBLIC_KEY que en Laravel).
 */
import { apiFetch } from '@/lib/api'

export type PublicPaymentGateway = 'mercadopago' | 'flow'

export function getPublicPaymentGateway(): PublicPaymentGateway {
  const raw = (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY || 'mercadopago').toLowerCase()
  return raw === 'flow' ? 'flow' : 'mercadopago'
}

export function getMercadoPagoPublicKeyFromEnv(): string {
  return (process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '').trim()
}

export function prefersMercadoPagoGateway(): boolean {
  return getPublicPaymentGateway() === 'mercadopago'
}

/** Solo true si ya hay NEXT_PUBLIC_MP_PUBLIC_KEY (sin consultar al API). */
export function shouldUseMercadoPagoPublic(): boolean {
  return prefersMercadoPagoGateway() && !!getMercadoPagoPublicKeyFromEnv()
}

const brickConfigTimeoutMs = 25_000

export async function fetchMercadoPagoBrickConfig(bearerToken: string): Promise<string> {
  try {
    const signal =
      typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(brickConfigTimeoutMs)
        : undefined
    const res = await apiFetch('/api/v1/payments/mp/brick-config', {
      headers: { Authorization: `Bearer ${bearerToken}` },
      ...(signal ? { signal } : {}),
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { public_key?: string }
    return typeof data.public_key === 'string' ? data.public_key.trim() : ''
  } catch {
    return ''
  }
}
