/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async rewrites() {
    // El rewrite funciona tanto en servidor como en cliente
    // En producción, el servidor debe estar accesible en el puerto 8095
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
}

module.exports = nextConfig
