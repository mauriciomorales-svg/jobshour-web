import { initializeApp, getApp, type FirebaseApp } from 'firebase/app'
import { getInstallations, getId, getToken as getInstallationAuthToken } from 'firebase/installations'
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import { ensureUnifiedServiceWorker } from '@/lib/serviceWorkerMigrate'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/** Mismo SW que registra layout.tsx (evita dos workers en scope /). */
const SW_PATH = '/sw.js'

/** VAPID por defecto del SDK de Firebase (no enviar applicationPubKey si coincide). */
const DEFAULT_VAPID_KEY =
  'BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4'

const hasRequiredFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  )

const cleanVapidKey = (key: string): string => key.trim().replace(/\s/g, '')

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Misma codificación que @firebase/messaging (base64url sin padding). */
function arrayToBase64(buf: ArrayBuffer | null): string {
  if (!buf) throw new Error('Push subscription key missing')
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function buildFcmRegistrationBody(sub: PushSubscription, vapidKey: string | null) {
  const effectiveVapid = vapidKey || DEFAULT_VAPID_KEY
  const web: { endpoint: string; auth: string; p256dh: string; applicationPubKey?: string } = {
    endpoint: sub.endpoint,
    auth: arrayToBase64(sub.getKey('auth')),
    p256dh: arrayToBase64(sub.getKey('p256dh')),
  }
  if (effectiveVapid !== DEFAULT_VAPID_KEY) {
    web.applicationPubKey = effectiveVapid
  }
  return { web }
}

async function ensurePushSubscription(
  reg: ServiceWorkerRegistration,
  vapidKey: string | null,
  forceNew = false,
): Promise<PushSubscription> {
  const effectiveVapid = vapidKey || DEFAULT_VAPID_KEY
  let sub = await reg.pushManager.getSubscription()
  if (sub && forceNew) {
    console.log('[FCM] Desuscribiendo push anterior (VAPID / registro nuevo)...')
    try {
      await sub.unsubscribe()
    } catch {
      /* ignore */
    }
    sub = null
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(effectiveVapid) as BufferSource,
    })
  }
  return sub
}

/** Cambia en cada deploy FCM; si no coincide en consola, el bundle en producción está viejo. */
export const FCM_CLIENT_BUILD = '2026-05-15-fcm-retry-v2'

/** Clave pública Web Push de Firebase Console (Cloud Messaging → certificados web). */
const getVapidKey = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!raw) return null
  const cleaned = cleanVapidKey(raw)
  if (cleaned.length < 80) {
    console.warn('[FCM] VAPID key demasiado corta; revisa Firebase Console → Cloud Messaging.')
    return null
  }
  return cleaned
}

let messaging: Messaging | null = null

export const initFirebase = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null

  if (!hasRequiredFirebaseConfig()) {
    console.warn(
      '[FCM] Firebase config incompleta; se omite inicialización (sin projectId/apiKey/appId/messagingSenderId).',
    )
    return null
  }

  const supported = await isSupported()
  if (!supported) {
    console.log('[FCM] Firebase Messaging not supported in this browser')
    return null
  }

  try {
    const app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
    return messaging
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err?.code === 'app/duplicate-app') {
      messaging = getMessaging(getApp())
      return messaging
    }
    console.error('[FCM] Firebase init error:', error)
    return null
  }
}

async function waitForServiceWorkerActive(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration
  const installing = registration.installing || registration.waiting
  if (!installing) {
    await navigator.serviceWorker.ready
    return registration
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('SW activate timeout')), 15000)
    installing.addEventListener('statechange', () => {
      if (installing.state === 'activated') {
        window.clearTimeout(timeout)
        resolve()
      }
      if (installing.state === 'redundant') {
        window.clearTimeout(timeout)
        reject(new Error('SW became redundant'))
      }
    })
  })
  return registration
}

async function getMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    await navigator.serviceWorker.ready
    let registration =
      (await navigator.serviceWorker.getRegistration('/')) ||
      (await navigator.serviceWorker.getRegistration())
    if (!registration) {
      console.log('[FCM] No SW yet, registering:', SW_PATH)
      registration = await navigator.serviceWorker.register(SW_PATH)
    }
    registration = await waitForServiceWorkerActive(registration)
    const script = registration.active?.scriptURL || registration.installing?.scriptURL || 'unknown'
    console.log('[FCM] Service worker scope:', registration.scope)
    console.log('[FCM] Service worker script:', script)
    if (!script.includes('/sw.js')) {
      console.warn('[FCM] SW inesperado, ejecutando migración automática…', script)
      const reloaded = await ensureUnifiedServiceWorker()
      if (reloaded) return null
    }
    return registration
  } catch (e) {
    console.error('[FCM] Service worker registration failed:', e)
    return null
  }
}

