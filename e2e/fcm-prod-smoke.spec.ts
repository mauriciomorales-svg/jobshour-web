import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

function loadFirebaseEnv() {
  const root = path.join(__dirname, '..')
  const env: Record<string, string> = {}
  for (const file of ['.env.production', '.env.local']) {
    const p = path.join(root, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    }
  }
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'jobshours',
    vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
  }
}

const fb = loadFirebaseEnv()

/**
 * Prueba FCM desde el navegador (mismo origen que jobshours.com).
 * PLAYWRIGHT_BASE_URL=https://jobshours.com npx playwright test e2e/fcm-prod-smoke.spec.ts
 */
test('APIs Firebase desde navegador en jobshours.com', async ({ page, context }) => {
  await context.grantPermissions(['notifications'], { origin: 'https://jobshours.com' })

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

  const api = await page.evaluate(async (cfg) => {
    const fid = `pw${Math.random().toString(36).slice(2, 20)}`
    const instRes = await fetch(
      `https://firebaseinstallations.googleapis.com/v1/projects/${cfg.projectId}/installations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': cfg.apiKey },
        body: JSON.stringify({
          fid,
          authVersion: 'FIS_v2',
          appId: cfg.appId,
          sdkVersion: 'w:12.9.0',
        }),
      },
    )
    const instJson = await instRes.json()
    const bearer = instJson.authToken?.token as string | undefined

    let fcmStatus = 0
    let fcmError = ''
    if (bearer) {
      const fcmRes = await fetch(
        `https://fcmregistrations.googleapis.com/v1/projects/${cfg.projectId}/registrations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': cfg.apiKey,
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({
            web: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/playwright-test-endpoint',
              auth: 'dGVzdA',
              p256dh: 'dGVzdA',
              applicationPubKey: cfg.vapidKey || undefined,
            },
          }),
        },
      )
      fcmStatus = fcmRes.status
      const fcmJson = await fcmRes.json().catch(() => ({}))
      fcmError = fcmJson.error?.message || fcmJson.error?.status || ''
    }

    return {
      installStatus: instRes.status,
      installError: instJson.error?.message || '',
      fcmStatus,
      fcmError,
      hasBearer: Boolean(bearer),
    }
  }, fb)

  console.log('\n--- Browser fetch desde jobshours.com ---')
  console.log(JSON.stringify(api, null, 2))

  expect(api.installStatus, 'Installations en browser').toBe(200)
  expect(api.hasBearer, 'Bearer de Installations').toBe(true)

  if (api.fcmStatus === 401) {
    console.log('\nCONCLUSIÓN: 401 en browser → restricción API key (FCM Registration API o referrers HTTP).')
  } else if (api.fcmStatus === 400) {
    console.log('\nCONCLUSIÓN: 400 en browser → API key OK para FCM; fallo del SDK sería otro (SW/VAPID).')
  }

  expect(api.fcmStatus, `FCM no debería ser 401 (got: ${api.fcmError})`).not.toBe(401)
})

test('Firebase SDK getToken en jobshours.com', async ({ page, context }) => {
  await context.grantPermissions(['notifications'], { origin: 'https://jobshours.com' })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Browser.grantPermissions', {
    origin: 'https://jobshours.com',
    permissions: ['notifications'],
  })

  const logs: string[] = []
  page.on('console', (msg) => {
    const t = msg.text()
    if (t.includes('[FCM]') || t.includes('Firebase') || t.includes('messaging')) logs.push(`[${msg.type()}] ${t}`)
  })

  const fcmStatuses: number[] = []
  page.on('response', (res) => {
    if (res.url().includes('fcmregistrations.googleapis.com')) fcmStatuses.push(res.status())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })

  const result = await page.evaluate(async (cfg) => {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js')
    const { getMessaging, getToken, isSupported } = await import(
      'https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging.js'
    )
    const { getInstallations, getId } = await import(
      'https://www.gstatic.com/firebasejs/12.9.0/firebase-installations.js'
    )

    if (!(await isSupported())) return { error: 'not supported' }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { error: 'permission ' + perm }

    const app = initializeApp({
      apiKey: cfg.apiKey,
      authDomain: 'jobshours.firebaseapp.com',
      projectId: cfg.projectId,
      storageBucket: 'jobshours.firebasestorage.app',
      messagingSenderId: '323777995233',
      appId: cfg.appId,
    })

    const fid = await getId(getInstallations(app))
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const reg = await navigator.serviceWorker.getRegistration('/')

    const msg = getMessaging(app)
    try {
      const token = await getToken(msg, {
        vapidKey: cfg.vapidKey,
        serviceWorkerRegistration: reg || undefined,
      })
      return { ok: true, tokenLen: token.length, fid }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string }
      return { ok: false, message: err.message, code: err.code, fid }
    }
  }, fb)

  console.log('\n--- SDK getToken ---')
  console.log(JSON.stringify(result, null, 2))
  console.log('\n--- fcmregistrations HTTP statuses ---', fcmStatuses.join(', ') || 'none')
  logs.forEach((l) => console.log(l))

  if (result.code === 'messaging/permission-blocked') {
    console.log('\nNOTA: Headless bloqueó notificaciones; la prueba "APIs Firebase" ya validó FCM (400, no 401).')
    return
  }

  if (result.ok) {
    console.log('\nCONCLUSIÓN: getToken OK en Playwright → API key y SW bien.')
  } else if (fcmStatuses.includes(401)) {
    console.log('\nCONCLUSIÓN: SDK reproduce 401 → revisar ruta SW en getToken.')
  }

  expect(result.ok, result.message || 'getToken failed').toBeTruthy()
})

test('FCM logs si hay sesión (opcional)', async ({ page, context }) => {
  test.skip(!process.env.PLAYWRIGHT_AUTH_TOKEN, 'Definir PLAYWRIGHT_AUTH_TOKEN para probar con login')

  await context.grantPermissions(['notifications'], { origin: 'https://jobshours.com' })
  const logs: string[] = []
  page.on('console', (msg) => {
    if (msg.text().includes('[FCM]')) logs.push(msg.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token)
  }, process.env.PLAYWRIGHT_AUTH_TOKEN!)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(15000)

  console.log('\n--- FCM logs con token ---')
  logs.forEach((l) => console.log(l))
})
