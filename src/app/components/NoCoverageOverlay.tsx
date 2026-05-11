'use client'

import { useState } from 'react'
import { getPublicApiBase } from '@/lib/api'

interface Props {
  lat: number
  lng: number
  onDismiss: () => void
  onPublishDemand: () => void
}

type Step = 'initial' | 'form' | 'success'

export default function NoCoverageOverlay({ lat, lng, onDismiss, onPublishDemand }: Props) {
  const [step, setStep] = useState<Step>('initial')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoinWaitlist = async () => {
    if (!email.trim()) {
      setError('Ingresa tu email para continuar.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${getPublicApiBase()}/api/v1/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim() || null,
          lat,
          lng,
        }),
      })
      if (res.ok) {
        setStep('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? 'Algo salió mal. Intenta de nuevo.')
      }
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[300] flex items-end justify-center pointer-events-none">
      {/* Backdrop semitransparente solo en la parte inferior */}
      <div className="pointer-events-auto w-full max-w-md mx-4 mb-24 bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

        {step === 'initial' && (
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📍</span>
                <h3 className="text-white font-semibold text-base leading-tight">
                  Aún no llegamos a tu zona
                </h3>
              </div>
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-white ml-2 text-lg leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              No hay workers activos cerca de ti en este momento.
              Puedes <strong className="text-white">avisar tu demanda igual</strong> — cuando
              llegue un worker a tu zona te notificaremos.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onPublishDemand}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                ✍️ Publicar mi demanda igual
              </button>
              <button
                onClick={() => setStep('form')}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl text-sm transition-colors"
              >
                🔔 Avisarme cuando lleguen workers
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setStep('initial')}
                className="text-gray-400 hover:text-white text-sm"
              >
                ←
              </button>
              <h3 className="text-white font-semibold text-base">
                Te avisamos cuando estemos cerca
              </h3>
            </div>

            <p className="text-gray-400 text-xs mb-4">
              Cuando activemos workers en tu zona te enviamos una notificación. Sin spam.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-gray-300 text-xs mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs mb-1 block">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                onClick={handleJoinWaitlist}
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {loading ? 'Guardando…' : '🔔 Quiero que me avisen'}
              </button>

              <button
                onClick={onDismiss}
                className="text-gray-500 text-xs text-center hover:text-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-5 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-white font-semibold text-base mb-2">
              ¡Listo! Te tenemos en la lista
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              En cuanto haya workers activos en tu zona te avisamos.
              Mientras tanto, puedes publicar tu demanda para que la vean cuando lleguen.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onPublishDemand(); onDismiss() }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                ✍️ Publicar mi demanda igual
              </button>
              <button
                onClick={onDismiss}
                className="text-gray-500 text-xs hover:text-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
