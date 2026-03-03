'use client'
export default function TiendaPending() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
      <div>
        <div className="text-7xl mb-4">⏳</div>
        <h1 className="text-white text-3xl font-black mb-3">Pago pendiente</h1>
        <p className="text-slate-300 text-lg mb-6">Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
        <a href="https://jobshours.com" className="bg-teal-500 text-white px-8 py-3 rounded-xl font-bold text-lg">Volver a JobsHours</a>
      </div>
    </div>
  )
}
