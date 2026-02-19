import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Make Pusher available globally for Echo
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher
}

let echoInstance: Echo<any> | null = null
let lastToken: string | null = null

export function getEcho(): Echo<any> {
  if (typeof window === 'undefined') return null as any

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null

  if (echoInstance && token !== lastToken) {
    try {
      ;(echoInstance as any).disconnect?.()
    } catch {
      // ignore
    }
    echoInstance = null
  }

  if (!echoInstance) {
    lastToken = token
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY ?? '9a309a9f35c89457ea2c',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'us2',
      forceTLS: true,
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/broadcasting/auth`,
      auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    })
  }

  return echoInstance
}
