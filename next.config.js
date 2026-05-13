const path = require('path')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
const { withSentryConfig } = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? require('@sentry/nextjs')
  : { withSentryConfig: (c) => c }

/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true'

/**
 * Rewrites internos (solo servidor Next). En el VPS deben apuntar a donde escuchan
 * la API Laravel y el servicio de inventario (mismo host suele ser 127.0.0.1).
 * Definí INTERNAL_* en el entorno del build (`npm run build`) o en `.env.production`.
 */
const internalApiOrigin = (process.env.INTERNAL_API_ORIGIN || 'http://127.0.0.1:8095').replace(/\/$/, '')
const internalInventarioOrigin = (process.env.INTERNAL_INVENTARIO_ORIGIN || 'http://127.0.0.1:8003').replace(
  /\/$/,
  '',
)

const nextConfig = {
  // Asegura @/ → src/ en webpack (evita fallos de resolución en Linux / CI)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },
  // Para Capacitor/Android se exporta como archivos estáticos
  ...(isExport ? { output: 'export', distDir: '.next-android' } : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  // Los rewrites solo aplican en modo servidor (no en export estático)
  ...(!isExport ? {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${internalApiOrigin}/api/:path*`,
        },
        {
          source: '/broadcasting/auth',
          destination: `${internalApiOrigin}/broadcasting_auth.php`,
        },
        {
          source: '/cancel_demand.php',
          destination: `${internalApiOrigin}/cancel_demand.php`,
        },
        {
          source: '/inventario/:path*',
          destination: `${internalInventarioOrigin}/api/:path*`,
        },
        {
          source: '/cancel_request.php',
          destination: `${internalApiOrigin}/cancel_request.php`,
        },
        {
          source: '/take_demand.php',
          destination: `${internalApiOrigin}/take_demand.php`,
        },
      ]
    },
  } : {}),
}

const sentryWebpackPluginOptions = {
  // Solo subir source maps si hay auth token configurado
  silent: !process.env.SENTRY_AUTH_TOKEN,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG ?? 'jobshours',
  project: process.env.SENTRY_PROJECT ?? 'jobshours-web',
}

module.exports = withBundleAnalyzer(
  withSentryConfig(nextConfig, sentryWebpackPluginOptions)
)
