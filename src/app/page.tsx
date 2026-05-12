'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getPublicApiBase } from '@/lib/api'
import { clearMapLocalStorageFull } from '@/lib/mapStorage'
const WorkerProfileHub = dynamic(() => import('./components/WorkerProfileHub'), { ssr: false })
const WorkerJobs = dynamic(() => import('./components/WorkerJobs'), { ssr: false })
const Friends = dynamic(() => import('./components/Friends'), { ssr: false })
const VerificationCard = dynamic(() => import('./components/VerificationCard'), { ssr: false })
const WorkerFAB = dynamic(() => import('./components/WorkerFAB'), { ssr: false })
const CategoryManagement = dynamic(() => import('./components/CategoryManagement'), { ssr: false })
const StoreOrdersPanel = dynamic(() => import('./components/StoreOrdersPanel'), { ssr: false })
const WorkerQuotesPanel = dynamic(() => import('./components/WorkerQuotesPanel'), { ssr: false })
const WorkerDetailModal = dynamic(() => import('./components/WorkerDetailModal'), { ssr: false })
const NoCoverageOverlay = dynamic(() => import('./components/NoCoverageOverlay'), { ssr: false })
const ZoneBadge = dynamic(() => import('./components/ZoneBadge'), { ssr: false })

import { useNotifications } from '@/hooks/useNotifications'
import { useNearbyFetch } from '@/hooks/useNearbyFetch'
import { useMapViewport } from '@/hooks/useMapViewport'
import { useEchoRealtime } from '@/hooks/useEchoRealtime'
import { useActiveServiceRequests } from '@/hooks/useActiveServiceRequests'
import { useToast } from '@/hooks/useToast'
import { useUserAuth } from '@/hooks/useUserAuth'
import { useWorkerProfile } from '@/hooks/useWorkerProfile'
import { useWorkerStatus } from '@/hooks/useWorkerStatus'
import { usePointDetail } from '@/hooks/usePointDetail'
import { useHomeBootstrap } from '@/hooks/useHomeBootstrap'
import { useHomeChatState } from '@/hooks/useHomeChatState'
import type { HomeMapRef } from './components/HomeMapPanel'
import { MapScreen } from './components/MapScreen'
import { HomeModals } from './components/HomeModals'
import type { PublishedDemandSnapshot, PublishDemandInitialDraft } from './components/PublishDemandModal'
import { HomeSidebar } from './components/HomeSidebar'
import { HomeLoadingScreen } from './components/HomeLoadingScreen'
import { HomeBottomBar } from './components/HomeBottomBar'
import { HomeChatPanels } from './components/HomeChatPanels'
import { OpenRequestsBanner } from './components/OpenRequestsBanner'
import { WorkerAvailabilityBanner } from './components/WorkerAvailabilityBanner'
import ToastContainer from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import { TabKey } from './components/BottomTabBar'
import { trackEvent } from '@/lib/analytics'

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<'map' | 'profile' | 'jobs'>('map')
  const [activeTab, setActiveTab] = useState<TabKey>('map')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showVerificationCard, setShowVerificationCard] = useState(false)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showPublishDemand, setShowPublishDemand] = useState(false)
  const [publishDemandInitialDraft, setPublishDemandInitialDraft] = useState<PublishDemandInitialDraft | null>(null)
  const [showPublishSuccess, setShowPublishSuccess] = useState(false)
  const [showStoreOrders, setShowStoreOrders] = useState(false)
  const [showWorkerQuotes, setShowWorkerQuotes] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showSolicitudesPanel, setShowSolicitudesPanel] = useState(false)
  const [dashHidden, setDashHidden] = useState(true)
  const [dismissEmptyMap, setDismissEmptyMap] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [openRequestsBannerDismissed, setOpenRequestsBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('jh_open_requests_banner') === '1'
  })
  const prevOpenRequestCountRef = useRef<number | null>(null)
  const [workerAvailBannerDismissed, setWorkerAvailBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('jh_worker_availability_banner') === '1'
  })
  const [notifBadge, setNotifBadge] = useState(0)
  const [workerCount, setWorkerCount] = useState<{ count: number; label: string } | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingRequestId, setRatingRequestId] = useState<number | null>(null)
  const [ratingWorkerInfo, setRatingWorkerInfo] = useState<{ name: string; avatar: string | null } | null>(null)
  const [workerStatus, setWorkerStatus] = useState<'guest' | 'inactive' | 'intermediate' | 'active'>('guest')
  const [userLat, setUserLat] = useState(0)
  const [userLng, setUserLng] = useState(0)
  const userLatRef = useRef(0)
  const userLngRef = useRef(0)
  const mapRef = useRef<HomeMapRef | null>(null)

  const openPublishDemandClean = useCallback(() => {
    setPublishDemandInitialDraft(null)
    setShowPublishDemand(true)
  }, [])

  const { categories } = useHomeBootstrap(openPublishDemandClean)
  const {
    activeRequestId, setActiveRequestId,
    activeChatRequestIds, setActiveChatRequestIds,
    showChat, setShowChat,
    chatBadge, setChatBadge,
    chatContext, setChatContext,
    chatNotifySeenIdsRef, chatNotifySubscribedIdsRef,
  } = useHomeChatState()

  const { toasts, toast, removeToast } = useToast()
  const {
    workerProfile, setWorkerProfile,
    isSeller, setIsSeller,
    workerCategories, setWorkerCategories,
    fetchWorkerData,
  } = useWorkerProfile()

  const {
    user, setUser,
    showLoginModal, setShowLoginModal,
    showOnboarding, setShowOnboarding,
    showWelcomeSlides,
    checkAuthAndProfile,
    fetchUserProfile,
    handleLogout,
    handleLoginSuccess,
    handleCompleteOnboarding,
    handleWelcomeSlidesDone,
  } = useUserAuth({ fetchWorkerData, setWorkerStatus })

  const { points, setPoints, meta, loading, outsideZone, fetchNearby, fetchNearbyRef } = useNearbyFetch({
    user, userLatRef, userLngRef, workerStatus, toast,
  })

  // Reiniciar el dismiss del overlay cada vez que llegan nuevos datos del mapa
  // (permite que el overlay reaparezca si la nueva zona también está vacía)
  useEffect(() => {
    if (!loading) setDismissEmptyMap(false)
  }, [points, loading])

  const syncWorkerLocation = useCallback(async (lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (workerStatus === 'guest') return

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return

    const status =
      workerStatus === 'intermediate'
        ? 'listening'
        : workerStatus === 'inactive'
          ? 'inactive'
          : 'active'
    try {
      await fetch(`${getPublicApiBase()}/api/v1/worker/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, lat, lng }),
      })
    } catch {
      // Best-effort: el mapa local ya quedó actualizado aunque falle sync remoto.
    }
  }, [workerStatus])

  const handleResolvedLocation = useCallback((lat: number, lng: number) => {
    // Actualiza de inmediato el pin propio en el mapa para evitar desfase visual.
    if (user?.id) {
      setPoints((prev) =>
        prev.map((p) => ((p.user_id && p.user_id === user.id) ? { ...p, pos: { lat, lng } } : p)),
      )
    }
    void syncWorkerLocation(lat, lng)
  }, [setPoints, syncWorkerLocation, user?.id])

  const { handleMapViewportMove, handleCenterOnMyLocation, handleLeafletMapReady } = useMapViewport({
    userLatRef, userLngRef, setUserLat, setUserLng,
    activeCategory, fetchNearby, fetchNearbyRef, toast, mapRef, onResolvedLocation: handleResolvedLocation,
  })

  const {
    statusLoading,
    showCategoryRequiredModal, setShowCategoryRequiredModal,
    handleWorkerStatusChange,
    handleCategoryRequiredGoProfile,
    handleCategoryRequiredCancel,
  } = useWorkerStatus({
    workerStatus, setWorkerStatus,
    workerCategories, userLat, userLng,
    activeCategory, fetchNearby, setPoints,
    userId: user?.id, toast,
    setActiveSection, setShowSidebar, setShowLoginModal,
  })

  const {
    selectedDetail, setSelectedDetail,
    loadingDetail, setLoadingDetail,
    highlightedRequestId, setHighlightedRequestId,
    showWorkerProfileDetail, setShowWorkerProfileDetail,
    selectedWorkerId, setSelectedWorkerId,
    showRequestModal, setShowRequestModal,
    handlePointClick, handleMapClick,
    handleDetailTravelJoin,
    handleDetailRequest, handleDetailCallPhone,
    handleDetailVerWorkerProfile,
  } = usePointDetail({
    checkAuthAndProfile, setShowLoginModal, setShowChat,
    fetchNearby, activeCategory, toast,
  })

  const authTokenForFcm = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  useNotifications(user ? authTokenForFcm : null)

  const { openActiveRequestsCount, chatRequestByWorkerId } = useActiveServiceRequests({
    user, activeRequestId, setActiveChatRequestIds,
    setActiveRequestId, setRatingRequestId, setRatingWorkerInfo, setShowRatingModal,
  })

  useEffect(() => {
    trackEvent('home_app_mount', {})
  }, [])

  useEffect(() => {
    const prev = prevOpenRequestCountRef.current
    prevOpenRequestCountRef.current = openActiveRequestsCount
    if (prev !== null && prev > 0 && openActiveRequestsCount === 0) {
      sessionStorage.removeItem('jh_open_requests_banner')
      setOpenRequestsBannerDismissed(false)
    }
  }, [openActiveRequestsCount])

  useEffect(() => {
    if (workerStatus === 'active' || workerStatus === 'intermediate') {
      sessionStorage.removeItem('jh_worker_availability_banner')
      setWorkerAvailBannerDismissed(false)
    }
  }, [workerStatus])

  const playNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
    } catch { /* ignore */ }
  }, [])

  const fetchWorkerCount = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`${getPublicApiBase()}/api/v1/experts/count?lat=${lat}&lng=${lng}&radius=10`)
      if (!res.ok) return
      const data = await res.json()
      setWorkerCount({ count: data.count, label: data.label })
    } catch { /* silencioso */ }
  }, [])

  useEchoRealtime({
    user, toast, playNotifSound, setNotifBadge, setActiveRequestId, setPoints,
    userLatRef, userLngRef, fetchWorkerCount, activeChatRequestIds, showChat,
    chatNotifySeenIdsRef, chatNotifySubscribedIdsRef, setChatBadge,
  })

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    ;(window as unknown as { mapRef: typeof mapRef }).mapRef = mapRef
    return () => { delete (window as unknown as { mapRef?: typeof mapRef }).mapRef }
  }, [])

  useEffect(() => {
    fetchWorkerCount(userLat, userLng)
    const interval = setInterval(() => fetchWorkerCount(userLat, userLng), 45_000)
    return () => clearInterval(interval)
  }, [userLat, userLng, fetchWorkerCount])

  const handleCloseRatingModal = useCallback(() => {
    setShowRatingModal(false); setRatingRequestId(null); setRatingWorkerInfo(null)
  }, [])

  const handleRated = useCallback(() => {
    if (ratingRequestId) localStorage.setItem(`rated_${ratingRequestId}`, 'true')
    setShowRatingModal(false); setRatingRequestId(null); setRatingWorkerInfo(null)
    if (user) {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (token) {
        fetch(`${getPublicApiBase()}/api/v1/requests/mine`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json()).then(() => {})
      }
    }
  }, [ratingRequestId, user])

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    if (tab === 'map') { setDashHidden(true); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'feed') { setDashHidden(false); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'requests') { setDashHidden(true); setShowSolicitudesPanel(true); setActiveSection('map'); setChatBadge(0) }
    if (tab === 'profile') {
      if (!user) { setShowLoginModal(true); return }
      setActiveSection('profile')
    }
  }, [user, setShowLoginModal])

  const handleMenuToggle = useCallback(() => {
    setShowSidebar((s) => !s); setNotifBadge(0)
  }, [])

  const handlePublishDemandSuccess = useCallback((snapshot?: PublishedDemandSnapshot) => {
    setShowPublishDemand(false)
    setPublishDemandInitialDraft(null)
    setShowPublishSuccess(true)
    setTimeout(() => setShowPublishSuccess(false), 3000)
    toast('Demanda publicada', 'success', 'Ya aparece en el mapa y en Demandas.')
    if (snapshot?.mapPoint) {
      setPoints((prev) => {
        if (prev.some((p) => p.id === snapshot.mapPoint.id)) return prev
        return [...prev, snapshot.mapPoint]
      })
    }
    if (snapshot?.feedItem) {
      window.dispatchEvent(new CustomEvent('demand-published', { detail: snapshot }))
    }
    // El feed del servidor excluye las demandas del propio cliente; recargar borraría la tarjeta optimista.
    const skipFeedReload = !!snapshot?.feedItem
    queueMicrotask(() => {
      fetchNearby()
      if (!skipFeedReload) window.dispatchEvent(new Event('reload-feed'))
    })
    setTimeout(() => {
      fetchNearby()
      if (!skipFeedReload) window.dispatchEvent(new Event('reload-feed'))
    }, 1000)
  }, [fetchNearby, toast, setPoints])

  const handleDashboardRefresh = useCallback(() => {
    setPoints([]); fetchNearby()
    window.dispatchEvent(new Event('reload-feed'))
    toast('Feed recargado', 'info')
  }, [setPoints, fetchNearby, toast])

  const handleDashboardPanelClose = useCallback(() => {
    setDashHidden(true); setActiveTab('map')
  }, [])

  const checkAuthAndAct = useCallback((action: () => void) => {
    const a = checkAuthAndProfile()
    if (!a.canInteract) {
      if (a.reason === 'login') setShowLoginModal(true)
      else setShowOnboarding(true)
      return
    }
    action()
  }, [checkAuthAndProfile, setShowLoginModal, setShowOnboarding])

  const handleSidebarTryPublish = useCallback(() => {
    checkAuthAndAct(() => { openPublishDemandClean(); setShowSidebar(false) })
  }, [checkAuthAndAct, openPublishDemandClean])

  const handlePublishFromEmptyMap = useCallback(() => {
    checkAuthAndAct(() => openPublishDemandClean())
  }, [checkAuthAndAct, openPublishDemandClean])

  const handleResetMapLocation = useCallback(() => {
    clearMapLocalStorageFull()
    handleCenterOnMyLocation()
    setShowSidebar(false)
    toast('Ubicación reiniciada', 'success', 'Estamos buscando tu ubicación actual.')
  }, [handleCenterOnMyLocation, setShowSidebar, toast])

  const handleRequestComplete = useCallback((reqId: number) => {
    setShowRequestModal(false)
    setActiveRequestId(reqId)
    setShowChat(true)
    toast('Solicitud enviada exitosamente', 'success')

    // Mantener contexto del chat para que ChatPanel tenga datos del interlocutor
    // (nombre/avatar + rol) inmediatamente al abrirse.
    if (selectedDetail) {
      const myRole: 'cliente' | 'trabajador' =
        user?.id && selectedDetail?.user_id && user.id === selectedDetail.user_id
          ? 'trabajador'
          : 'cliente'

      setChatContext({
        name: selectedDetail.name,
        avatar: selectedDetail.avatar ?? null,
        myRole,
        isSelf:
          !!(user?.id && selectedDetail?.user_id && user.id === selectedDetail.user_id),
      })
    } else {
      setChatContext({})
    }
  }, [setShowRequestModal, setActiveRequestId, setShowChat, setChatContext, toast, selectedDetail, user?.id])

  const createQuickChatRequest = useCallback(async (): Promise<number | null> => {
    if (!selectedDetail || selectedDetail.status === 'demand') return null
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return null

    try {
      const res = await fetch('/api/v1/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          worker_id: selectedDetail.id,
          type: 'fixed_job',
          category_type: 'fixed',
          description: null,
          urgency: 'normal',
          offered_price: selectedDetail.hourly_rate,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(data?.message || 'No se pudo crear la solicitud para chatear.', 'error')
        return null
      }

      const rid = data?.data?.id
      if (typeof rid !== 'number') {
        toast('No se pudo obtener el ID del chat.', 'error')
        return null
      }

      return rid
    } catch {
      toast('Error creando solicitud de chat.', 'error')
      return null
    }
  }, [selectedDetail, toast])

  const filtered = (() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return points
    if (meta?.city && meta.city.toLowerCase().includes(q)) return points
    return points.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.category_slug && p.category_slug.toLowerCase().includes(q))
    )
  })()

  const handleCategoryClick = (catId: number) => {
    const next = activeCategory === catId ? null : catId
    setActiveCategory(next); setSelectedDetail(null); fetchNearby(next)
  }

  const showEmptyMapOverlay =
    activeTab === 'map' && !loading && (outsideZone || (filtered.length === 0)) && !selectedDetail && !dismissEmptyMap

  const openRequestsCintilloVisible =
    !!user &&
    !openRequestsBannerDismissed &&
    !showChat &&
    !showSolicitudesPanel &&
    activeSection === 'map' &&
    openActiveRequestsCount >= 1

  const workerAvailabilityCintilloVisible =
    !!user &&
    !workerAvailBannerDismissed &&
    workerStatus === 'inactive' &&
    workerCategories.length > 0 &&
    !showChat &&
    !showSolicitudesPanel &&
    activeSection === 'map' &&
    !statusLoading

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {activeSection === 'profile' && user && (
        <WorkerProfileHub
          user={user}
          onClose={() => setActiveSection('map')}
          onSellerChange={(val) => setIsSeller(val)}
          onCategorySelected={() => {
            const token = localStorage.getItem('auth_token')
            if (token) fetchWorkerData(token)
          }}
        />
      )}

      {activeSection === 'jobs' && user && (
        <WorkerJobs user={user} onClose={() => setActiveSection('map')} />
      )}

      {showCategoryManagement && (
        <CategoryManagement onClose={() => setShowCategoryManagement(false)} />
      )}

      <MapScreen
        mapRef={mapRef}
        filtered={filtered}
        onPointClick={handlePointClick}
        onMapClick={handleMapClick}
        highlightedRequestId={highlightedRequestId}
        onLeafletReady={handleLeafletMapReady}
        onMapMove={handleMapViewportMove}
        showLocationFab={activeTab === 'map'}
        onCenterOnMyLocation={handleCenterOnMyLocation}
        showEmptyOverlay={showEmptyMapOverlay}
        onDismissEmptyMap={() => setDismissEmptyMap(true)}
        onPublishFromEmpty={handlePublishFromEmptyMap}
        notifBadge={notifBadge}
        onMenuToggle={handleMenuToggle}
        headerUser={user ? { id: user.id, firstName: user.firstName, avatarUrl: user.avatarUrl } : null}
        onLoginClick={() => setShowLoginModal(true)}
        onProfileClick={() => setShowSidebar(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        workerCount={workerCount}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        selectedDetail={selectedDetail}
        loadingDetail={loadingDetail}
        onCloseDetail={() => { setSelectedDetail(null); setLoadingDetail(false) }}
        user={user}
        workerProfile={workerProfile}
        chatRequestIdForDetail={
          selectedDetail && selectedDetail.status !== 'demand'
            ? chatRequestByWorkerId[selectedDetail.id] ?? null
            : null
        }
        onTravelJoin={() => handleDetailTravelJoin(selectedDetail)}
        onOpenProfileSection={() => setActiveSection('profile')}
        onVerWorkerProfile={() => handleDetailVerWorkerProfile(selectedDetail)}
        onDetailChat={async (explicitRequestId) => {
          const auth = checkAuthAndProfile()
          if (!auth.canInteract) {
            setShowLoginModal(true)
            toast(
              auth.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil',
              auth.reason === 'login' ? 'info' : 'warning',
            )
            return
          }
          const rid =
            typeof explicitRequestId === 'number'
              ? explicitRequestId
              : selectedDetail && selectedDetail.status !== 'demand'
                ? chatRequestByWorkerId[selectedDetail.id]
                : undefined
          if (typeof rid !== 'number') {
            // UX: si no hay chat previo, creamos una solicitud rápida (fixed_job)
            // y abrimos el chat inmediatamente para que puedas comunicarte.
            const quickRid = await createQuickChatRequest()
            if (typeof quickRid === 'number') {
              setActiveRequestId(quickRid)
              if (selectedDetail) {
                setChatContext({
                  name: selectedDetail.name,
                  avatar: selectedDetail.avatar ?? null,
                  myRole:
                    user?.id && selectedDetail?.user_id && user.id === selectedDetail.user_id
                      ? 'trabajador'
                      : 'cliente',
                })
              }
              setShowChat(true)
            } else {
              setShowRequestModal(true)
              toast('Primero enviemos una solicitud para habilitar el chat.', 'info')
            }
            return
          }
          setActiveRequestId(rid)
          setChatContext({
            name: selectedDetail?.name,
            avatar: selectedDetail?.avatar ?? null,
            myRole:
              user?.id && selectedDetail?.user_id && user.id === selectedDetail.user_id
                ? 'trabajador'
                : 'cliente',
          })
          setShowChat(true)
        }}
        onDetailRequest={handleDetailRequest}
        onCallPhone={() => handleDetailCallPhone(selectedDetail?.phone)}
        dashHidden={dashHidden}
        userLat={userLat}
        userLng={userLng}
        currentUserId={user?.id}
        onDashboardClose={handleDashboardPanelClose}
        onDashboardRefresh={handleDashboardRefresh}
        setHighlightedRequestId={setHighlightedRequestId}
        setSelectedDetail={setSelectedDetail}
        setShowRequestModal={setShowRequestModal}
        setDashHidden={setDashHidden}
        setShowLoginModal={setShowLoginModal}
        setShowOnboarding={setShowOnboarding}
        setActiveRequestId={setActiveRequestId}
        setChatContext={setChatContext}
        setShowChat={setShowChat}
        setPoints={setPoints}
        fetchNearby={fetchNearby}
        checkAuthAndProfile={checkAuthAndProfile}
        toast={toast}
        showLocationPrompt={showLocationPrompt}
        onDismissLocationPrompt={() => setShowLocationPrompt(false)}
      />

      <HomeChatPanels
        showSolicitudesPanel={showSolicitudesPanel}
        user={user}
        onLoginRequest={() => { setShowSolicitudesPanel(false); setShowLoginModal(true) }}
        onCloseSolicitudes={() => { setShowSolicitudesPanel(false); setActiveTab('map') }}
        onOpenChatFromSolicitudes={(requestId, otherName, otherAvatar, myRole, isSelf) => {
          setShowSolicitudesPanel(false)
          setActiveRequestId(requestId)
          setChatContext({ name: otherName, avatar: otherAvatar, myRole, isSelf })
          setShowChat(true); setChatBadge(0)
        }}
        showRequestModal={showRequestModal}
        selectedDetail={selectedDetail}
        onCloseRequestModal={() => setShowRequestModal(false)}
        onRequestComplete={handleRequestComplete}
        showChat={showChat}
        activeRequestId={activeRequestId}
        chatContext={chatContext}
        currentUserId={user?.id ?? 0}
        onCloseChat={() => setShowChat(false)}
        showChatHistory={showChatHistory}
        onCloseChatHistory={() => setShowChatHistory(false)}
        onOpenChatFromHistory={(requestId, ctx) => {
          setShowChatHistory(false)
          setActiveRequestId(requestId)
          setChatContext(ctx)
          setShowChat(true)
        }}
        onHighlightRequestFromSolicitudes={(requestId) => {
          setShowSolicitudesPanel(false)
          setActiveTab('map')
          setActiveSection('map')
          setDashHidden(true)
          setHighlightedRequestId(requestId)
          setTimeout(() => setHighlightedRequestId(null), 3000)
        }}
        onOpenPublishDemandFromChat={(draft) => {
          checkAuthAndAct(() => {
            setPublishDemandInitialDraft(draft ?? null)
            setShowPublishDemand(true)
          })
        }}
      />

      <HomeSidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        user={user}
        workerStatus={workerStatus}
        workerProfile={workerProfile}
        setUser={setUser}
        toast={toast}
        onGoProfile={() => { setActiveSection('profile'); setShowSidebar(false) }}
        onGoJobs={() => { setActiveSection('jobs'); setShowSidebar(false) }}
        onTryPublishDemand={handleSidebarTryPublish}
        onOpenCategoryManagement={() => { setShowCategoryManagement(true); setShowSidebar(false) }}
        onOpenStoreOrders={() => { setShowStoreOrders(true); setShowSidebar(false) }}
        onOpenWorkerQuotes={() => { setShowWorkerQuotes(true); setShowSidebar(false) }}
        onOpenChatHistory={() => { setShowChatHistory(true); setShowSidebar(false) }}
        onOpenFriends={() => { setShowFriends(true); setShowSidebar(false) }}
        onOpenVerificationCard={() => { setShowVerificationCard(true); setShowSidebar(false) }}
        onResetMap={handleResetMapLocation}
        onLogout={handleLogout}
      />

      {showFriends && user && <Friends user={user} onClose={() => setShowFriends(false)} />}

      {showVerificationCard && user && (
        <VerificationCard user={user} onClose={() => setShowVerificationCard(false)} />
      )}

      {showWorkerProfileDetail && selectedDetail && (
        <WorkerDetailModal
          detail={selectedDetail}
          chatRequestId={
            selectedDetail.status !== 'demand' ? chatRequestByWorkerId[selectedDetail.id] ?? null : null
          }
          currentUserId={user?.id}
          onOpenChat={(rid) => {
            setActiveRequestId(rid)
            setChatContext({
              name: selectedDetail.name,
              avatar: selectedDetail.avatar ?? null,
              myRole:
                user?.id && selectedDetail.user_id && user.id === selectedDetail.user_id
                  ? 'trabajador'
                  : 'cliente',
            })
            setShowChat(true)
            setShowWorkerProfileDetail(false)
            setSelectedWorkerId(null)
          }}
          onClose={() => { setShowWorkerProfileDetail(false); setSelectedWorkerId(null) }}
        />
      )}

      <WorkerFAB
        user={user}
        onActivate={() => fetchNearby()}
        onShowLogin={() => setShowLoginModal(true)}
        onRequireCategory={() => { if (user) { setActiveSection('profile'); setShowSidebar(true) } }}
        onStatusChange={() => {
          fetchNearby()
          const token = localStorage.getItem('auth_token')
          if (token) fetchUserProfile(token)
        }}
      />

      <OpenRequestsBanner
        count={openActiveRequestsCount}
        hidden={
          !user ||
          openRequestsBannerDismissed ||
          showChat ||
          showSolicitudesPanel ||
          activeSection !== 'map'
        }
        onOpen={() => handleTabChange('requests')}
        onDismiss={() => {
          sessionStorage.setItem('jh_open_requests_banner', '1')
          setOpenRequestsBannerDismissed(true)
        }}
      />

      <WorkerAvailabilityBanner
        hidden={!workerAvailabilityCintilloVisible}
        stackAboveOtherBanner={openRequestsCintilloVisible}
        onActivate={() => handleWorkerStatusChange('active')}
        onDismiss={() => {
          sessionStorage.setItem('jh_worker_availability_banner', '1')
          setWorkerAvailBannerDismissed(true)
        }}
      />

      <HomeBottomBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        chatBadge={chatBadge}
        activeChatRequestIds={activeChatRequestIds}
        points={points}
        workerStatus={workerStatus}
        statusLoading={statusLoading}
        isLoggedIn={!!user}
        workerCategories={workerCategories}
        selectedDetail={selectedDetail}
        onPublishDemand={() => checkAuthAndAct(() => openPublishDemandClean())}
        onWorkerActivate={() => handleWorkerStatusChange('active')}
        onShowCategoryRequired={() => setShowCategoryRequiredModal(true)}
        onWorkerStatusChange={handleWorkerStatusChange}
        onShowLogin={() => setShowLoginModal(true)}
      />

      {/* Acceso rápido a chat en desktop */}
      {!!user && !showChat && activeChatRequestIds.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const rid = activeRequestId ?? activeChatRequestIds[0]
            if (!rid) return
            setActiveRequestId(rid)
            setShowChat(true)
            setChatBadge(0)
          }}
          className="hidden md:flex fixed bottom-24 right-5 z-[120] items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/30 transition"
        >
          <span className="text-base">💬</span>
          <span>Abrir chat</span>
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">{chatBadge > 0 ? chatBadge : activeChatRequestIds.length}</span>
        </button>
      )}

      {loading && <HomeLoadingScreen />}

      {activeTab === 'map' && <ZoneBadge />}

      {showEmptyMapOverlay && (
        <NoCoverageOverlay
          lat={userLat}
          lng={userLng}
          onDismiss={() => setDismissEmptyMap(true)}
          onPublishDemand={() => { setDismissEmptyMap(true); handlePublishFromEmptyMap() }}
          isOutsideZone={outsideZone}
          zoneName={meta?.zone_name ?? undefined}
        />
      )}

      <HomeModals
        showLoginModal={showLoginModal}
        user={user ? { id: user.id, name: user.name, token: user.token, avatarUrl: user.avatarUrl } : null}
        onCloseLogin={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchRegister={() => { setShowLoginModal(false); setShowRegisterModal(true) }}
        onForgotPassword={() => window.open('https://jobshours.com/recuperar', '_blank')}
        showPublishDemand={showPublishDemand}
        userLat={userLat}
        userLng={userLng}
        publishCategories={categories}
        onClosePublishDemand={() => {
          setShowPublishDemand(false)
          setPublishDemandInitialDraft(null)
        }}
        publishDemandInitialDraft={publishDemandInitialDraft}
        publishDemandPublisher={
          user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : null
        }
        onPublishDemandSuccess={handlePublishDemandSuccess}
        showRatingModal={showRatingModal}
        ratingRequestId={ratingRequestId}
        ratingWorkerInfo={ratingWorkerInfo}
        onCloseRating={handleCloseRatingModal}
        onRated={handleRated}
        showCategoryRequiredModal={showCategoryRequiredModal}
        onCategoryRequiredGoProfile={handleCategoryRequiredGoProfile}
        onCategoryRequiredCancel={handleCategoryRequiredCancel}
        showOnboarding={showOnboarding}
        onCloseOnboarding={() => setShowOnboarding(false)}
        onCompleteOnboarding={() => handleCompleteOnboarding(user?.id)}
        showWelcomeSlides={showWelcomeSlides}
        onWelcomeSlidesDone={handleWelcomeSlidesDone}
        showPublishSuccess={showPublishSuccess}
        showRegisterModal={showRegisterModal}
        onCloseRegister={() => setShowRegisterModal(false)}
        onRegisterSuccess={(u: any, token: string) => { setShowRegisterModal(false); handleLoginSuccess(u, token) }}
        onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true) }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <OfflineBanner />
      {showStoreOrders && <StoreOrdersPanel onClose={() => setShowStoreOrders(false)} />}
      {showWorkerQuotes && <WorkerQuotesPanel onClose={() => setShowWorkerQuotes(false)} />}
    </div>
  )
}
