'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jobshours.com/api'

function SuccessContent() {
  const params = useSearchParams()
  const orderId = params.get('external_reference')
  const confirmationCode = params.get('confirmation_code')

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (code.length !== 4) { setError('Ingresa el código de 4 dígitos'); return }
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API_BASE}/v1/store/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await r.json()
      if (r.ok) setConfirmed(true)
      else setError(data.message || 'Código incorrecto')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  if (confirmed) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
      <div>
        <div className="text-7xl mb-4">🎉</div>
        <h1 className="text-white text-3xl font-black mb-3">¡Compra completada!</h1>
        <p className="text-slate-300 text-lg mb-6">El pago fue liberado al vendedor. ¡Gracias por usar JobsHours!</p>
        <a href="https://jobshours.com" className="bg-teal-500 text-white px-8 py-3 rounded-xl font-bold text-lg">Volver a JobsHours</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-7xl mb-4">✅</div>
        <h1 className="text-white text-3xl font-black mb-2">¡Pago aprobado!</h1>
        <p className="text-slate-300 mb-1">Tu código de confirmación es:</p>
        <div className="text-5xl font-black text-teal-400 tracking-widest my-4">{confirmationCode || '----'}</div>
        <p className="text-slate-400 text-sm mb-8">Cuando recibas el producto, ingresa el código para liberar el pago al vendedor.</p>

        <div className="bg-slate-800 rounded-2xl p-6">
          <p className="text-white font-bold mb-3">¿Ya recibiste el producto?</p>
          <input
            type="text"
            maxLength={4}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Código de 4 dígitos"
            className="w-full bg-slate-700 text-white text-center text-2xl tracking-widest rounded-xl px-4 py-3 mb-3 outline-none border border-slate-600 focus:border-teal-400"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={loading || code.length !== 4}
            className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-lg transition"
          >
            {loading ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TiendaSuccess() {
  return <Suspense><SuccessContent /></Suspense>
}
