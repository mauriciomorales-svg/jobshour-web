const SW_PATH = '/sw.js'
const MIGRATION_KEY = 'jh-fcm-sw-unified-v1'

function scriptUrl(reg: ServiceWorkerRegistration): string {
  const worker = reg.active || reg.waiting || reg.installing
  return worker?.scriptURL ?? ''
}

/** Quita el SW FCM viejo y asegura /sw.js (sin DevTools). Recarga como máximo una vez por sesión. */
export async function ensureUnifiedServiceWorker(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false

  const regs = await navigator.serviceWorker.getRegistrations()
  let removedLegacy = false

  for (const reg of regs) {
    const url = scriptUrl(reg)
    if (url.includes('firebase-messaging-sw.js')) {
      console.log('[FCM] Auto-migrate: unregister legacy SW', url)
      await reg.unregister()
      removedLegacy = true
    }
  }

  const registration = await navigator.serviceWorker.register(SW_PATH)
  try {
    await registration.update()
  } catch {
    /* ignore */
  }
  if (registration.waiting && registration.active) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (removedLegacy && !sessionStorage.getItem(MIGRATION_KEY)) {
    sessionStorage.setItem(MIGRATION_KEY, '1')
    console.log('[FCM] Auto-migrate: reload once for new service worker')
    window.location.reload()
    return true
  }

  return false
}
