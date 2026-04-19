'use client'

import type { Dispatch, SetStateAction } from 'react'
import dynamic from 'next/dynamic'
import { getPublicApiBase } from '@/lib/api'
import { feedbackCopy } from '@/lib/userFacingCopy'
import type { ExpertDetail } from './HomeWorkerDetailSheet'
import type { MapPoint } from './MapSection'

const DashboardFeed = dynamic(() => import('./DashboardFeed'), { ssr: false })

type ToastFn = (title: string, type?: 'info' | 'success' | 'error' | 'warning', body?: string) => void
type CheckAuth = () => { canInteract: boolean; reason?: 'login' | 'profile' }
type SetPoints = Dispatch<SetStateAction<MapPoint[]>>

export function HomeDashboardPanel({
  hidden,
  userLat,
  userLng,
  currentUserId,
  highlightedRequestId,
  onClose,
  onRefreshMapAndFeed,
  setHighlightedRequestId,
  setSelectedDetail,
  setShowRequestModal,
  setDashHidden,
  setShowLoginModal,
  setShowOnboarding,
  setActiveRequestId,
  setChatContext,
  setShowChat,
  setPoints,
  fetchNearby,
  checkAuthAndProfile,
  toast,
}: {
  hidden: boolean
  userLat: number
  userLng: number
  currentUserId?: number
  highlightedRequestId: number | null
  onClose: () => void
  onRefreshMapAndFeed: () => void
  setHighlightedRequestId: (id: number | null) => void
  setSelectedDetail: (d: ExpertDetail | null) => void
  setShowRequestModal: (v: boolean) => void
  setDashHidden: (v: boolean) => void
  setShowLoginModal: (v: boolean) => void
  setShowOnboarding: (v: boolean) => void
  setActiveRequestId: (id: number | null) => void
  setChatContext: Dispatch<
    SetStateAction<{ description?: string; name?: string; avatar?: string | null; myRole?: 'cliente' | 'trabajador'; isSelf?: boolean }>
  >
  setShowChat: (v: boolean) => void
  setPoints: SetPoints
  fetchNearby: (categoryId?: number | null) => void
  checkAuthAndProfile: CheckAuth
  toast: ToastFn
}) {
  return (
    <div
      className={`fixed inset-0 z-[150] transition-all duration-500 ease-out ${
        hidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      <div className="bg-slate-900 h-full w-full overflow-hidden flex flex-col shadow-2xl">
        <div className="sticky top-0 bg-slate-900 px-4 pt-4 pb-3 border-b border-slate-700/50 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Demandas</h2>
            <p className="text-xs text-slate-400">Solicitudes reales que puedes tomar ahora</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshMapAndFeed}
              className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-lg flex items-center justify-center transition shadow-md shadow-amber-500/20"
              title="Recargar feed"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition border border-slate-700"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <DashboardFeed
            userLat={userLat}
            userLng={userLng}
            currentUserId={currentUserId}
            onCardClick={(request) => {
              setHighlightedRequestId(request.id)
              setTimeout(() => setHighlightedRequestId(null), 3000)
              setSelectedDetail(null)
            }}
            highlightedRequestId={highlightedRequestId}
            onRequestService={(request) => {
              const authCheck = checkAuthAndProfile()
              if (!authCheck.canInteract) {
                if (authCheck.reason === 'login') {
                  setShowLoginModal(true)
                  toast('Inicia sesión para tomar solicitudes', 'info')
                } else {
                  setShowOnboarding(true)
                  toast('Completa tu perfil para continuar', 'warning')
                }
                return
              }
              if (request.worker_id) {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                const headers: HeadersInit = { Accept: 'application/json' }
                if (token) {
                  headers.Authorization = `Bearer ${token}`
                }
                fetch(`${getPublicApiBase()}/api/v1/experts/${request.worker_id}`, { headers })
                  .then((r) => {
                    if (!r.ok) {
                      throw new Error(`HTTP ${r.status}`)
                    }
                    return r.json()
                  })
                  .then((data) => {
                    if (data?.data) {
                      setSelectedDetail(data.data)
                      setShowRequestModal(true)
                      setDashHidden(true)
                    } else {
                      throw new Error('No data en respuesta')
                    }
                  })
                  .catch(() => {
                    const fallbackDetail: ExpertDetail = {
                      id: request.worker_id || request.id,
                      name: request.client?.name || 'Cliente',
                      nickname: null,
                      avatar: request.client?.avatar || null,
                      phone: null,
                      title: request.description || '',
                      bio: '',
                      skills: [],
                      hourly_rate: request.offered_price || 0,
                      fresh_score: 0,
                      fresh_score_count: 0,
                      rating_count: 0,
                      total_jobs: 0,
                      is_verified: false,
                      status: 'active',
                      category: request.category
                        ? {
                            slug: (request.category as { slug?: string })?.slug || '',
                            name:
                              (request.category as { display_name?: string })?.display_name || request.category?.name || 'Servicio',
                            color: request.category?.color || '#6b7280',
                            icon: request.category?.icon || '📌',
                          }
                        : { slug: '', name: 'Servicio', color: '#6b7280', icon: '📌' },
                      videos_count: 0,
                      pos: request.pos,
                      microcopy: request.description || '',
                    }
                    setSelectedDetail(fallbackDetail)
                    setShowRequestModal(true)
                    setDashHidden(true)
                  })
              } else {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                if (!token) {
                  setShowLoginModal(true)
                  toast('Inicia sesión para tomar demandas', 'info')
                  return
                }
                fetch(`/take_demand.php?id=${request.id}`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                  },
                })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.status === 'success') {
                      toast('Demanda tomada', 'success', 'El cliente será notificado.')
                      const removeEvent = new CustomEvent('remove-feed-item', { detail: { id: request.id } })
                      window.dispatchEvent(removeEvent)
                      setPoints((prev) => prev.filter((p) => !(p.id === request.id && p.pin_type === 'demand')))
                      setSelectedDetail(null)
                      setTimeout(() => {
                        fetchNearby()
                        window.dispatchEvent(new Event('reload-feed'))
                      }, 1500)
                      setDashHidden(true)
                    } else {
                      toast(data.message || 'Error al tomar demanda', 'error')
                    }
                  })
                  .catch(() => {
                    toast(feedbackCopy.networkErrorTakingDemand, 'error')
                  })
              }
            }}
            onOpenChat={(request) => {
              const authCheck = checkAuthAndProfile()
              if (!authCheck.canInteract) {
                if (authCheck.reason === 'login') {
                  setShowLoginModal(true)
                  toast('Inicia sesión para chatear', 'info')
                } else {
                  setShowOnboarding(true)
                  toast('Completa tu perfil para chatear', 'warning')
                }
                return
              }
              setActiveRequestId(request.id)
              setChatContext({
                description: request?.description,
                name: request?.client?.name,
                avatar: request?.client?.avatar,
              })
              setShowChat(true)
              setDashHidden(true)
            }}
            onGoToLocation={async (request) => {
              let targetLat = request.pos?.lat
              let targetLng = request.pos?.lng
              const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
              if (token && request.id) {
                try {
                  const headers: HeadersInit = { Accept: 'application/json' }
                  headers.Authorization = `Bearer ${token}`
                  const detailRes = await fetch(`${getPublicApiBase()}/api/v1/demand/${request.id}`, { headers })
                  if (detailRes.ok) {
                    const detailData = await detailRes.json()
                    if (detailData.status === 'success' && detailData.data?.pos) {
                      targetLat = detailData.data.pos.lat
                      targetLng = detailData.data.pos.lng
                    }
                  }
                } catch {
                  /* fallback pos del feed */
                }
              }
              if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) {
                return
              }
              setDashHidden(true)
              setTimeout(() => {
                const map = (window as { __leafletMap?: { invalidateSize: () => void; flyTo: (ll: [number, number], z: number, o: { duration: number }) => void } }).__leafletMap
                if (map && typeof map.flyTo === 'function') {
                  map.invalidateSize()
                  map.flyTo([targetLat, targetLng], 18, { duration: 1.5 })
                  setHighlightedRequestId(request.id)
                  setTimeout(() => setHighlightedRequestId(null), 3000)
                }
              }, 400)
            }}
          />
        </div>
      </div>
    </div>
  )
}
