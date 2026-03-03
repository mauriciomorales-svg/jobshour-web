'use client'
export default function TiendaFailure() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
      <div>
        <div className="text-7xl mb-4">❌</div>
        <h1 className="text-white text-3xl font-black mb-3">Pago rechazado</h1>
        <p className="text-slate-300 text-lg mb-6">No se pudo procesar tu pago. Intenta con otro medio de pago.</p>
        <button onClick={() => window.history.back()} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg">Volver a la tienda</button>
      </div>
    </div>
  )
}
