'use client'

import { surfaceCopy } from '@/lib/userFacingCopy'

export function HomeLocationPrompt({
  open,
  user,
  onDismiss,
}: {
  open: boolean
  user: { firstName: string } | null
  onDismiss: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed bottom-20 left-4 right-4 z-[180] animate-slide-up">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-teal-500/10 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-bold">
              {user ? `${user.firstName}, veamos qué hay cerca` : 'Descubre servicios cerca de ti'}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">Compartir tu ubicación nos ayuda a mostrarte oportunidades cercanas</p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        localStorage.setItem('user_lat', String(pos.coords.latitude))
                        localStorage.setItem('user_lng', String(pos.coords.longitude))
                        onDismiss()
                      },
                      (err) => {
                        if (err.code === 1) {
                          const el = document.getElementById('location-denied-msg')
                          if (el) {
                            el.style.display = 'block'
                          }
                        } else {
                          onDismiss()
                        }
                      },
                      { enableHighAccuracy: true, timeout: 10000 }
                    )
                  }
                }}
                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5"
              >
                <span>📍</span> Compartir ubicación
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-2 text-slate-500 text-xs font-semibold hover:text-slate-300 transition"
              >
                Ahora no
              </button>
              <div id="location-denied-msg" style={{ display: 'none' }} className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-amber-400 text-xs font-bold">📵 Permiso denegado</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Ve a <strong className="text-white">Ajustes → Apps → JobsHours → Permisos → Ubicación → Permitir</strong>
                </p>
              </div>
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="text-slate-600 hover:text-slate-400" aria-label={surfaceCopy.close}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
