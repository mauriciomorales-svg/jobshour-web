/**
 * Pasarela de pago en el cliente (Next.js).
 * - Por defecto: Mercado Pago (alineado con producción actual).
 * - Flow solo si NEXT_PUBLIC_PAYMENT_GATEWAY=flow.
 *
 * Mercado Pago requiere NEXT_PUBLIC_MP_PUBLIC_KEY para el Payment Brick.
 */
export type PublicPaymentGateway = 'mercadopago' | 'flow'

export function getPublicPaymentGateway(): PublicPaymentGateway {
  const raw = (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY || 'mercadopago').toLowerCase()
  return raw === 'flow' ? 'flow' : 'mercadopago'
}

export function shouldUseMercadoPagoPublic(): boolean {
  return getPublicPaymentGateway() === 'mercadopago' && !!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
}
