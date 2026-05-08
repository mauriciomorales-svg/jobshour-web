'use client'
export default function TiendaPending() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900/90 shadow-2xl p-7">
        <div className="text-7xl mb-4">⏳</div>
        <h1 className="text-white text-3xl font-black mb-2">Pago pendiente</h1>
        <p className="text-slate-300 text-base mb-2">Tu pago está siendo procesado.</p>
        <p className="text-slate-400 text-sm mb-6">Te notificaremos cuando se confirme y podrás seguir el estado desde la app.</p>
        <a href="https://jobshours.com" className="inline-block w-full bg-teal-500 hover:bg-teal-400 text-white px-8 py-3 rounded-xl font-bold transition">
          Volver a JobsHours
        </a>
      </div>
    </div>
  )
}
