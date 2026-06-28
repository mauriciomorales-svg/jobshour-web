'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getPublicApiBase } from '@/lib/api'
import { clearMapLocalStorageFull, LS_MAP_VIEW_LAT, LS_MAP_VIEW_LNG } from '@/lib/mapStorage'
import { centroidOfCoords, mapPointsToCoords } from '@/lib/mapFitBounds'
import type { MapPoint } from './components/MapSection'
const WorkerProfileHub = dynamic(() => import('./components/WorkerProfileHub'), { ssr: false })
const WorkerJobs = dynamic(() => import('./components/WorkerJobs'), { ssr: false })
const Friends = dynamic(() => import('./components/Friends'), { ssr: false })
const VerificationCard = dynamic(() => import('./components/VerificationCard'), { ssr: false })
const CategoryManagement = dynamic(() => import('./components/CategoryManagement'), { ssr: false })
const StoreOrdersPanel = dynamic(() => import('./components/StoreOrdersPanel'), { ssr: false })
const WorkerQuotesPanel = dynamic(() => import('./components/WorkerQuotesPanel'), { ssr: false })
const RequestHistoryPanel = dynamic(() => import('./components/RequestHistoryPanel'), { ssr: false })
const WorkerDetailModal = dynamic(() => import('./components/WorkerDetailModal'), { ssr: false })
const NoCoverageOverlay = dynamic(() => import('./components/NoCoverageOverlay'), { ssr: false })
const ProfileRequiredModal = dynamic(() => import('./components/ProfileRequiredModal'), { ssr: false })
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
import { HomeBottomBar } from './components/HomeBottomBar'
import { MapFetchErrorBanner } from './components/MapFetchErrorBanner'
import { feedbackCopy } from '@/lib/userFacingCopy'
import {
  findPendingRatingRequest,
  markRatingPrompted,
  workerInfoFromRequest,
  type RateableServiceRequest,
} from '@/lib/ratingPrompt'
import { registerAppToast } from '@/lib/notifyUser'
import { HomeChatPanels } from './components/HomeChatPanels'
import { OpenRequestsBanner } from './components/OpenRequestsBanner'
import { WorkerAvailabilityBanner } from './components/WorkerAvailabilityBanner'
import ToastContainer from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import { TabKey } from './components/BottomTabBar'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelEvent } from '@/lib/analyticsFunnel'
import { isPremiumStoreMapPoint } from '@/lib/mapPremiumPin'
import {
  consumePubdemandaDraft,
  parsePubdemandaSearchParams,
  persistPubdemandaDraft,
  sanitizePubdemandaReturnUrl,
} from '@/lib/integrateDemandFromUrl'

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<'map' | 'profile' | 'jobs'>('map')
  const [activeTab, setActiveTab] = useState<TabKey>('map')
  /** Filtro opcional de pines: servicios (trabajadores + demandas) vs tiendas premium. */
  const [mapLayersExpanded, setMapLayersExpanded] = useState(false)
  const [mapLayers, setMapLayers] = useState({ services: true, stores: true })

  useEffect(() => {
    if (activeSection !== 'map' || activeTab !== 'map') setMapLayersExpanded(false)
  }, [activeSection, activeTab])
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
  const [showRequestHistoryPanel, setShowRequestHistoryPanel] = useState(false)
  const [showSolicitudesPanel, setShowSolicitudesPanel] = useState(false)
  const [solicitudesFocusKey, setSolicitudesFocusKey] = useState(0)
  const [dashHidden, setDashHidden] = useState(true)
  const [dismissEmptyMap, setDismissEmptyMap] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [showProfileRequired, setShowProfileRequired] = useState(false)
  const welcomeSlidesScheduledRef = useRef(false)
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
  const didFitWorkersRef = useRef(false)
  const mapDiscoveryActiveRef = useRef(false)
  const prevEmptyKindRef = useRef<'outside' | 'empty' | null>(null)
  const ridDeepLinkHandled = useRef(false)
  const mpReturnHandledRef = useRef(false)
  const chatOpenDeepLinkHandledRef = useRef(false)
  const pubdemandaHandledRef = useRef(false)
  const pubdemandaReturnRef = useRef<string | null>(null)

  const syncPublishDemandReturnRef = useCallback((draft: PublishDemandInitialDraft | null) => {
    pubdemandaReturnRef.current = draft?.returnAfterPublish
      ? sanitizePubdemandaReturnUrl(draft.returnAfterPublish)
      : null
  }, [])

  const openPublishDemandClean = useCallback(() => {
    setPublishDemandInitialDraft(null)
    syncPublishDemandReturnRef(null)
    setShowPublishDemand(true)
  }, [syncPublishDemandReturnRef])

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
  useEffect(() => {
    registerAppToast((msg, type, body) => toast(msg, type ?? 'info', body))
    return () => registerAppToast(null)
  }, [toast])

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
    tryShowWelcomeSlides,
  } = useUserAuth({
    fetchWorkerData,
    setWorkerStatus,
    onSessionClosed: () => toast(feedbackCopy.sessionClosed, 'info'),
  })

  /** Mapa a pantalla: sección mapa + pestaña inferior Mapa. */
  const mapDiscoveryActive = activeSection === 'map' && activeTab === 'map'

  useEffect(() => {
    mapDiscoveryActiveRef.current = mapDiscoveryActive
  }, [mapDiscoveryActive])

  const handleNearbyResults = useCallback((pts: MapPoint[]) => {
    if (didFitWorkersRef.current) return
    if (!mapDiscoveryActiveRef.current) return
    const coords = mapPointsToCoords(pts)
    if (coords.length === 0) return
    didFitWorkersRef.current = true
    void mapRef.current?.fitToPoints(coords)
    const center = centroidOfCoords(coords)
    if (!center) return
    const [cLat, cLng] = center
    userLatRef.current = cLat
    userLngRef.current = cLng
    setUserLat(cLat)
    setUserLng(cLng)
    try {
      localStorage.setItem(LS_MAP_VIEW_LAT, String(cLat))
      localStorage.setItem(LS_MAP_VIEW_LNG, String(cLng))
    } catch {
      /* ignore */
    }
  }, [setUserLat, setUserLng])

  const {
    points, setPoints, meta, loading, outsideZone, fetchError, fetchNearby, fetchNearbyRef, retryFetch,
  } = useNearbyFetch({
    user, userLatRef, userLngRef, workerStatus, toast, onNearbyResults: handleNearbyResults,
  })

  useEffect(() => {
    const onRetryMap = () => {
      fetchNearbyRef.current.lastCall = 0
      retryFetch(activeCategory)
    }
    window.addEventListener('jh:retry-map-fetch', onRetryMap)
    return () => window.removeEventListener('jh:retry-map-fetch', onRetryMap)
  }, [activeCategory, retryFetch, fetchNearbyRef])

  useEffect(() => {
    if (!mapDiscoveryActive || loading) return
    try {
      if (sessionStorage.getItem('jh_location_prompt_dismissed') === '1') return
      const lat = localStorage.getItem('user_lat')
      const lng = localStorage.getItem('user_lng')
      if (lat && lng && !Number.isNaN(parseFloat(lat))) return
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setShowLocationPrompt(true), 2000)
    return () => window.clearTimeout(t)
  }, [mapDiscoveryActive, loading])

  useEffect(() => {
    if (loading || !mapDiscoveryActive || welcomeSlidesScheduledRef.current) return
    welcomeSlidesScheduledRef.current = true
    tryShowWelcomeSlides()
  }, [loading, mapDiscoveryActive, tryShowWelcomeSlides])

  const openProfileOrLogin = useCallback(
    (reason?: 'login' | 'profile') => {
      if (reason === 'profile') {
        setShowProfileRequired(true)
        return
      }
      setShowLoginModal(true)
    },
    [setShowLoginModal],
  )

  const handleDismissLocationPrompt = useCallback(() => {
    try {
      sessionStorage.setItem('jh_location_prompt_dismissed', '1')
    } catch {
      /* ignore */
    }
    setShowLocationPrompt(false)
  }, [])

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
    mapDiscoveryActive,
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
    premiumHandoff, dismissPremiumHandoff,
    handlePointClick, handleMapClick,
    handleDetailTakeDemand,
    handleDetailTravelJoin,
    handleDetailRequest, handleDetailCallPhone,
    handleDetailVerWorkerProfile,
  } = usePointDetail({
    checkAuthAndProfile,
    setShowLoginModal,
    onProfileRequired: () => setShowProfileRequired(true),
    setShowChat,
    onOpenChatFromTake: ({ requestId, clientName, clientAvatar, description }) => {
      setActiveRequestId(requestId)
      setChatContext({
        name: clientName ?? 'Cliente',
        avatar: clientAvatar ?? null,
        description,
        myRole: 'trabajador',
      })
      setShowChat(true)
      setChatBadge(0)
      setActiveTab('map')
      setDashHidden(true)
    },
    fetchNearby,
    activeCategory,
    toast,
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

  /** Enlace compartido /d/{id} → «Abrir en la app» usa ?rid= para resaltar en el feed. */
  useEffect(() => {
    if (typeof window === 'undefined' || ridDeepLinkHandled.current) return
    let sp: URLSearchParams
    try {
      sp = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    const rid = sp.get('rid')
    if (!rid) return
    const n = parseInt(rid, 10)
    if (!Number.isFinite(n) || n <= 0) return
    ridDeepLinkHandled.current = true
    setHighlightedRequestId(n)
    setActiveTab('feed')
    setDashHidden(false)
    toast('Demanda compartida: buscala en el panel de oportunidades.', 'info')
    try {
      const u = new URL(window.location.href)
      u.searchParams.delete('rid')
      window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash)
    } catch {
      /* ignore */
    }
  }, [setHighlightedRequestId, toast])

  /** Enlace desde tienda externa: ?pubdemanda=1&lat=&lng=&q=… — abre publicar demanda en JobsHours (tras login si hace falta). */
  useEffect(() => {
    if (typeof window === 'undefined' || pubdemandaHandledRef.current) return
    let sp: URLSearchParams
    try {
      sp = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    const draft = parsePubdemandaSearchParams(sp)
    if (!draft) return
    pubdemandaHandledRef.current = true

    const stripParams = () => {
      try {
        const u = new URL(window.location.href)
        const keys = [
          'pubdemanda', 'jh_pubdemanda', 'lat', 'lng', 'q', 'descripcion', 'desc', 'tipo', 'tienda', 'store',
          'origen', 'pickup', 'destino', 'delivery', 'destino_nombre', 'salida', 'source',
          'return', 'redirect',
          'utm_source', 'utm_medium', 'utm_campaign',
        ]
        keys.forEach(k => u.searchParams.delete(k))
        window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash)
      } catch {
        /* ignore */
      }
    }
    stripParams()

    setUserLat(draft.lat)
    setUserLng(draft.lng)
    userLatRef.current = draft.lat
    userLngRef.current = draft.lng
    setActiveTab('map')
    setDashHidden(true)

    trackEvent('pubdemanda_deep_link', {
      tipo: draft.demandType ?? 'express_errand',
      has_source: Boolean(draft.externalSource),
      has_return: Boolean(draft.returnAfterPublish),
    })

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) {
      persistPubdemandaDraft(draft)
      setShowLoginModal(true)
      toast('Iniciá sesión en JobsHours para publicar la demanda desde tu tienda.', 'info')
      return
    }
    if (!user) {
      persistPubdemandaDraft(draft)
      return
    }

    const a = checkAuthAndProfile()
    if (!a.canInteract) {
      persistPubdemandaDraft(draft)
      openProfileOrLogin(a.reason)
      toast('Completá tu perfil (foto y nombre) para publicar la demanda.', 'info')
      return
    }

    setPublishDemandInitialDraft(draft)
    syncPublishDemandReturnRef(draft)
    setShowPublishDemand(true)
    toast('Pedido enlazado: revisá y publicá la demanda en JobsHours.', 'success')
  }, [checkAuthAndProfile, openProfileOrLogin, syncPublishDemandReturnRef, toast, user])

  useEffect(() => {
    if (!user) return
    const draft = consumePubdemandaDraft()
    if (!draft) return
    const a = checkAuthAndProfile()
    if (!a.canInteract) {
      persistPubdemandaDraft(draft)
      openProfileOrLogin(a.reason)
      return
    }
    setUserLat(draft.lat)
    setUserLng(draft.lng)
    userLatRef.current = draft.lat
    userLngRef.current = draft.lng
    setActiveTab('map')
    setDashHidden(true)
    setPublishDemandInitialDraft(draft)
    syncPublishDemandReturnRef(draft)
    setShowPublishDemand(true)
    toast('Pedido enlazado: revisá y publicá la demanda en JobsHours.', 'success')
  }, [user, checkAuthAndProfile, openProfileOrLogin, syncPublishDemandReturnRef, toast])

  useEffect(() => {
    const onOnboardingComplete = () => {
      setActiveTab('feed')
      setDashHidden(false)
      toast('¡Listo! Tu primer paso: revisá las oportunidades cerca.', 'success')
    }
    const onOpenStoreOrders = () => setShowStoreOrders(true)
    window.addEventListener('jh-onboarding-complete', onOnboardingComplete)
    window.addEventListener('open-store-orders', onOpenStoreOrders)
    return () => {
      window.removeEventListener('jh-onboarding-complete', onOnboardingComplete)
      window.removeEventListener('open-store-orders', onOpenStoreOrders)
    }
  }, [toast])

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

  const promptRatingFromRequests = useCallback((list: RateableServiceRequest[]) => {
    const pending = findPendingRatingRequest(list)
    if (!pending) return
    const info = workerInfoFromRequest(pending)
    markRatingPrompted(pending.id)
    setRatingRequestId(pending.id)
    setRatingWorkerInfo(info)
    setShowRatingModal(true)
  }, [])

  const onClientRequestUpdated = useCallback(
    (payload: { id: number; status: string }) => {
      if (payload.status !== 'completed' || !user) return
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) return
      fetch(`${getPublicApiBase()}/api/v1/requests/mine`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
        .then((r) => r.json())
        .then((data) => {
          const list = (data?.data ?? []) as RateableServiceRequest[]
          promptRatingFromRequests(list)
        })
        .catch(() => {})
    },
    [user, promptRatingFromRequests],
  )

  useEchoRealtime({
    user, toast, playNotifSound, setNotifBadge, setActiveRequestId, setPoints,
    userLatRef, userLngRef, fetchWorkerCount, activeChatRequestIds, showChat,
    chatNotifySeenIdsRef, chatNotifySubscribedIdsRef, setChatBadge,
    onClientRequestUpdated,
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
    if (tab === 'profile' && !user) {
      setShowLoginModal(true)
      return
    }
    setActiveTab(tab)
    if (tab === 'map') { setDashHidden(true); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'feed') { setDashHidden(false); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'requests') {
      setDashHidden(true)
      setShowSolicitudesPanel(true)
      setActiveSection('map')
      setChatBadge(0)
      setSolicitudesFocusKey((k) => k + 1)
    }
    if (tab === 'profile') setActiveSection('profile')
  }, [user, setShowLoginModal])

  const handleMenuToggle = useCallback(() => {
    setShowSidebar((s) => !s); setNotifBadge(0)
  }, [])

  const handlePublishDemandSuccess = useCallback((snapshot?: PublishedDemandSnapshot) => {
    const returnUrl = pubdemandaReturnRef.current
    syncPublishDemandReturnRef(null)

    setShowPublishDemand(false)
    setPublishDemandInitialDraft(null)
    setShowPublishSuccess(true)
    setTimeout(() => setShowPublishSuccess(false), 3000)
    toast('Demanda publicada', 'success', 'Ya aparece en el mapa y en Oportunidades.')
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

    const safeReturn = returnUrl ? sanitizePubdemandaReturnUrl(returnUrl) : null
    if (safeReturn) {
      window.setTimeout(() => {
        window.location.assign(safeReturn)
      }, 450)
    }
  }, [fetchNearby, syncPublishDemandReturnRef, toast, setPoints])

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
      openProfileOrLogin(a.reason)
      return
    }
    action()
  }, [checkAuthAndProfile, openProfileOrLogin])

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

  const openChatFromRequestId = useCallback(async (requestId: number) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || localStorage.getItem('token')
        : null
    if (!token || !user) {
      toast('Iniciá sesión para abrir el chat', 'info')
      setShowLoginModal(true)
      return
    }
    try {
      const res = await fetch(`${getPublicApiBase()}/api/v1/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      const sr = data?.data ?? data
      if (!res.ok || !sr?.id) {
        toast('No se pudo abrir el chat de esta solicitud', 'error')
        return
      }
      const myRole: 'cliente' | 'trabajador' =
        Number(sr.client_id) === Number(user.id) ? 'cliente' : 'trabajador'
      const other = myRole === 'cliente' ? sr.worker?.user : sr.client
      setActiveRequestId(requestId)
      setChatContext({
        description: typeof sr.description === 'string' ? sr.description : undefined,
        name: other?.name ?? 'Chat',
        avatar: other?.avatar ?? null,
        email: other?.email ?? null,
        myRole,
      })
      setShowChat(true)
      setChatBadge(0)
      setActiveTab('map')
      setDashHidden(true)
    } catch {
      toast('Error al abrir el chat', 'error')
    }
  }, [user, toast, setShowLoginModal, setActiveRequestId, setChatContext, setShowChat, setChatBadge])

  /** Retorno Mercado Pago (créditos/boost) y clic en notificación push (?request_id=&open_chat=1). */
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stripParams = (keys: string[]) => {
      try {
        const u = new URL(window.location.href)
        keys.forEach((k) => u.searchParams.delete(k))
        window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash)
      } catch {
        /* ignore */
      }
    }

    if (!mpReturnHandledRef.current) {
      let sp: URLSearchParams
      try {
        sp = new URLSearchParams(window.location.search)
      } catch {
        sp = new URLSearchParams()
      }
      const credits = sp.get('credits')
      if (credits === 'ok') {
        mpReturnHandledRef.current = true
        toast('Créditos acreditados. Ya puedes ver teléfonos de profesionales.', 'success')
        stripParams(['credits', 'pack'])
      } else if (credits === 'fail') {
        mpReturnHandledRef.current = true
        toast('El pago de créditos no se completó.', 'error')
        stripParams(['credits', 'pack'])
      } else if (credits === 'pending') {
        mpReturnHandledRef.current = true
        toast('Pago en proceso. Los créditos se acreditarán al confirmarse.', 'info')
        stripParams(['credits', 'pack'])
      }
      const boost = sp.get('boost')
      if (boost === 'ok') {
        mpReturnHandledRef.current = true
        toast('Tu demanda quedó destacada en el mapa.', 'success')
        stripParams(['boost'])
      }
      const payment = sp.get('payment')
      const payRid = sp.get('request_id')
      if (payment === 'ok' && payRid) {
        mpReturnHandledRef.current = true
        const n = parseInt(payRid, 10)
        if (Number.isFinite(n) && n > 0) {
          trackFunnelEvent('payment_success', { request_id: n, source: 'deeplink' })
          toast('Pago registrado. Revisa el chat de tu solicitud.', 'success')
          void openChatFromRequestId(n)
        }
        stripParams(['payment', 'request_id', 'status', 'collection_status'])
      } else if (payment === 'fail') {
        mpReturnHandledRef.current = true
        toast('El pago no se completó. Puedes intentar de nuevo desde Mis solicitudes.', 'error')
        stripParams(['payment', 'request_id', 'status', 'collection_status'])
      } else if (payment === 'pending') {
        mpReturnHandledRef.current = true
        toast('Pago en proceso. Te avisaremos cuando se confirme.', 'info')
        stripParams(['payment', 'request_id', 'status', 'collection_status'])
      }
    }

    if (!chatOpenDeepLinkHandledRef.current) {
      let sp: URLSearchParams
      try {
        sp = new URLSearchParams(window.location.search)
      } catch {
        sp = new URLSearchParams()
      }
      const openChat = sp.get('open_chat')
      const ridRaw = sp.get('request_id')
      if (openChat === '1' && ridRaw) {
        const n = parseInt(ridRaw, 10)
        if (Number.isFinite(n) && n > 0) {
          chatOpenDeepLinkHandledRef.current = true
          void openChatFromRequestId(n)
          stripParams(['open_chat', 'request_id'])
        }
      }
    }

    const onSwMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; url?: string } | null
      if (payload?.type !== 'DEEPLINK_OPEN_CHAT' || !payload.url) return
      try {
        const u = new URL(payload.url, window.location.origin)
        if (u.searchParams.get('open_chat') !== '1') return
        const rid = u.searchParams.get('request_id')
        const n = rid ? parseInt(rid, 10) : NaN
        if (Number.isFinite(n) && n > 0) void openChatFromRequestId(n)
      } catch {
        /* ignore */
      }
    }

    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage)
  }, [openChatFromRequestId, toast])

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

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return points
    if (meta?.city && meta.city.toLowerCase().includes(q)) return points
    return points.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category_slug && p.category_slug.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)),
    )
  }, [points, searchQuery, meta?.city])

  const filtered = useMemo(() => {
    if (mapLayers.services && mapLayers.stores) return searchFiltered
    return searchFiltered.filter((p) => {
      const store = isPremiumStoreMapPoint(p)
      if (store) return mapLayers.stores
      return mapLayers.services
    })
  }, [searchFiltered, mapLayers.services, mapLayers.stores])

  useEffect(() => {
    if (loading) return
    const kind = outsideZone ? 'outside' : filtered.length === 0 ? 'empty' : null
    if (kind && prevEmptyKindRef.current !== kind) {
      prevEmptyKindRef.current = kind
      setDismissEmptyMap(false)
    }
    if (!kind) prevEmptyKindRef.current = null
  }, [outsideZone, loading, filtered.length])

  const toggleMapLayer = useCallback((key: 'services' | 'stores') => {
    setMapLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (!next.services && !next.stores) return prev
      return next
    })
  }, [])

  useEffect(() => {
    if (!selectedDetail) return
    if (filtered.some((p) => p.id === selectedDetail.id)) return
    setSelectedDetail(null)
    setLoadingDetail(false)
    dismissPremiumHandoff()
  }, [filtered, selectedDetail, setSelectedDetail, setLoadingDetail, dismissPremiumHandoff])

  const handleCategoryClick = (catId: number) => {
    const next = activeCategory === catId ? null : catId
    setActiveCategory(next); setSelectedDetail(null); fetchNearby(next)
  }

  const showEmptyMapOverlay =
    mapDiscoveryActive &&
    !loading &&
    (outsideZone || (filtered.length === 0)) &&
    !selectedDetail &&
    !dismissEmptyMap

  const openRequestsCintilloVisible =
    !!user &&
    !openRequestsBannerDismissed &&
    !showChat &&
    !showSolicitudesPanel &&
    activeSection === 'map' &&
    activeTab === 'map' &&
    openActiveRequestsCount >= 1

  const workerAvailabilityCintilloVisible =
    !!user &&
    !workerAvailBannerDismissed &&
    workerStatus === 'inactive' &&
    workerCategories.length > 0 &&
    !showChat &&
    !showSolicitudesPanel &&
    activeSection === 'map' &&
    activeTab === 'map' &&
    !statusLoading

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {activeSection === 'profile' && user && (
        <WorkerProfileHub
          user={user}
          onClose={() => setActiveSection('map')}
          onSellerChange={(val) => setIsSeller(val)}
          onOpenMisTrabajos={() => setActiveSection('jobs')}
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
        showLocationFab={mapDiscoveryActive}
        onCenterOnMyLocation={handleCenterOnMyLocation}
        mapLoading={mapDiscoveryActive && loading}
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
        onCloseDetail={() => {
          setSelectedDetail(null)
          setLoadingDetail(false)
          dismissPremiumHandoff()
        }}
        user={user}
        workerProfile={workerProfile}
        chatRequestIdForDetail={
          selectedDetail && selectedDetail.status !== 'demand'
            ? chatRequestByWorkerId[selectedDetail.id] ?? null
            : null
        }
        onTakeDemand={() => void handleDetailTakeDemand(selectedDetail)}
        onTravelJoin={() => handleDetailTravelJoin(selectedDetail)}
        onOpenProfileSection={() => setActiveSection('profile')}
        onVerWorkerProfile={() => handleDetailVerWorkerProfile(selectedDetail)}
        onDetailChat={async (explicitRequestId) => {
          const auth = checkAuthAndProfile()
          if (!auth.canInteract) {
            openProfileOrLogin(auth.reason)
            toast(
              auth.reason === 'login' ? 'Iniciá sesión para continuar' : 'Completá foto y nombre en tu perfil',
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
              toast('Creando conversación…', 'info', 'Un momento y podés chatear.')
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
        isWorker={workerStatus !== 'guest' && workerStatus !== 'inactive'}
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
        onProfileRequired={() => setShowProfileRequired(true)}
        setActiveRequestId={setActiveRequestId}
        setChatContext={setChatContext}
        setShowChat={setShowChat}
        setPoints={setPoints}
        fetchNearby={fetchNearby}
        checkAuthAndProfile={checkAuthAndProfile}
        toast={toast}
        showLocationPrompt={showLocationPrompt}
        onDismissLocationPrompt={handleDismissLocationPrompt}
        outsideZone={outsideZone}
        premiumHandoff={premiumHandoff}
        onDismissPremiumHandoff={dismissPremiumHandoff}
        mapLayersExpanded={mapLayersExpanded}
        onMapLayersExpandedChange={setMapLayersExpanded}
        mapLayers={mapLayers}
        onToggleMapLayer={toggleMapLayer}
        mapDiscoveryActive={mapDiscoveryActive}
      />

      <HomeChatPanels
        showSolicitudesPanel={showSolicitudesPanel}
        isWorker={workerStatus !== 'guest' && workerStatus !== 'inactive'}
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
            const d = draft ?? null
            setPublishDemandInitialDraft(d)
            syncPublishDemandReturnRef(d)
            setShowPublishDemand(true)
          })
        }}
        focusOpenKey={solicitudesFocusKey}
        onOpenHistory={() => {
          setShowSolicitudesPanel(false)
          setShowRequestHistoryPanel(true)
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
        onOpenRequestHistory={() => { setShowRequestHistoryPanel(true); setShowSidebar(false) }}
        onOpenFriends={() => { setShowFriends(true); setShowSidebar(false) }}
        onOpenVerificationCard={() => { setShowVerificationCard(true); setShowSidebar(false) }}
        onResetMap={handleResetMapLocation}
        onLogout={handleLogout}
      />

      {showRequestHistoryPanel && user && (
        <RequestHistoryPanel
          user={user}
          onClose={() => setShowRequestHistoryPanel(false)}
          onOpenChat={(requestId, otherName, otherAvatar, myRole, isSelf) => {
            setShowRequestHistoryPanel(false)
            setActiveRequestId(requestId)
            setChatContext({ name: otherName, avatar: otherAvatar, myRole, isSelf })
            setShowChat(true)
            setChatBadge(0)
          }}
        />
      )}

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

      <OpenRequestsBanner
        count={openActiveRequestsCount}
        hidden={
          !user ||
          openRequestsBannerDismissed ||
          showChat ||
          showSolicitudesPanel ||
          activeSection !== 'map' ||
          activeTab !== 'map'
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

      {mapDiscoveryActive && fetchError !== 'none' && (
        <MapFetchErrorBanner
          error={fetchError}
          onRetry={() => retryFetch(activeCategory)}
        />
      )}

      {mapDiscoveryActive && <ZoneBadge />}

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
          syncPublishDemandReturnRef(null)
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

      <ProfileRequiredModal
        open={showProfileRequired}
        onClose={() => setShowProfileRequired(false)}
        onGoProfile={() => {
          setShowProfileRequired(false)
          if (user) setActiveSection('profile')
          else setShowLoginModal(true)
        }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <OfflineBanner />
      {showStoreOrders && <StoreOrdersPanel onClose={() => setShowStoreOrders(false)} />}
      {showWorkerQuotes && <WorkerQuotesPanel onClose={() => setShowWorkerQuotes(false)} />}
    </div>
  )
}
