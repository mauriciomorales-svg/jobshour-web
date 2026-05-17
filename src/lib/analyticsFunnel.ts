import { trackEvent } from '@/lib/analytics'

/** Eventos estándar del embudo de solicitud (Semana 4). */
export const FunnelEvents = {
  REQUEST_START: 'request_start',
  REQUEST_SUBMIT: 'request_submit',
  DEMAND_PUBLISH_SUCCESS: 'demand_publish_success',
  CHAT_OPEN: 'chat_open',
  REQUEST_ACCEPT: 'request_accept',
  REQUEST_COMPLETE: 'request_complete',
  PAYMENT_START: 'payment_start',
  PAYMENT_SUCCESS: 'payment_success',
  DISPUTE_SUBMIT: 'dispute_submit',
} as const

export function trackFunnelEvent(
  name: string,
  payload?: Record<string, unknown>,
): void {
  trackEvent(name, { ...payload, _funnel: true })
}
