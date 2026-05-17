/**
 * Genera public/sw-fcm.generated.js e inyecta en public/sw.js.
 * Un solo service worker (/sw.js) evita conflicto con layout.tsx + FCM.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const FCM_START = '// @fcm-auto-start'
const FCM_END = '// @fcm-auto-end'

function loadEnvFile(filename) {
  const filePath = path.join(root, filename)
  const out = {}
  if (!fs.existsSync(filePath)) return out
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const firebaseVersion = (pkg.dependencies?.firebase || '12.9.0').replace(/^[\^~]/, '')

const env = {
  ...loadEnvFile('.env.production'),
  ...loadEnvFile('.env.local'),
}

const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
]

const missing = required.filter((k) => !env[k])
if (missing.length > 0) {
  console.warn('[generate-firebase-sw] Sin variables Firebase:', missing.join(', '))
  process.exit(0)
}

const esc = (s) => JSON.stringify(s)

const fcmModule = `// Auto-generated — Firebase ${firebaseVersion}, project ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
importScripts('https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: ${esc(env.NEXT_PUBLIC_FIREBASE_API_KEY)},
  authDomain: ${esc(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)},
  projectId: ${esc(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)},
  storageBucket: ${esc(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)},
  messagingSenderId: ${esc(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)},
  appId: ${esc(env.NEXT_PUBLIC_FIREBASE_APP_ID)},
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW-FCM] background message:', payload);
  const notificationTitle = payload.notification?.title || 'Jobshours';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const defaultUrl = '/';
  const requestId = data.request_id || data.requestId || data.service_request_id || data.serviceRequestId;
  let urlToOpen = data.url || defaultUrl;
  if ((!urlToOpen || urlToOpen === defaultUrl) && requestId) {
    urlToOpen = \`/?request_id=\${encodeURIComponent(requestId)}&open_chat=1\`;
  }
  const absoluteUrlToOpen = new URL(urlToOpen, self.location.origin).toString();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        try {
          windowClients[i].postMessage({
            type: 'DEEPLINK_OPEN_CHAT',
            url: absoluteUrlToOpen,
            data,
          });
        } catch (e) {}
      }
      const clientToFocus =
        windowClients.find((c) => typeof c.url === 'string' && c.url.startsWith(self.location.origin)) ||
        windowClients[0];
      if (clientToFocus && 'focus' in clientToFocus) return clientToFocus.focus();
      if (clients.openWindow) return clients.openWindow(absoluteUrlToOpen);
    }),
  );
});
`

const fcmPath = path.join(root, 'public', 'sw-fcm.generated.js')
fs.writeFileSync(fcmPath, fcmModule, 'utf8')

const swInject = `${FCM_START}
importScripts('/sw-fcm.generated.js');
${FCM_END}`

const swPath = path.join(root, 'public', 'sw.js')
let swSource = fs.readFileSync(swPath, 'utf8')
if (swSource.includes(FCM_START) && swSource.includes(FCM_END)) {
  const re = new RegExp(`${FCM_START}[\\s\\S]*?${FCM_END}`)
  swSource = swSource.replace(re, swInject)
} else {
  swSource = `${swSource.trim()}\n\n${swInject}\n`
}
fs.writeFileSync(swPath, swSource, 'utf8')

// Legacy URL: mismo módulo FCM (sin segundo SW con scope /)
const legacyPath = path.join(root, 'public', 'firebase-messaging-sw.js')
fs.writeFileSync(
  legacyPath,
  `// Legacy alias — usa el mismo módulo que /sw.js\nimportScripts('/sw-fcm.generated.js');\n`,
  'utf8',
)

console.log(`[generate-firebase-sw] OK → ${fcmPath}, ${swPath}, ${legacyPath}`)
