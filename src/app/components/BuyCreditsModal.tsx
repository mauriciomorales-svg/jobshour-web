'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

interface CreditPack {
  id: string
  credits: number
  price_clp: number
  label: string
}

interface Props {
  onClose: () => void
  currentBalance?: number
}

export default function BuyCreditsModal({ onClose, currentBalance }: Props) {
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/v1/payments/mp/credits-packs')
      .then(r => r.json())
      .then(d => { if (d.packs) setPacks(d.packs) })
      .catch(() => setError('No se pudieron cargar los paquetes'))
      .finally(() => setLoading(false))
  }, [])

  const handleBuy = async (packId: string) => {
    setBuying(packId)
    setError(null)
    try {
      const res = await apiFetch('/api/v1/payments/mp/credits-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      })
      const data = await res.json()
      if (res.ok && data.link) {
        window.open(data.link, '_blank', 'noopener,noreferrer')
      } else {
        setError(data.message ?? 'Error al iniciar el pago')
      }
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setBuying(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-black text-lg">Comprar contactos</h2>
            <p className="text-slate-400 text-xs mt-0.5">Cada crédito te da el teléfono de un profesional</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Balance actual */}
        {currentBalance !== undefined && (
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2.5 mb-5">
            <span className="text-teal-400 text-lg">💳</span>
            <span className="text-teal-300 text-sm font-bold">
              {currentBalance} {currentBalance === 1 ? 'crédito disponible' : 'créditos disponibles'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Packs */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {packs.map(pack => {
              const popular = pack.id === 'pack15'
              const isLoading = buying === pack.id
              return (
                <button
                  key={pack.id}
                  disabled={!!buying}
                  onClick={() => handleBuy(pack.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition active:scale-95 disabled:opacity-60
                    ${popular
                      ? 'bg-teal-500/20 border-teal-400/50 hover:bg-teal-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base
                      ${popular ? 'bg-teal-500 text-white' : 'bg-white/10 text-white'}`}>
                      {pack.credits}
                    </span>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${popular ? 'text-teal-200' : 'text-white'}`}>
                        {pack.label}
                        {popular && <span className="ml-2 text-[10px] bg-teal-400 text-slate-900 font-black px-1.5 py-0.5 rounded-full">★ POPULAR</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        ${(pack.price_clp / pack.credits).toLocaleString('es-CL', { maximumFractionDigits: 0 })} por contacto
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <span className={`font-black text-sm ${popular ? 'text-teal-300' : 'text-white'}`}>
                        ${pack.price_clp.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-5">
          Pago seguro con Mercado Pago · Los créditos no vencen
        </p>
      </div>
    </div>
  )
}
