'use client'

import type { Dispatch, SetStateAction } from 'react'
import { feedbackCopy, navCopy, surfaceCopy } from '@/lib/userFacingCopy'

export type HomeSidebarUser = {
  id: number
  name: string
  firstName: string
  avatarUrl: string | null
  provider: string
  token: string
}

type ToastFn = (title: string, type?: 'info' | 'success' | 'error' | 'warning', body?: string) => void
type WorkerState = 'guest' | 'inactive' | 'intermediate' | 'active'

export function HomeSidebar({
  open,
  onClose,
  user,
  workerStatus,
  workerProfile,
  setUser,
  toast,
  onGoProfile,
  onGoJobs,
  onTryPublishDemand,
  onOpenCategoryManagement,
  onOpenStoreOrders,
  onOpenWorkerQuotes,
  onOpenChatHistory,
  onOpenFriends,
  onOpenVerificationCard,
  onResetMap,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  user: HomeSidebarUser | null
  workerStatus: WorkerState
  workerProfile: { id?: number } | null
  setUser: Dispatch<SetStateAction<HomeSidebarUser | null>>
  toast: ToastFn
  onGoProfile: () => void
  onGoJobs: () => void
  onTryPublishDemand: () => void
  onOpenCategoryManagement: () => void
  onOpenStoreOrders: () => void
  onOpenWorkerQuotes: () => void
  onOpenChatHistory: () => void
  onOpenFriends: () => void
  onOpenVerificationCard: () => void
  onResetMap: () => void
  onLogout: () => void
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] transition-opacity" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-80 bg-slate-900 z-[201] shadow-2xl overflow-y-auto animate-slide-in-left border-r border-slate-800">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 py-3 z-10 flex items-center justify-between">
          <div className="flex items-baseline font-black tracking-tighter text-lg">
            <span className="text-white">J</span>
            <div className="relative mx-[1px] inline-flex h-[14px] w-[14px] -translate-y-[2px] align-baseline items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-teal-400" />
              <div
                className="absolute h-1/2 w-[1.5px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300"
                style={{ bottom: '50%', animation: 'spin 3s linear infinite' }}
              />
              <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400" />
            </div>
            <span className="text-white">bs</span>
            <span className="text-teal-400 ml-0.5">H</span>
            <div className="relative mx-[1px] inline-flex h-[14px] w-[14px] -translate-y-[2px] align-baseline items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-teal-400" />
              <div
                className="absolute h-1/2 w-[1.5px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300"
                style={{ bottom: '50%', animation: 'spin 3s linear infinite', animationDelay: '0.5s' }}
              />
              <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400" />
            </div>
            <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">urs</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 transition rounded-lg hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-0">
          {user ? (
            <div>
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-5 py-5 border-b border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        className="w-14 h-14 rounded-full object-cover border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                        alt={user.firstName}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                        <span className="text-white text-xl font-black">{user.firstName.charAt(0)}</span>
                      </div>
                    )}
                    <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                          if (!token) return
                          const fd = new FormData()
                          fd.append('avatar', file)
                          try {
                            const res = await fetch('https://jobshours.com/api/v1/profile/avatar', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd,
                            })
                            const data = await res.json()
                            if (data.avatar_url) {
                              setUser((prev) => (prev ? { ...prev, avatarUrl: data.avatar_url } : prev))
                              toast('Foto actualizada', 'success')
                            }
                          } catch {
                            toast('Error al subir foto', 'error')
                          }
                        }}
                      />
                    </label>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-slate-800 rounded-full ${
                        workerStatus === 'active' ? 'bg-teal-400' : workerStatus === 'intermediate' ? 'bg-amber-400' : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{user.name}</p>
                    <p className="text-xs font-semibold text-amber-400/80">
                      {workerStatus === 'active' ? 'Disp. Inmediata' : workerStatus === 'intermediate' ? 'Disp. Flexible' : 'Inactivo'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">{navCopy.sectionPrincipal}</p>

                <button type="button" onClick={onGoProfile} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                    <svg className="w-5 h-5 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.myProfile}</span>
                </button>

                <button type="button" onClick={onGoJobs} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.myJobs}</span>
                </button>

                <button type="button" onClick={onTryPublishDemand} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center group-hover:bg-amber-500/25 transition">
                    <span className="text-lg">💰</span>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.publishDemand}</span>
                </button>

                <button type="button" onClick={onOpenCategoryManagement} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.myCategories}</span>
                </button>

                <a
                  href={user ? `/tienda/${workerProfile?.id ?? ''}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                >
                  <div className="w-9 h-9 bg-orange-500/15 rounded-lg flex items-center justify-center group-hover:bg-orange-500/25 transition">
                    <span className="text-lg">🛒</span>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.myStore}</span>
                </a>

                {workerProfile && (
                  <>
                    <button type="button" onClick={onOpenStoreOrders} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                      <div className="w-9 h-9 bg-orange-500/15 rounded-lg flex items-center justify-center group-hover:bg-orange-500/25 transition">
                        <span className="text-lg">📦</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{surfaceCopy.navMyOrders}</span>
                    </button>
                    <button type="button" onClick={onOpenWorkerQuotes} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                      <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                        <span className="text-lg">📄</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{surfaceCopy.navMyQuotes}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="h-px bg-slate-800 mx-5" />

              <div className="px-4 py-3 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">{navCopy.sectionSocial}</p>

                <button type="button" onClick={onOpenChatHistory} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">{navCopy.conversations}</span>
                </button>

                <button type="button" onClick={onOpenFriends} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition">
                    <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  </div>
                  <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">{navCopy.myFriends}</span>
                </button>

                <button type="button" onClick={onOpenVerificationCard} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group">
                  <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">{navCopy.myCard}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const { setupNotifications } = await import('@/lib/firebase')
                    const token = localStorage.getItem('auth_token')
                    if (token) {
                      await setupNotifications(token)
                      alert(feedbackCopy.notificationsEnabled)
                    } else {
                      alert(feedbackCopy.mustLoginFirst)
                    }
                    onClose()
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                >
                  <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center group-hover:bg-amber-500/25 transition">
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                  </div>
                  <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">{navCopy.notifications}</span>
                </button>
              </div>

              <div className="h-px bg-slate-800 mx-5" />

              <div className="px-4 py-3 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const url = 'https://jobshours.com'
                    const text = '¡Encuentra servicios cerca de ti en JobsHours! 🔧⚡'
                    if (navigator.share) {
                      void navigator.share({ title: 'JobsHours', text, url })
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
                    }
                    onClose()
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                >
                  <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">{navCopy.shareApp}</span>
                </button>

                <button type="button" onClick={onResetMap} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-amber-500/10 rounded-xl transition group">
                  <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center group-hover:bg-amber-500/25 transition">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-amber-400 text-sm font-semibold group-hover:text-amber-300 transition">{navCopy.resetMapLocation}</span>
                </button>

                <button type="button" onClick={onLogout} className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-red-500/10 rounded-xl transition group">
                  <div className="w-9 h-9 bg-red-500/15 rounded-lg flex items-center justify-center group-hover:bg-red-500/25 transition">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-red-400 text-sm font-semibold group-hover:text-red-300 transition">{navCopy.logout}</span>
                </button>
              </div>

              <div className="mx-5 mb-4 bg-teal-500/5 border border-teal-500/20 rounded-xl p-3 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-[10px] text-teal-500/80 font-semibold">Conexión segura · SSL activo</p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-6 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{navCopy.loginSection}</p>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault()
                  const { openExternalBrowser } = await import('@/lib/capacitor')
                  const { Capacitor } = await import('@capacitor/core')
                  const isNative = Capacitor.isNativePlatform()
                  const url = isNative ? 'https://jobshours.com/api/auth/google?mobile=true' : 'https://jobshours.com/api/auth/google'
                  await openExternalBrowser(url)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-sm text-slate-300 font-semibold transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continuar con Google</span>
              </button>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-5 py-3">
          <p className="text-[10px] text-slate-600 font-semibold">jobshours.com</p>
        </div>
      </div>
    </>
  )
}
