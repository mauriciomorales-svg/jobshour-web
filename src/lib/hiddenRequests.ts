/** IDs de solicitudes ocultas localmente (no borran datos en servidor). */
const storageKey = (userId: number) => `jh_hidden_requests_${userId}`

export function readHiddenRequestIds(userId: number): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : []
  } catch {
    return []
  }
}

export function writeHiddenRequestIds(userId: number, ids: number[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(new Set(ids))))
  window.dispatchEvent(new CustomEvent('jh-hidden-requests-changed'))
}

export function hideRequestForUser(userId: number, requestId: number): void {
  const ids = readHiddenRequestIds(userId)
  if (ids.includes(requestId)) return
  writeHiddenRequestIds(userId, [...ids, requestId])
}

export function unhideRequestForUser(userId: number, requestId: number): void {
  writeHiddenRequestIds(
    userId,
    readHiddenRequestIds(userId).filter((id) => id !== requestId),
  )
}

export function clearHiddenRequests(userId: number): void {
  writeHiddenRequestIds(userId, [])
}
