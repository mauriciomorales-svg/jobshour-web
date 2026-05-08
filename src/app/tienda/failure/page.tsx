'use client'
export default function TiendaFailure() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900/90 shadow-2xl p-7">
        <div className="text-7xl mb-4">❌</div>
        <h1 className="text-white text-3xl font-black mb-2">Pago rechazado</h1>
        <p className="text-slate-300 text-base mb-2">No se pudo procesar tu pago.</p>
        <p className="text-slate-400 text-sm mb-6">Prueba otro medio o vuelve a intentar en unos minutos.</p>
        <button
          onClick={() => window.history.back()}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-xl font-bold transition"
        >
          Volver a la tienda
        </button>
        <a href="https://jobshours.com" className="inline-block mt-3 text-xs font-bold text-teal-400 hover:underline">
          Ir al inicio
        </a>
      </div>
    </div>
  )
}
