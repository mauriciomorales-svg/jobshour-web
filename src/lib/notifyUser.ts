/** Toast global opcional; fallback a alert en pantallas sin provider. */
type ToastFn = (
  title: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  body?: string,
) => void

let appToast: ToastFn | null = null

export function registerAppToast(fn: ToastFn | null) {
  appToast = fn
}

export function notifyUser(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  subtitle?: string,
) {
  if (appToast) {
    appToast(message, type, subtitle)
    return
  }
  if (typeof window !== 'undefined') {
    window.alert(message)
  }
}
