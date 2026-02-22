import type { Metadata } from 'next'
import './globals.css'
// Importar para ejecutar el script de filtrado inmediatamente
import './console-error-suppressor'

export const metadata: Metadata = {
  title: 'JobsHours | Encuentra expertos cerca de ti en segundos',
  description: 'Conecta con electricistas, gasfíteres, pintores, jardineros y más profesionales cerca de ti. Publica lo que necesitas y recibe ayuda al instante. Renaico, Araucanía, Chile.',
  keywords: ['servicios', 'trabajos', 'expertos', 'Renaico', 'Araucanía', 'Chile', 'electricista', 'gasfíter', 'pintor', 'jardinero', 'plomero', 'trabajos por hora'],
  authors: [{ name: 'JobsHours' }],
  openGraph: {
    title: 'JobsHours | Encuentra expertos cerca de ti',
    description: 'Publica lo que necesitas y conecta con socios verificados en minutos.',
    url: 'https://jobshours.com',
    siteName: 'JobsHours',
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobsHours | Expertos cerca de ti',
    description: 'Conecta con profesionales verificados en tu zona.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://jobshours.com' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JobsHours" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.Capacitor) {
                const originalFetch = window.fetch;
                window.fetch = async function() {
                  let args = Array.prototype.slice.call(arguments);
                  if (typeof args[0] === 'string' && args[0].startsWith('/api/')) {
                    args[0] = 'https://jobshours.com' + args[0];
                  }
                  return originalFetch.apply(this, args);
                };
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                const originalError = console.error;
                const originalWarn = console.warn;
                const originalLog = console.log;
                const originalInfo = console.info;
                
                const shouldFilter = (args) => {
                  const fullMessage = args.map(a => {
                    if (typeof a === 'string') return a;
                    if (a === null || a === undefined) return String(a);
                    if (typeof a === 'function') return a.toString();
                    if (a && typeof a === 'object') {
                      if (a.stack) return a.stack;
                      if (a.message) return a.message;
                      if (a.name) return a.name;
                      try {
                        const str = JSON.stringify(a);
                        return str.length > 500 ? str.substring(0, 500) : str;
                      } catch { return String(a); }
                    }
                    return String(a);
                  }).join(' ');
                  
                  if (fullMessage.includes('Download the React DevTools') ||
                      fullMessage.includes('reactjs.org/link/react-devtools') ||
                      fullMessage.includes('Function components cannot be given refs') ||
                      fullMessage.includes('Did you mean to use React.forwardRef') ||
                      fullMessage.includes('Check the render method of') ||
                      fullMessage.includes('Attempts to access this ref will fail') ||
                      fullMessage.includes('RedirectBoundary') ||
                      fullMessage.includes('NotFoundErrorBoundary') ||
                      fullMessage.includes('NotFoundBoundary') ||
                      fullMessage.includes('DevRootNotFoundBoundary') ||
                      fullMessage.includes('ReactDevOverlay') ||
                      fullMessage.includes('webpack-internal://') ||
                      fullMessage.includes('app-pages-browser') ||
                      fullMessage.includes('app-index.js') ||
                      fullMessage.includes('main-app.js') ||
                      fullMessage.includes('at RedirectBoundary') ||
                      fullMessage.includes('at NotFoundErrorBoundary') ||
                      fullMessage.includes('at ReactDevOverlay') ||
                      fullMessage.includes('at InnerLayoutRouter') ||
                      fullMessage.includes('at ClientPageRoot') ||
                      fullMessage.includes('at RootLayout') ||
                      fullMessage.includes('react-dom.development') ||
                      fullMessage.includes('validateFunctionComponentInDev')) {
                    return true;
                  }
                  
                  if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('Warning:')) {
                    if (fullMessage.includes('Function components') || fullMessage.includes('RedirectBoundary') || fullMessage.includes('NotFoundBoundary')) {
                      return true;
                    }
                  }
                  
                  return false;
                };
                
                console.error = function(...args) { if (!shouldFilter(args)) originalError.apply(console, args); };
                console.warn = function(...args) { if (!shouldFilter(args)) originalWarn.apply(console, args); };
                console.log = function(...args) { if (!shouldFilter(args)) originalLog.apply(console, args); };
                console.info = function(...args) { if (!shouldFilter(args)) originalInfo.apply(console, args); };
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans bg-white">{children}</body>
    </html>
  )
}
