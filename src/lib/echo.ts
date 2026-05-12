import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Make Pusher available globally for Echo
if (typeof window !== 'undefined') {
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher
}

let echoInstance: Echo<any> | null = null
let lastToken: string | null = null

/**
 * Auth de canales privados: misma API que Sanctum (POST /api/broadcasting/auth).
 * En Capacitor / file: usar URL absoluta desde NEXT_PUBLIC_API_URL.
 */
function getEchoAuthEndpoint(): string {
  const explicit = process.env.NEXT_PUBLIC_ECHO_AUTH_ENDPOINT?.trim()
  if (explicit) return explicit

  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api').replace(/\/$/, '')
    return `${base}/broadcasting/auth`
  }

  return '/api/broadcasting/auth'
}

/**
 * Reverb expone el protocolo Pusher. Si defines NEXT_PUBLIC_REVERB_HOST + NEXT_PUBLIC_REVERB_APP_KEY,
 * el cliente conecta al WebSocket propio; si no, usa Pusher Cloud (cluster).
 */
function useSelfHostedReverb(): boolean {
  const host = process.env.NEXT_PUBLIC_REVERB_HOST?.trim()
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY?.trim()
  return Boolean(host && key)
}

function buildEchoOptions(token: string | null): Record<string, unknown> {
  const authEndpoint = getEchoAuthEndpoint()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  if (useSelfHostedReverb()) {
    const host = process.env.NEXT_PUBLIC_REVERB_HOST!.trim()
    const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY!.trim()
    const scheme = (process.env.NEXT_PUBLIC_REVERB_SCHEME || 'https').toLowerCase()
    const tls = scheme === 'https'
    const port = parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || (tls ? '443' : '80'), 10)

    return {
      broadcaster: 'reverb',
      key,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: tls,
      encrypted: tls,
      enabledTransports: ['ws', 'wss'],
      authEndpoint,
      auth: { headers },
    }
  }

  return {
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY ?? '9a309a9f35c89457ea2c',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'us2',
    forceTLS: true,
    authEndpoint,
    auth: { headers },
  }
}

export function getEcho(): Echo<any> {
  if (typeof window === 'undefined') return null as unknown as Echo<any>

  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('auth_token') || window.localStorage.getItem('token')
      : null

  if (echoInstance && token !== lastToken) {
    try {
      ;(echoInstance as { disconnect?: () => void }).disconnect?.()
    } catch {
      // ignore
    }
    echoInstance = null
  }

  if (!echoInstance) {
    lastToken = token
    echoInstance = new Echo(buildEchoOptions(token) as never)
  }

  return echoInstance
}
