/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_EXPORT === 'true'

const nextConfig = {
  // Para Capacitor/Android se exporta como archivos estáticos
  ...(isExport ? { output: 'export' } : {}),
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
          destination: 'http://localhost:8095/api/:path*',
        },
        {
          source: '/broadcasting/auth',
          destination: 'http://localhost:8095/broadcasting_auth.php',
        },
        {
          source: '/take_demand.php',
          destination: 'http://localhost:8095/take_demand.php',
        },
        {
          source: '/cancel_request.php',
          destination: 'http://localhost:8095/cancel_request.php',
        },
      ]
    },
  } : {}),
}

module.exports = nextConfig