function logFcmAuthHint(error: unknown): void {
  const msg = String(error)
  if (!msg.includes('authentication credential') && !msg.includes('401')) return
  console.error(
    '[FCM] 401 en fcmregistrations: falta Authorization Bearer (token Installations) o la API key bloquea el origen.',
  )
}

async function verifyFirebaseInstallations(app: FirebaseApp): Promise<boolean> {
  try {
    const installations = getInstallations(app)
    const fid = await getId(installations)
    const authToken = await getInstallationAuthToken(installations)
    console.log('[FCM] Installation FID OK:', fid)
    console.log('[FCM] Installation auth token length:', authToken.length)
    return true
  } catch (e) {
    console.error('[FCM] Installation FID failed (getToken fallará después):', e)
    logFcmAuthHint(e)
    return false
  }
}

/**
 * Registro directo en fcmregistrations. Google exige Authorization: Bearer con el token de Installations
 * (no solo x-goog-firebase-installations-auth; con FIS solo suele devolver 401).
 */
async function postFcmRegistration(
  projectId: string,
  apiKey: string,
  installationAuthToken: string,
  sub: PushSubscription,
  vapidKey: string | null,
): Promise<{ ok: boolean; status: number; token?: string; errorMessage?: string }> {
  const res = await fetch(
    `https://fcmregistrations.googleapis.com/v1/projects/${projectId}/registrations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Goog-Api-Key': apiKey,
        Authorization: `Bearer ${installationAuthToken}`,
      },
      body: JSON.stringify(buildFcmRegistrationBody(sub, vapidKey)),
    },
  )

  const body = (await res.json().catch(() => ({}))) as {
    token?: string
    error?: { message?: string; details?: unknown[] }
  }

  return {
    ok: res.ok,
    status: res.status,
    token: body.token,
    errorMessage: body.error?.message,
  }
}

async function fetchFcmTokenViaRest(
  app: FirebaseApp,
  vapidKey: string | null,
  swRegistration: ServiceWorkerRegistration | null,
): Promise<string | null> {
  const apiKey = firebaseConfig.apiKey
  const projectId = firebaseConfig.projectId
  if (!apiKey || !projectId) return null

  try {
    const installations = getInstallations(app)
    const fisToken = await getInstallationAuthToken(installations, true)
    const reg = swRegistration || (await getMessagingServiceWorker())
    if (!reg?.pushManager) {
      console.warn('[FCM] Fallback REST: pushManager no disponible')
      return null
    }

    console.log('[FCM] Fallback REST: subscribe + fcmregistrations (Bearer Installations)...')

    let sub = await ensurePushSubscription(reg, vapidKey, false)
    let result = await postFcmRegistration(projectId, apiKey, fisToken, sub, vapidKey)

    if (!result.ok && result.status === 400) {
      console.warn('[FCM] Fallback REST 400, reintentando con suscripción push nueva...')
      sub = await ensurePushSubscription(reg, vapidKey, true)
      result = await postFcmRegistration(projectId, apiKey, fisToken, sub, vapidKey)
    }

    if (result.ok && result.token) {
      console.log('[FCM] Token OK (fallback REST + Bearer)')
      return result.token
    }

    if (result.status === 401) {
      console.warn(
        '[FCM] Fallback REST 401: suele ser restricción HTTP referrer de la API key en Google Cloud.',
      )
    } else {
      console.error('[FCM] Fallback REST HTTP', result.status, result.errorMessage || '')
    }
    return null
  } catch (e) {
    console.error('[FCM] Fallback REST error:', e)
    return null
  }
}

/** Registro vía Laravel (sin restricción referrer en el navegador). */
async function fetchFcmTokenViaBackend(
  app: FirebaseApp,
  vapidKey: string | null,
  swRegistration: ServiceWorkerRegistration | null,
  apiToken: string,
): Promise<string | null> {
  try {
    const installations = getInstallations(app)
    const installationAuthToken = await getInstallationAuthToken(installations, true)
    const reg = swRegistration || (await getMessagingServiceWorker())
    if (!reg?.pushManager) return null

    console.log('[FCM] Proxy backend: subscribe + POST /notifications/register-fcm-web...')

    const { apiFetch } = await import('@/lib/api')
    const postRegister = async (sub: PushSubscription) => {
      const web = buildFcmRegistrationBody(sub, vapidKey).web
      return apiFetch('/api/v1/notifications/register-fcm-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          installation_auth_token: installationAuthToken,
          web,
        }),
      })
    }

    let sub = await ensurePushSubscription(reg, vapidKey, false)
    let response = await postRegister(sub)

    if (!response.ok && (response.status === 422 || response.status === 502)) {
      console.warn('[FCM] Proxy backend', response.status, '— reintentando con suscripción push nueva...')
      sub = await ensurePushSubscription(reg, vapidKey, true)
      response = await postRegister(sub)
    }

    const text = await response.text()
    if (!response.ok) {
      console.error('[FCM] Proxy backend HTTP', response.status, text.slice(0, 400))
      return null
    }

    let data: { data?: { fcm_token?: string }; fcm_token?: string } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    const token = data.data?.fcm_token ?? data.fcm_token
    if (token) {
      console.log('[FCM] Token OK (proxy backend)')
      return token
    }
    console.error('[FCM] Proxy backend: respuesta sin fcm_token')
    return null
  } catch (e) {
    console.error('[FCM] Proxy backend error:', e)
    return null
  }
}

async function fetchFcmToken(
  msg: Messaging,
  app: FirebaseApp,
  vapidKey: string | null,
  apiToken?: string,
): Promise<string | null> {
  const installationsOk = await verifyFirebaseInstallations(app)
  if (!installationsOk) return null

  const serviceWorkerRegistration = await getMessagingServiceWorker()

  // El navegador suele recibir 401 en fcmregistrations (API key + referrer). El proxy Laravel evita eso.
  if (apiToken) {
    for (const key of vapidKey ? [vapidKey, null] : [null]) {
      const viaBackend = await fetchFcmTokenViaBackend(
        app,
        key,
        serviceWorkerRegistration,
        apiToken,
      )
      if (viaBackend) return viaBackend
      if (key && vapidKey) {
        console.warn('[FCM] Proxy con VAPID custom falló; reintentando con clave por defecto del SDK...')
      }
    }
  }

  let viaRest = await fetchFcmTokenViaRest(app, vapidKey, serviceWorkerRegistration)
  if (viaRest) return viaRest

  const swOpts = serviceWorkerRegistration ? { serviceWorkerRegistration } : {}

  const attempts: { label: string; options: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } }[] = []

  // Primero sin pasar SW: la petición a fcmregistrations suele ir desde la página (mejor con API key por referrer).
  if (vapidKey) {
    attempts.push({ label: 'VAPID (sin SW explícito)', options: { vapidKey } })
    attempts.push({ label: 'VAPID + sw.js', options: { ...swOpts, vapidKey } })
  }
  attempts.push({ label: 'default web push key (sin SW explícito)', options: {} })
  attempts.push({ label: 'default web push key + sw.js', options: { ...swOpts } })

  for (const { label, options } of attempts) {
    try {
      console.log(`[FCM] getToken (${label})...`)
      const token = await getToken(msg, options)
      console.log(`[FCM] Token OK (${label})`)
      return token
    } catch (e) {
      console.warn(`[FCM] getToken failed (${label}):`, e)
      logFcmAuthHint(e)
    }
  }

  viaRest = await fetchFcmTokenViaRest(app, vapidKey, serviceWorkerRegistration)
  if (viaRest) return viaRest

  if (apiToken) {
    for (const key of vapidKey ? [vapidKey, null] : [null]) {
      const viaBackend = await fetchFcmTokenViaBackend(app, key, serviceWorkerRegistration, apiToken)
      if (viaBackend) return viaBackend
    }
  }

  return null
}

export const requestNotificationPermission = async (apiToken?: string): Promise<string | null> => {
  if (typeof window === 'undefined') return null

  try {
    if (!('Notification' in window)) {
      console.log('[FCM] Notifications not supported')
      return null
    }

    console.log('[FCM] origin:', window.location.origin)
    console.log('[FCM] isSecureContext:', window.isSecureContext)
    if (!window.isSecureContext) {
      console.error('[FCM] Not a secure context - notifications will be blocked')
      return null
    }

    const currentPermission = Notification.permission
    console.log('[FCM] Current permission state:', currentPermission)

    if (currentPermission === 'denied') {
      console.error('[FCM] Permission denied - user must unblock manually in site settings')
      return null
    }

    const permission =
      currentPermission === 'granted' ? 'granted' : await Notification.requestPermission()
    console.log('[FCM] Permission after request:', permission)

    if (permission !== 'granted') {
      console.log('[FCM] Permission not granted:', permission)
      return null
    }

    const msg = await initFirebase()
    if (!msg) return null

    const app = getApp()
    console.log('[FCM] projectId:', firebaseConfig.projectId)
    console.log('[FCM] apiKey suffix:', firebaseConfig.apiKey?.slice(-6) ?? 'missing')

    const vapidKey = getVapidKey()
    if (vapidKey) {
      console.log('[FCM] VAPID configured, length:', vapidKey.length)
    } else {
      console.log('[FCM] No VAPID key in build; using Firebase default for this web app')
    }

    return await fetchFcmToken(msg, app, vapidKey, apiToken)
  } catch (error) {
    console.error('[FCM] requestNotificationPermission error:', error)
    return null
  }
}

export type FcmSetupStatus =
  | 'success'
  | 'permission_denied'
  | 'permission_dismissed'
  | 'unsupported'
  | 'no_token'
  | 'config_missing'
  | 'sw_reload'

export const getBrowserNotificationPermission = (): NotificationPermission | null => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  return Notification.permission
}

export const registerFCMToken = async (token: string, apiToken: string): Promise<boolean> => {
  try {
    const { apiFetch } = await import('@/lib/api')

    console.log('[FCM] Token length:', token.length)

    const response = await apiFetch('/api/v1/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ fcm_token: token }),
    })

    console.log('[FCM] Response status:', response.status)
    const responseBody = await response.text()
    console.log('[FCM] Response body:', responseBody)

    return response.ok
  } catch (error) {
    console.error('[FCM] Error registering token:', error)
    return false
  }
}

export const setupNotifications = async (apiToken: string): Promise<FcmSetupStatus> => {
  console.log('[FCM] setupNotifications started', FCM_CLIENT_BUILD)

  if (typeof window !== 'undefined' && !('Notification' in window)) {
    console.warn('[FCM] Notifications API not supported')
    return 'unsupported'
  }

  const permissionBefore =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'

  if (permissionBefore === 'denied') {
    console.error('[FCM] Permission denied - user must unblock manually in site settings')
    return 'permission_denied'
  }

  const reloaded = await ensureUnifiedServiceWorker()
  if (reloaded) return 'sw_reload'

  if (!hasRequiredFirebaseConfig()) {
    console.warn('[FCM] setupNotifications omitido por configuración incompleta.')
    return 'config_missing'
  }

  const token = await requestNotificationPermission(apiToken)
  console.log('[FCM] Got token:', token ? `${token.substring(0, 20)}...` : 'null')

  if (token) {
    console.log('[FCM] Registering token with backend...')
    const success = await registerFCMToken(token, apiToken)
    console.log('[FCM] Token registration result:', success ? 'success' : 'failed')
    if (success) {
      console.log('[FCM] Notifications ready')
      return 'success'
    }
    return 'no_token'
  }

  console.warn('[FCM] No token obtained')

  if (typeof window !== 'undefined' && Notification.permission === 'denied') {
    return 'permission_denied'
  }
  if (permissionBefore === 'default' && Notification.permission === 'default') {
    return 'permission_dismissed'
  }
  return 'no_token'
}

export const onMessageListener = () => {
  if (messaging) {
    onMessage(messaging, (payload: unknown) => {
      console.log('[FCM] Foreground message:', payload)

      if (Notification.permission === 'granted') {
        const data = payload as { notification?: { title?: string; body?: string } }
        const title = data.notification?.title
        const body = data.notification?.body
        if (title) {
          new Notification(title, {
            body: body || '',
            icon: '/icon-192x192.png',
          })
        }
      }
    })
  }
}
