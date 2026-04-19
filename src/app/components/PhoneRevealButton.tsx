'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState, useEffect } from 'react'

interface Props {
  workerId: number
  phone: string
  phoneRevealed: boolean
  userToken: string | null
  isPioneer?: boolean
  creditsBalance?: number
}

export default function PhoneRevealButton({ workerId, phone, phoneRevealed, userToken, isPioneer, creditsBalance }: Props) {
  const [revealed, setRevealed] = useState(phoneRevealed)
  const [realPhone, setRealPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userToken) return
    // Check if already revealed
    fetch(`/api/v1/contact/check/${workerId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.revealed) {
          setRevealed(true)
          // Fetch real phone
          fetch(`/api/v1/contact/reveal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({ worker_id: workerId })
          })
            .then(r => r.json())
            .then(data => setRealPhone(data.phone))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [workerId, userToken])

  const handleReveal = async () => {
    if (!userToken) {
      setError(feedbackCopy.mustLoginFirst)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const r = await fetch('/api/v1/contact/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ worker_id: workerId })
      })

      const data = await r.json()

      if (r.status === 402) {
        setError('Sin créditos. Adquiere un plan para continuar.')
        setShowModal(false)
        setLoading(false)
        return
      }

      if (r.ok) {
        setRealPhone(data.phone)
        setRevealed(true)
        setShowModal(false)
      } else {
        setError(data.message || 'Error al revelar contacto')
      }
    } catch (err) {
      setError(feedbackCopy.networkError)
    }
    setLoading(false)
  }

  if (revealed && realPhone) {
    return (
      <a
        href={`tel:${realPhone}`}
        className={uiTone.ctaPhoneCall}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <svg className="w-4 h-4 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span className="text-white font-bold text-xs relative z-10">{realPhone}</span>
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={uiTone.ctaRevealPhone}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <svg className="w-4 h-4 text-white relative z-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-white font-bold text-xs relative z-10">{surfaceCopy.revealPhoneCta}</span>
        {!isPioneer && creditsBalance !== undefined && (
          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full text-white font-bold relative z-10">
            {creditsBalance} 💎
          </span>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-sm mx-4 overflow-hidden animate-scale-in">
            {/* Header con gradiente */}
            <div className={uiTone.authHeader}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-white text-xl font-black text-center capitalize">{surfaceCopy.revealContactTitle}</h3>
                <p className="text-white/80 text-xs text-center mt-1">{surfaceCopy.revealContactSubtitle}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-600 text-sm font-semibold">❌ {error}</p>
                </div>
              ) : isPioneer ? (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👑</span>
                    <p className="text-amber-900 font-bold text-sm">{surfaceCopy.creditsPioneerUser}</p>
                  </div>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    Como pionero, puedes revelar contactos <strong>ilimitadamente gratis</strong>. ¡Disfruta tu acceso premium!
                  </p>
                </div>
              ) : (
                <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uiTone.avatarPlaceholderRing}`}>
                        <span className="text-white text-lg">💎</span>
                      </div>
                      <div>
                        <p className="text-slate-800 font-bold text-sm">Costo</p>
                        <p className="text-slate-500 text-xs">1 crédito</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Tu saldo</p>
                      <p className={uiTone.creditsBalanceHero}>
                        {creditsBalance}
                      </p>
                    </div>
                  </div>
                  {(creditsBalance ?? 0) < 1 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-red-600 text-xs font-semibold">⚠️ Sin créditos suficientes</p>
                      <p className="text-red-500 text-[10px] mt-1">Adquiere un plan para continuar</p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-slate-600 text-xs leading-relaxed">
                  Al revelar el contacto, podrás <strong>llamar directamente</strong> al trabajador para coordinar el servicio.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={uiTone.modalCancelLight}
                >
                  {surfaceCopy.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={loading || (!isPioneer && (creditsBalance ?? 0) < 1)}
                  className={uiTone.ctaRating}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{surfaceCopy.revealingPhone}</span>
                    </>
                  ) : (
                    surfaceCopy.revealNow
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
