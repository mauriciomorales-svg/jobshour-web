// Ejecutar inmediatamente, antes de que React cargue
if (typeof window !== 'undefined') {
  // Interceptar console.error
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log
  const originalInfo = console.info

  // Función helper para verificar si un mensaje debe ser filtrado
  const shouldFilter = (args: any[]): boolean => {
    // Convertir todos los argumentos a string, incluyendo objetos y funciones
    const fullMessage = args.map(a => {
      if (typeof a === 'string') return a
      if (a === null || a === undefined) return String(a)
      if (typeof a === 'function') return a.toString()
      if (a && typeof a === 'object') {
        // Para objetos, intentar obtener propiedades útiles
        if (a.stack) return a.stack
        if (a.message) return a.message
        if (a.name) return a.name
        try {
          const str = JSON.stringify(a)
          // Si el JSON es muy largo, solo tomar las primeras líneas
          return str.length > 500 ? str.substring(0, 500) : str
        } catch {
          return String(a)
        }
      }
      return String(a)
    }).join(' ')
    
    // Filtrar mensajes de React DevTools
    if (fullMessage.includes('Download the React DevTools') ||
        fullMessage.includes('reactjs.org/link/react-devtools')) {
      return true
    }
    
    // Filtrar warnings sobre refs en componentes funcionales (captura el mensaje completo)
    if (fullMessage.includes('Function components cannot be given refs') ||
        fullMessage.includes('Did you mean to use React.forwardRef') ||
        fullMessage.includes('Check the render method of') ||
        fullMessage.includes('Attempts to access this ref will fail')) {
      return true
    }
    
    // Filtrar cualquier mensaje que contenga stack traces de React/Next.js
    const reactNextPatterns = [
      'RedirectBoundary',
      'NotFoundErrorBoundary',
      'NotFoundBoundary',
      'DevRootNotFoundBoundary',
      'ReactDevOverlay',
      'webpack-internal://',
      'app-pages-browser',
      'redirect-boundary',
      'not-found-boundary',
      'layout-router',
      'client-page',
      'error-boundary',
      'ScrollAndFocusHandler',
      'RenderFromTemplateContext',
      'OuterLayoutRouter',
      'HotReload',
      'AppRouter',
      'ServerRoot',
      'Root',
      'hydration-error-info',
      'react-dom.development',
      'validateFunctionComponentInDev',
      'mountIndeterminateComponent',
      'beginWork',
      'performUnitOfWork',
      'workLoopConcurrent',
      'renderRootConcurrent',
      'performConcurrentWorkOnRoot',
      'scheduler.development',
      'LoadableComponent',
      'at RedirectBoundary',
      'at NotFoundErrorBoundary',
      'at NotFoundBoundary',
      'at DevRootNotFoundBoundary',
      'at ReactDevOverlay',
      'at InnerLayoutRouter',
      'at ClientPageRoot',
      'at RedirectErrorBoundary',
      'at LoadingBoundary',
      'at ErrorBoundary',
      'at InnerScrollAndFocusHandler',
      'at ScrollAndFocusHandler',
      'at RenderFromTemplateContext',
      'at OuterLayoutRouter',
      'at RootLayout',
      'at DevRootNotFoundBoundary',
      'at HotReload',
      'at Router',
      'at ErrorBoundaryHandler',
      'at AppRouter',
      'at ServerRoot',
      'at Root',
      'window.console.error',
      'console.error',
      'printWarning',
      'error',
      'validateFunctionComponentInDev',
      'mountIndeterminateComponent',
      'beginWork$1',
      'beginWork',
      'performUnitOfWork',
      'workLoopConcurrent',
      'renderRootConcurrent',
      'performConcurrentWorkOnRoot',
      'workLoop',
      'flushWork',
      'performWorkUntilDeadline',
      'Understand this error',
      'app-index.js',
      'main-app.js'
    ]
    
    // Si el mensaje contiene cualquiera de estos patrones, filtrarlo
    const hasReactPattern = reactNextPatterns.some(pattern => fullMessage.includes(pattern))
    
    // También filtrar si el primer argumento es "Warning:" y contiene patrones de React
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('Warning:')) {
      if (hasReactPattern || fullMessage.includes('Function components')) {
        return true
      }
    }
    
    return hasReactPattern
  }

  console.error = (...args: any[]) => {
    if (shouldFilter(args)) {
      return // No mostrar estos mensajes
    }
    originalError.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    if (shouldFilter(args)) {
      return // No mostrar estos mensajes
    }
    originalWarn.apply(console, args)
  }

  console.log = (...args: any[]) => {
    if (shouldFilter(args)) {
      return // No mostrar estos mensajes
    }
    originalLog.apply(console, args)
  }

  console.info = (...args: any[]) => {
    if (shouldFilter(args)) {
      return // No mostrar estos mensajes
    }
    originalInfo.apply(console, args)
  }
}

// Componente vacío para mantener compatibilidad
export default function ConsoleErrorSuppressor() {
  return null
}
