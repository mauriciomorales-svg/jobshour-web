/**
 * Diagnóstico FCM / API key (ejecutar: node scripts/test-fcm-api.mjs)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const env = {}
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
  return env
}

const env = loadEnv()
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'jobshours'
const appId = env.NEXT_PUBLIC_FIREBASE_APP_ID
const vapidKey = env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

if (!apiKey) {
  console.error('Falta NEXT_PUBLIC_FIREBASE_API_KEY en .env.local')
  process.exit(1)
}

const results = []

async function req(label, url, options = {}) {
  const headers = { ...(options.headers || {}) }
  try {
    const res = await fetch(url, { ...options, headers })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* ignore */
    }
    const ok = res.status >= 200 && res.status < 300
    results.push({ label, ok, status: res.status, json, text: text.slice(0, 300) })
    return { res, json, text }
  } catch (e) {
    results.push({ label, ok: false, error: String(e) })
    return null
  }
}

console.log('=== FCM API diagnostic ===')
console.log('projectId:', projectId)
console.log('apiKey suffix:', apiKey.slice(-6))
console.log('appId:', appId?.slice(0, 20) + '...')
console.log('')

// 1) Installations
const fid = `test-${Date.now().toString(36)}${'x'.repeat(12)}`.slice(0, 22)
const instBody = {
  fid,
  authVersion: 'FIS_v2',
  appId,
  sdkVersion: 'w:12.9.0',
}

const inst = await req('Installations (create)', `https://firebaseinstallations.googleapis.com/v1/projects/${projectId}/installations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
  body: JSON.stringify(instBody),
})

let bearer = inst?.json?.authToken?.token

// 2) FCM Registration — sin Bearer (solo API key)
await req('FCM Registration (solo API key)', `https://fcmregistrations.googleapis.com/v1/projects/${projectId}/registrations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
  body: '{}',
})

// 3) FCM Registration — con Bearer de Installations
if (bearer) {
  await req('FCM Registration (API key + Bearer)', `https://fcmregistrations.googleapis.com/v1/projects/${projectId}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      web: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint-for-test',
        auth: 'fake-auth',
        p256dh: 'fake-p256dh',
        applicationPubKey: vapidKey || undefined,
      },
    }),
  })
} else {
  results.push({ label: 'FCM Registration (API key + Bearer)', ok: false, error: 'No bearer from Installations' })
}

// 4) Simular referrer de sitio (como navegador en página)
await req('Installations (Referer jobshours)', `https://firebaseinstallations.googleapis.com/v1/projects/${projectId}/installations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    Referer: 'https://jobshours.com/',
  },
  body: JSON.stringify({ ...instBody, fid: `ref-${fid}`.slice(0, 22) }),
})

// 5) API discovery — key válida
await req('API key válida (discovery)', `https://www.googleapis.com/discovery/v1/apis?key=${apiKey}&fields=kind`, {
  method: 'GET',
})

// 6) Assets producción
for (const asset of ['/sw.js', '/sw-register.js', '/sw-fcm.generated.js']) {
  await req(`GET jobshours.com${asset}`, `https://jobshours.com${asset}`, { method: 'GET' })
}

console.log('\n=== Resultados ===\n')
for (const r of results) {
  const icon = r.ok ? 'OK' : 'FAIL'
  const status = r.status != null ? ` HTTP ${r.status}` : ''
  const err = r.error || (r.json?.error?.message ?? r.text ?? '')
  console.log(`${icon}  ${r.label}${status}`)
  if (!r.ok && err) console.log(`     → ${String(err).slice(0, 200)}`)
}

const instOk = results.find((r) => r.label.startsWith('Installations (create)'))?.ok
const fcmBearer = results.find((r) => r.label.includes('Bearer'))?.status
const fcmKeyOnly = results.find((r) => r.label.includes('solo API key'))?.status

console.log('\n=== Interpretación ===')
if (instOk && fcmBearer === 401) {
  console.log('Installations OK pero FCM con Bearer → 401: revisar "FCM Registration API" en restricciones de API de la clave.')
} else if (instOk && fcmBearer === 400) {
  console.log('Installations OK y FCM con Bearer → 400: la API key acepta FCM Registration (auth OK). El fallo en browser sería otro (SDK/SW/bloqueador).')
} else if (instOk && fcmKeyOnly === 401) {
  console.log('FCM sin Bearer → 401 es esperado; el SDK debe enviar Bearer desde Installations.')
}
if (results.some((r) => r.json?.error?.details?.[0]?.reason === 'API_KEY_HTTP_REFERRER_BLOCKED')) {
  console.log('API_KEY_HTTP_REFERRER_BLOCKED detectado en alguna respuesta.')
}
if (results.some((r) => r.text?.includes('API_KEY_SERVICE_BLOCKED') || r.json?.error?.message?.includes('blocked'))) {
  console.log('API bloqueada para esta clave — agregar FCM Registration API en restricciones.')
}
