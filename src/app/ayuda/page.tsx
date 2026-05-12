import type { Metadata } from 'next'
import Link from 'next/link'
import LegalSupportLinks from '@/app/components/LegalSupportLinks'

export const metadata: Metadata = {
  title: 'Ayuda y soporte | JobsHours',
  description:
    'Pagos, pedidos de tienda, trabajos en el mapa y cómo contactarnos. JobsHours Chile.',
}

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black tracking-tight">Centro de ayuda</h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Respuestas rápidas para compradores y trabajadores. Si no resuelves aquí, escríbenos desde el enlace de
            contacto al final.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-16">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-2">Pagos y tienda</h2>
          <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5 leading-relaxed">
            <li>Tras pagar en Mercado Pago, vuelve a la app: verás éxito, pendiente o rechazo según el estado.</li>
            <li>
              Los montos en la app son los del pedido. Si tu banco muestra otro importe o nombre de comercio, puede
              haber comisiones o cómo figure MP; guarda el comprobante.
            </li>
            <li>
              Cuando el pago queda confirmado, deberías recibir un correo con el resumen y el enlace al detalle del
              pedido (si el servidor de correo está configurado).
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-2">Trabajos en el mapa</h2>
          <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5 leading-relaxed">
            <li>Activa ubicación y categorías para ver expertos cerca.</li>
            <li>Desde tu perfil puedes revisar ganancias, tienda y mis trabajos según lo que tengas habilitado.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-2">Estado del servicio</h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            Tu equipo puede monitorizar la API (incluye base de datos, cola, etc.) y un ping ligero:
          </p>
          <ul className="text-sm text-slate-700 space-y-1 font-mono bg-slate-100 rounded-xl p-3">
            <li>
              <code className="break-all">GET /api/v1/health</code> — chequeo completo (503 si degradado)
            </li>
            <li>
              <code className="break-all">GET /api/v1/health/ping</code> — solo confirma que la app responde (200)
            </li>
            <li>
              <code className="break-all">GET /api/health</code> — salud del front Next (mismo dominio)
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition"
          >
            Ir al mapa
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border-2 border-slate-300 text-slate-800 text-sm font-bold hover:bg-slate-100 transition"
          >
            Landing
          </Link>
        </div>

        <footer className="text-center pt-6 border-t border-slate-200">
          <LegalSupportLinks variant="light" showHelpLink={false} className="text-[12px]" />
        </footer>
      </main>
    </div>
  )
}
