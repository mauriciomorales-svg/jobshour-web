/**
 * Helper para manejar OAuth en Capacitor (abrir navegador externo)
 * y detectar si estamos corriendo en la app nativa
 */

// Detectar si estamos en Capacitor/WebView (app nativa)
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor
}

const BACKEND_URL = 'https://jobshour.dondemorales.cl'

// Abrir URL en navegador externo
export async function openExternalBrowser(url: string): Promise<void> {
  if (typeof window === 'undefined') return

  const absoluteUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`

  if (isCapacitor()) {
    // Usar el plugin nativo OAuthHelperPlugin que abre Chrome Custom Tabs
    const cap = (window as any).Capacitor
    if (cap && cap.Plugins && cap.Plugins.OAuthHelper) {
      await cap.Plugins.OAuthHelper.openExternalBrowser({ url: absoluteUrl })
    } else {
      // Fallback al plugin Browser de Capacitor
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: absoluteUrl })
    }
  } else {
    window.location.href = absoluteUrl
  }
}

// Escuchar cuando el app vuelve al foreground (después de OAuth)
export function onAppResume(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  if (isCapacitor()) {
    let removeListener: () => void = () => {}
    import('@capacitor/app').then(({ App }) => {
      App.addListener('resume', callback).then((listener) => {
        removeListener = listener.remove
      })
    })
    return () => removeListener()
  }

  return () => {}
}
