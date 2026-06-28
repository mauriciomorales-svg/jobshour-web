import { getPublicApiBase } from '@/lib/api'

export type TakeDemandResult =
  | { ok: true; requestId: number; message: string; client?: { name?: string; avatar?: string | null } }
  | { ok: false; message: string; httpStatus?: number }

/** Toma una demanda pública y devuelve el id de la solicitud derivada (chat/transacción). */
export async function takePublicDemand(demandId: number, token: string): Promise<TakeDemandResult> {
  const res = await fetch(`${getPublicApiBase()}/api/v1/demand/${demandId}/take`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: Record<string, unknown> = {}
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    data = {}
  }

  if (!res.ok) {
    const raw = typeof data.message === 'string' ? data.message : ''
    const friendly =
      res.status === 409 || raw.includes('tomada')
        ? 'Esta demanda ya fue tomada por otro trabajador.'
        : raw.includes('propia')
          ? 'No puedes tomar tu propia demanda.'
          : raw || 'No se pudo tomar la demanda.'
    return { ok: false, message: friendly, httpStatus: res.status }
  }

  const payload = (data.data ?? data) as Record<string, unknown>
  const requestId = typeof payload.id === 'number' ? payload.id : Number(payload.id)
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return { ok: false, message: 'Respuesta inválida al tomar la demanda' }
  }

  const clientRaw = payload.client as Record<string, unknown> | undefined

  return {
    ok: true,
    requestId,
    message: typeof data.message === 'string' ? data.message : 'Demanda tomada',
    client: clientRaw
      ? {
          name: typeof clientRaw.name === 'string' ? clientRaw.name : undefined,
          avatar: (clientRaw.avatar as string | null) ?? null,
        }
      : undefined,
  }
}
