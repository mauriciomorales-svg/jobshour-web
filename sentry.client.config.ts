import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

// Solo inicializar si hay DSN configurado (dev sin DSN = sin Sentry)
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Captura el 10% de sesiones para performance (aumentar en producción)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // Captura el 100% de sesiones con errores para replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignorar errores conocidos de ruido (no son bugs reales)
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
      'Non-Error promise rejection',
      'AbortError',
      'Network request failed',
      /^Loading chunk \d+ failed/,
    ],
  })
}
