/**
 * Depuración del flujo precios/solicitudes en consola del navegador.
 *
 * Activar en cualquier momento:
 *   localStorage.setItem('jh_debug_flow', '1')
 * Desactivar:
 *   localStorage.removeItem('jh_debug_flow')
 *
 * Filtrar en DevTools: Jh:flow
 */

const FLAG = 'jh_debug_flow'

export function isJhFlowDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

export function jhFlowHintOnce(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { __jhFlowHint?: boolean }
  if (w.__jhFlowHint) return
  w.__jhFlowHint = true
  console.info(
    '[Jh:flow] Depuración de flujo: localStorage.setItem("jh_debug_flow","1") y recarga. Verás take_demand, create-link MP, precios y solicitudes.',
  )
}

type FlowPayload = Record<string, unknown> | null | undefined

export function jhFlowLog(event: string, payload?: FlowPayload): void {
  if (!isJhFlowDebugEnabled()) return
  const line = `[Jh:flow] ${event}`
  if (payload !== undefined && payload !== null) {
    console.info(line, payload)
  } else {
    console.info(line)
  }
}

/** Resumen de una solicitud para comparar UI vs API */
export function jhFlowSummarizeRequest(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    id: raw.id,
    status: raw.status,
    offered_price: raw.offered_price ?? null,
    final_price: raw.final_price ?? null,
    adjusted_price: raw.adjusted_price ?? null,
    client_approved_adjustment: raw.client_approved_adjustment ?? null,
    payment_status: raw.payment_status ?? null,
  }
}
