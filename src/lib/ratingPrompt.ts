export type RateableServiceRequest = {
  id: number
  status: string
  can_rate?: boolean
  user_has_reviewed?: boolean
  worker?: {
    id?: number
    name?: string
    avatar?: string | null
    user?: { name?: string; avatar?: string | null }
  } | null
}

export function workerInfoFromRequest(sr: RateableServiceRequest): { name: string; avatar: string | null } {
  const w = sr.worker
  return {
    name: w?.name || w?.user?.name || 'Trabajador',
    avatar: w?.avatar ?? w?.user?.avatar ?? null,
  }
}

/** Primera solicitud completada pendiente de reseña (no repetir en la misma sesión). */
export function findPendingRatingRequest(list: RateableServiceRequest[]): RateableServiceRequest | null {
  for (const sr of list) {
    if (sr.status !== 'completed') continue
    if (!sr.can_rate || sr.user_has_reviewed) continue
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(`rated_${sr.id}`)) continue
      if (sessionStorage.getItem(`rating_prompted_${sr.id}`)) continue
    }
    return sr
  }
  return null
}

export function markRatingPrompted(requestId: number): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(`rating_prompted_${requestId}`, '1')
}
