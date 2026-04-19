'use client'

import { useState } from 'react'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

interface Props {
  creditsBalance: number
  isPioneer: boolean
  userName: string
}

export default function CreditsWidget({ creditsBalance, isPioneer, userName }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="group relative px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {isPioneer ? (
          <>
            <span className="text-2xl relative z-10 animate-pulse">👑</span>
            <span className="text-white font-black text-xs relative z-10">PIONERO</span>
          </>
        ) : (
          <>
            <span className="text-xl relative z-10">💎</span>
            <span className="text-white font-black text-sm relative z-10">{creditsBalance}</span>
          </>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden animate-scale-in">
            {/* Header con gradiente premium */}
            <div className={uiTone.authHeader}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {isPioneer ? (
                    <span className="text-4xl animate-pulse">👑</span>
                  ) : (
                    <span className="text-4xl">💎</span>
                  )}
                </div>
                <h3 className="text-white text-xl font-black text-center">
                  {isPioneer ? surfaceCopy.creditsPioneerUser : surfaceCopy.creditsMyBalance}
                </h3>
                <p className="text-white/80 text-xs text-center mt-1">
                  {isPioneer ? `Hola ${userName.split(' ')[0]}` : surfaceCopy.creditsManageHint}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {isPioneer ? (
                <>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">👑</span>
                      </div>
                      <div>
                        <p className="text-amber-900 font-black text-lg">Acceso Premium</p>
                        <p className="text-amber-700 text-xs">{surfaceCopy.creditsPioneerUser}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-amber-800 text-sm font-semibold">Contactos ilimitados</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-amber-800 text-sm font-semibold">Sin cargos mensuales</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-amber-800 text-sm font-semibold">Soporte prioritario</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${uiTone.surfaceInfoMuted} mt-4`}>
                    <p className="text-slate-800 text-xs leading-relaxed">
                      <strong>¡Gracias por ser pionero!</strong> Estás ayudando a construir la mejor plataforma de servicios de Chile. Tu acceso premium es <strong>de por vida</strong>.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-4`}>
                    <div className="text-center mb-4">
                      <p className="text-slate-500 text-xs uppercase font-semibold mb-2">Tu Saldo</p>
                      <p className={uiTone.creditsBalanceHero}>
                        {creditsBalance}
                      </p>
                      <p className="text-slate-600 text-sm font-semibold mt-1">créditos disponibles</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-slate-600 text-xs">
                        <strong>1 crédito</strong> = 1 contacto revelado
                      </p>
                    </div>
                  </div>

                  {/* Planes */}
                  <div className="space-y-3 mb-4">
                    <p className="text-slate-700 font-bold text-sm">Planes Disponibles</p>
                    
                    {/* Plan Básico */}
                    <div className="border-2 border-slate-200 rounded-xl p-4 hover:border-amber-400 transition cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-slate-800">Plan Básico</p>
                          <p className="text-slate-500 text-xs">10 créditos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-amber-700">$4.990</p>
                          <p className="text-[10px] text-slate-400">$499/crédito</p>
                        </div>
                      </div>
                    </div>

                    {/* Plan Pro */}
                    <div className={uiTone.creditsPlanFeatured}>
                      <div className={uiTone.creditsPopularBadge}>
                        POPULAR
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-slate-800">Plan Pro</p>
                          <p className="text-slate-600 text-xs">30 créditos</p>
                        </div>
                        <div className="text-right">
                          <p className={uiTone.creditsPriceFeatured}>$9.990</p>
                          <p className="text-[10px] text-teal-700 font-bold">$333/crédito • 33% OFF</p>
                        </div>
                      </div>
                    </div>

                    {/* Plan Empresa */}
                    <div className="border-2 border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-slate-800">Plan Empresa</p>
                          <p className="text-slate-600 text-xs">100 créditos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-800">$24.990</p>
                          <p className="text-[10px] text-teal-700 font-bold">$250/crédito • 50% OFF</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-800 text-xs leading-relaxed">
                      💡 <strong>Tip:</strong> Los créditos no expiran y puedes usarlos cuando quieras.
                    </p>
                  </div>
                </>
              )}

              {/* Button */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={uiTone.modalCreditsClose}
              >
                {surfaceCopy.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
