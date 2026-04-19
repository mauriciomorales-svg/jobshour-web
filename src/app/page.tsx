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
  const [showPublishSuccess, setShowPublishSuccess] = useState(false)
  const [showStoreOrders, setShowStoreOrders] = useState(false)
  const [showWorkerQuotes, setShowWorkerQuotes] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showSolicitudesPanel, setShowSolicitudesPanel] = useState(false)
  const [dashHidden, setDashHidden] = useState(true)
  const [dashExpanded, setDashExpanded] = useState(false)
  const [dismissEmptyMap, setDismissEmptyMap] = useState(false)
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

  const { categories } = useHomeBootstrap(setShowPublishDemand)
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

  const { points, setPoints, meta, loading, fetchNearby, fetchNearbyRef } = useNearbyFetch({
    user, userLatRef, userLngRef, workerStatus, toast,
  })

  const { handleMapViewportMove, handleCenterOnMyLocation, handleLeafletMapReady } = useMapViewport({
    userLatRef, userLngRef, setUserLat, setUserLng,
    activeCategory, fetchNearby, fetchNearbyRef, toast, mapRef,
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
    handleDetailTravelJoin, handleDetailChat,
    handleDetailRequest, handleDetailCallPhone,
    handleDetailVerWorkerProfile,
  } = usePointDetail({
    checkAuthAndProfile, setShowLoginModal, setShowChat,
    fetchNearby, activeCategory, toast,
  })

  const authTokenForFcm = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  useNotifications(user ? authTokenForFcm : null)

  const { openActiveRequestsCount } = useActiveServiceRequests({
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

  const handlePublishDemandSuccess = useCallback(() => {
    setShowPublishDemand(false)
    setShowPublishSuccess(true)
    setTimeout(() => setShowPublishSuccess(false), 3000)
    toast('Demanda publicada', 'success', 'Aparecerá en el mapa en unos segundos.')
    setTimeout(() => {
      fetchNearby()
      if (dashExpanded) window.dispatchEvent(new Event('reload-feed'))
    }, 1000)
  }, [dashExpanded, fetchNearby, toast])

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
    checkAuthAndAct(() => { setShowPublishDemand(true); setShowSidebar(false) })
  }, [checkAuthAndAct])

  const handlePublishFromEmptyMap = useCallback(() => {
    checkAuthAndAct(() => setShowPublishDemand(true))
  }, [checkAuthAndAct])

  const handleResetMapLocation = useCallback(() => {
    clearMapLocalStorageFull(); window.location.reload()
  }, [])

  const handleRequestComplete = useCallback((reqId: number) => {
    setShowRequestModal(false)
    setActiveRequestId(reqId)
    setShowChat(true)
    toast('Solicitud enviada exitosamente', 'success')
    setChatContext({})
  }, [setShowRequestModal, setActiveRequestId, setShowChat, setChatContext, toast])

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
    activeTab === 'map' && !loading && filtered.length === 0 && !selectedDetail && !dismissEmptyMap

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
        activeRequestId={activeRequestId}
        onTravelJoin={() => handleDetailTravelJoin(selectedDetail)}
        onOpenProfileSection={() => setActiveSection('profile')}
        onVerWorkerProfile={() => handleDetailVerWorkerProfile(selectedDetail)}
        onDetailChat={handleDetailChat}
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
        onPublishDemand={() => checkAuthAndAct(() => setShowPublishDemand(true))}
        onWorkerActivate={() => handleWorkerStatusChange('active')}
        onShowCategoryRequired={() => setShowCategoryRequiredModal(true)}
        onWorkerStatusChange={handleWorkerStatusChange}
        onShowLogin={() => setShowLoginModal(true)}
      />

      {loading && <HomeLoadingScreen />}

      <HomeModals
        showLoginModal={showLoginModal}
        user={user ? { id: user.id, name: user.name, token: user.token, avatarUrl: user.avatarUrl } : null}
        onCloseLogin={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchRegister={() => { setShowLoginModal(false); toast('Registro disponible en jobshours.com', 'info') }}
        onForgotPassword={() => window.open('https://jobshours.com/recuperar', '_blank')}
        showPublishDemand={showPublishDemand}
        userLat={userLat}
        userLng={userLng}
        publishCategories={categories}
        onClosePublishDemand={() => setShowPublishDemand(false)}
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
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <OfflineBanner />
      {showStoreOrders && <StoreOrdersPanel onClose={() => setShowStoreOrders(false)} />}
      {showWorkerQuotes && <WorkerQuotesPanel onClose={() => setShowWorkerQuotes(false)} />}
    </div>
  )
}
