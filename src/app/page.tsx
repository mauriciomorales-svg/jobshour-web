'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'

import Logo from './components/Logo'
import { ICON_MAP } from '@/lib/iconMap'
const MapSection = dynamic(() => import('./components/MapSection'), { ssr: false })
const ServiceRequestModal = dynamic(() => import('@/app/components/ServiceRequestModal'), { ssr: false }) as any
const ChatPanel = dynamic(() => import('./components/ChatPanel'), { ssr: false })
const WorkerProfileHub = dynamic(() => import('./components/WorkerProfileHub'), { ssr: false })
const WorkerProfile = dynamic(() => import('./components/WorkerProfile'), { ssr: false })
const OnboardingWizard = dynamic(() => import('./components/OnboardingWizard'), { ssr: false })
const OnboardingSlides = dynamic(() => import('./components/OnboardingSlides'), { ssr: false })
const WorkerJobs = dynamic(() => import('./components/WorkerJobs'), { ssr: false })
const Friends = dynamic(() => import('./components/Friends'), { ssr: false })
const VerificationCard = dynamic(() => import('./components/VerificationCard'), { ssr: false })
const WorkerFAB = dynamic(() => import('./components/WorkerFAB'), { ssr: false })
const DashboardFeed = dynamic(() => import('./components/DashboardFeed'), { ssr: false })
const CategoryManagement = dynamic(() => import('./components/CategoryManagement'), { ssr: false })
const PublishDemandModal = dynamic(() => import('./components/PublishDemandModal'), { ssr: false })
const MisSolicitudes = dynamic(() => import('./components/MisSolicitudes'), { ssr: false })
const ChatHistory = dynamic(() => import('./components/ChatHistory'), { ssr: false })
const ReviewsList = dynamic(() => import('./components/ReviewsList'), { ssr: false })
const StoreOrdersPanel = dynamic(() => import('./components/StoreOrdersPanel'), { ssr: false })
const RatingModal = dynamic(() => import('./components/RatingModal'), { ssr: false })
const WorkerDetailModal = dynamic(() => import('./components/WorkerDetailModal'), { ssr: false })
const LoginModal = dynamic(() => import('./components/LoginModal'), { ssr: false })
// Temporalmente deshabilitado para debug
// const TravelModeModal = dynamic(() => import('./components/TravelModeModal'), { ssr: false })

import { useNotifications } from '@/hooks/useNotifications'
import { useToast } from '@/hooks/useToast'
import { MapPoint } from './components/MapSection'
import ToastContainer from './components/Toast'
import BottomTabBar, { TabKey } from './components/BottomTabBar'
import WorkerStatusPill from './components/WorkerStatusPill'
import OfflineBanner from './components/OfflineBanner'

interface ExpertDetail {
  id: number
  user_id?: number | null
  nickname?: string | null
  name: string
  avatar: string | null
  phone: string | null
  title: string
  bio: string
  skills: string[]
  hourly_rate: number
  fresh_score: number
  fresh_score_count: number
  rating_count: number
  total_jobs: number
  is_verified: boolean
  status: 'active' | 'intermediate' | 'inactive' | 'demand'
  category: { slug: string; name: string; display_name?: string; color: string; icon: string } | null
  categories?: { slug: string; name: string; display_name?: string; color: string; icon: string }[]
  videos_count: number
  showcase_video?: { url: string; thumbnail: string | null; duration: number | null } | null
  pos: { lat: number; lng: number }
  client_id?: number
  microcopy?: string
  is_seller?: boolean
  store_name?: string | null
  travel_role?: 'driver' | 'passenger' | null
  payload?: Record<string, any> | null
  active_route?: {
    available_seats?: number
    destination?: { address: string; lat?: number; lng?: number }
    origin?: { address: string; lat?: number; lng?: number }
    departure_time?: string
    arrival_time?: string
    distance_km?: number
  }
}

interface ApiCategory {
  id: number
  slug: string
  name: string
  icon: string
  color: string
  active_count: number
}

interface SearchMeta {
  city: string | null
  radius_searched: string
  total_found: number
  is_fallback: boolean
}

function formatCLP(val: number) {
  return '$' + val.toLocaleString('es-CL')
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshour.dondemorales.cl').replace(/\/api$/, '')

/** Mapa y búsqueda por defecto: Angol (no Renaico). `user_lat`/`user_lng` guardan GPS del perfil — no deben pisar solos el mapa. */
const DEFAULT_MAP_LAT = -37.798
const DEFAULT_MAP_LNG = -72.708
/** v4: nueva capa de claves; migración desde v3. */
const LS_MAP_VIEW_LAT = 'jobs_map_view_lat_v4'
const LS_MAP_VIEW_LNG = 'jobs_map_view_lng_v4'
const LS_MAP_VIEW_LAT_V3 = 'jobs_map_view_lat_v3'
const LS_MAP_VIEW_LNG_V3 = 'jobs_map_view_lng_v3'
const LS_MAP_VIEW_LAT_V2 = 'jobs_map_view_lat_v2'
const LS_MAP_VIEW_LNG_V2 = 'jobs_map_view_lng_v2'
const LS_MAP_VIEW_LAT_LEGACY = 'jobs_map_view_lat'
const LS_MAP_VIEW_LNG_LEGACY = 'jobs_map_view_lng'
/** Antiguo ancla de la app (plaza Renaico). Si la vista guardada sigue cerca, abrimos en Angol para poder ir a otra ciudad. */
const LEGACY_RENAICO_LAT = -37.6672
const LEGACY_RENAICO_LNG = -72.573
/** Coincidencia numérica con el pixel viejo en LS. */
const LEGACY_MATCH_EPS = 0.025
/**
 * Todo el corredor antiguo Renaico ↔ Angol (~19 km). Por debajo = guardamos/abrimos Angol centro.
 * Con 10 km seguían quedando puntos “al medio” y al recargar parecía que volvías a Renaico.
 */
const RENAICO_DEAD_ZONE_KM = 22

/** Subir en cada migración agresiva; si no coincide → nukeStaleMapLS borra datos viejos. */
const LS_MAP_LS_VER_KEY = 'jobs_map_ls_ver'
const LS_MAP_LS_VER = '7'

/** Toda clave que pueda fijar el mapa en Renaico o en coords viejas. */
const MAP_LS_KEYS_ALL = [
  LS_MAP_VIEW_LAT,
  LS_MAP_VIEW_LNG,
  LS_MAP_VIEW_LAT_V3,
  LS_MAP_VIEW_LNG_V3,
  LS_MAP_VIEW_LAT_V2,
  LS_MAP_VIEW_LNG_V2,
  LS_MAP_VIEW_LAT_LEGACY,
  LS_MAP_VIEW_LNG_LEGACY,
  'jobs_map_view_lat_v1',
  'jobs_map_view_lng_v1',
  LS_MAP_LS_VER_KEY,
  'user_lat',
  'user_lng',
] as const

function clearMapLocalStorageFull() {
  if (typeof window === 'undefined') return
  try {
    MAP_LS_KEYS_ALL.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Abre la app con `?reset_map=1` para volver a Angol sin consola (antes de leer el mapa). */
function applyResetMapQueryParamOnce() {
  if (typeof window === 'undefined') return
  try {
    const u = new URL(window.location.href)
    if (u.searchParams.get('reset_map') !== '1') return
    clearMapLocalStorageFull()
    u.searchParams.delete('reset_map')
    const q = u.searchParams.toString()
    window.history.replaceState({}, '', u.pathname + (q ? `?${q}` : '') + u.hash)
  } catch {
    /* ignore */
  }
}

applyResetMapQueryParamOnce()

/**
 * Si el LS no tiene la marca de versión actual → borra TODAS las claves viejas de mapa.
 * Garantiza reset aunque el browser esté sirviendo JS viejo (SW caché).
 */
function nukeStaleMapLS() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_LS_VER_KEY) === LS_MAP_LS_VER) return
    ;[
      'jobs_map_view_lat_v4',
      'jobs_map_view_lng_v4',
      'jobs_map_view_lat_v3',
      'jobs_map_view_lng_v3',
      'jobs_map_view_lat_v2',
      'jobs_map_view_lng_v2',
      'jobs_map_view_lat',
      'jobs_map_view_lng',
      'jobs_map_view_lat_v1',
      'jobs_map_view_lng_v1',
    ].forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(LS_MAP_LS_VER_KEY, LS_MAP_LS_VER)
  } catch {
    /* ignore */
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/** Vista guardada demasiado pegada al antiguo centro Renaico → Angol (resto de ciudades no toca). */
function escapeRenaicoDeadZone(lat: number, lng: number): { lat: number; lng: number } {
  const d = haversineKm(lat, lng, LEGACY_RENAICO_LAT, LEGACY_RENAICO_LNG)
  if (d <= RENAICO_DEAD_ZONE_KM) {
    return { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  }
  return { lat, lng }
}

function normalizeStoredMapCoords(lat: number, lng: number): { lat: number; lng: number } {
  if (
    Math.abs(lat - LEGACY_RENAICO_LAT) < LEGACY_MATCH_EPS &&
    Math.abs(lng - LEGACY_RENAICO_LNG) < LEGACY_MATCH_EPS
  ) {
    return { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  }
  return { lat, lng }
}

function persistMapViewStorage(lat: number, lng: number) {
  try {
    localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
    localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
    localStorage.removeItem(LS_MAP_VIEW_LAT_V3)
    localStorage.removeItem(LS_MAP_VIEW_LNG_V3)
    localStorage.removeItem(LS_MAP_VIEW_LAT_V2)
    localStorage.removeItem(LS_MAP_VIEW_LNG_V2)
    localStorage.removeItem(LS_MAP_VIEW_LAT_LEGACY)
    localStorage.removeItem(LS_MAP_VIEW_LNG_LEGACY)
  } catch {
    /* ignore */
  }
}

function migrateMapViewV3ToV4() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_VIEW_LAT)) return
    const lat = localStorage.getItem(LS_MAP_VIEW_LAT_V3)
    const lng = localStorage.getItem(LS_MAP_VIEW_LNG_V3)
    if (lat && lng) {
      localStorage.setItem(LS_MAP_VIEW_LAT, lat)
      localStorage.setItem(LS_MAP_VIEW_LNG, lng)
    }
  } catch {
    /* ignore */
  }
}

/** Copia v2 → v3 si aún existe (cadena antigua). */
function migrateMapViewV2ToV3() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_VIEW_LAT_V3)) return
    const lat = localStorage.getItem(LS_MAP_VIEW_LAT_V2)
    const lng = localStorage.getItem(LS_MAP_VIEW_LNG_V2)
    if (lat && lng) {
      localStorage.setItem(LS_MAP_VIEW_LAT_V3, lat)
      localStorage.setItem(LS_MAP_VIEW_LNG_V3, lng)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Centro inicial del mapa.
 * - nukeStaleMapLS borra datos de versiones anteriores (primera carga → Angol por defecto).
 * - Si el usuario guardó v4 explícitamente (paneando), se respeta sin escape (puede ser Renaico).
 * - Datos legacy (pre-nukeStaleMapLS) pasan por escapeRenaicoDeadZone como último recurso.
 */
function readInitialMapCoords(): { lat: number; lng: number } {
  const fallback = { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  if (typeof window === 'undefined') return fallback
  nukeStaleMapLS()       // borra datos viejos de versiones anteriores; primera carga abre en Angol
  migrateMapViewV2ToV3()
  migrateMapViewV3ToV4()
  try {
    const readRaw = (latKey: string, lngKey: string): { lat: number; lng: number } | null => {
      const ml = localStorage.getItem(latKey)
      const mg = localStorage.getItem(lngKey)
      if (!ml || !mg) return null
      const lat = parseFloat(ml)
      const lng = parseFloat(mg)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null
      if (Math.abs(lat) < 1 || Math.abs(lat) > 90) return null
      return { lat, lng }
    }

    // v4 = guardado por el usuario en esta versión: respetar sin escape (incluso Renaico),
    // EXCEPTO si es exactamente el ancla hardcodeada (-37.6672,-72.573) que guardó código viejo.
    const v4 = readRaw(LS_MAP_VIEW_LAT, LS_MAP_VIEW_LNG)
    if (v4) return normalizeStoredMapCoords(v4.lat, v4.lng)

    // Legacy (pre-nukeStaleMapLS): aplicar escape por si acaso queda algún dato viejo de Renaico
    const legacy = readRaw(LS_MAP_VIEW_LAT_LEGACY, LS_MAP_VIEW_LNG_LEGACY)
    if (!legacy) return fallback
    const norm = normalizeStoredMapCoords(legacy.lat, legacy.lng)
    const escaped = escapeRenaicoDeadZone(norm.lat, norm.lng)
    persistMapViewStorage(escaped.lat, escaped.lng)
    return escaped
  } catch {
    /* ignore */
  }
  return fallback
}

export default function Home() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [loading, setLoading] = useState(true)
  /** true después de la primera carga exitosa: los refrescos siguientes no muestran el splash fullscreen. */
  const hasLoadedOnceRef = useRef(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ExpertDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)
  const [activeChatRequestIds, setActiveChatRequestIds] = useState<number[]>([])
  const [showChat, setShowChat] = useState(false)
  const [chatContext, setChatContext] = useState<{ description?: string; name?: string; avatar?: string | null; myRole?: 'cliente' | 'trabajador'; isSelf?: boolean }>({})
  const [nudge, setNudge] = useState<string | null>(null)
  const [nudgeFade, setNudgeFade] = useState(true)
  const [demandAlert, setDemandAlert] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [dashExpanded, setDashExpanded] = useState(false)
  const [dashHidden, setDashHidden] = useState(true)
  const [showSolicitudesPanel, setShowSolicitudesPanel] = useState(false)
  const [widgetCycle, setWidgetCycle] = useState(0)
  const [user, setUser] = useState<{ id: number; name: string; firstName: string; avatarUrl: string | null; provider: string; token: string } | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeSection, setActiveSection] = useState<'map' | 'profile' | 'jobs'>('map')
  const [workerProfile, setWorkerProfile] = useState<any>(null)
  const [isSeller, setIsSeller] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showVerificationCard, setShowVerificationCard] = useState(false)
  const [showWorkerProfileDetail, setShowWorkerProfileDetail] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showPublishDemand, setShowPublishDemand] = useState(false)
  const [dismissEmptyMap, setDismissEmptyMap] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingRequestId, setRatingRequestId] = useState<number | null>(null)
  const [ratingWorkerInfo, setRatingWorkerInfo] = useState<{ name: string; avatar: string | null } | null>(null)
  const [showCategoryRequiredModal, setShowCategoryRequiredModal] = useState(false)
  const [workerCategories, setWorkerCategories] = useState<number[]>([]) // Categorías del worker
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [showWelcomeSlides, setShowWelcomeSlides] = useState(false)
  const [showPublishSuccess, setShowPublishSuccess] = useState(false)
  const [notifBadge, setNotifBadge] = useState(0)
  const [chatBadge, setChatBadge] = useState(0)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showStoreOrders, setShowStoreOrders] = useState(false)
  // const [showTravelModeModal, setShowTravelModeModal] = useState(false)
  const [workerStatus, setWorkerStatus] = useState<'guest' | 'inactive' | 'intermediate' | 'active'>('guest') // Estados del trabajador
  const workerStatusRef = useRef<'guest' | 'inactive' | 'intermediate' | 'active'>('guest')
  const [activeTab, setActiveTab] = useState<TabKey>('map')
  const [statusLoading, setStatusLoading] = useState(false)
  const { toasts, toast, removeToast } = useToast()

  const playNotifSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch { /* ignore */ }
  }

  // Registrar token FCM cuando el usuario está logueado
  const authTokenForFcm = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  useNotifications(user ? authTokenForFcm : null)

  // Actualizar ref cuando cambia el estado
  useEffect(() => {
    workerStatusRef.current = workerStatus
  }, [workerStatus])

  const [userLat, setUserLat] = useState<number>(DEFAULT_MAP_LAT)
  const [userLng, setUserLng] = useState<number>(DEFAULT_MAP_LNG)
  const userLatRef = useRef<number>(DEFAULT_MAP_LAT)
  const userLngRef = useRef<number>(DEFAULT_MAP_LNG)
  const [workerCount, setWorkerCount] = useState<{ count: number; label: string } | null>(null)
  const chatNotifySeenIdsRef = useRef<Set<number>>(new Set())
  const chatNotifySubscribedIdsRef = useRef<Set<number>>(new Set())
  const mapRef = useRef<{ flyTo: (latlng: [number, number], zoom: number) => Promise<boolean> } | null>(null)
  /** Si el usuario movió el mapa a mano, no forzar flyTo a GPS/Renaico guardado (evita saltar al acercar a Angol). */
  const mapPannedByUserRef = useRef(false)
  
  // Exponer mapRef globalmente para debugging y acceso alternativo
  useEffect(() => {
    (window as any).mapRef = mapRef
    return () => {
      delete (window as any).mapRef
    }
  }, [])

  // Onboarding de primera vez
  useEffect(() => {
    const seen = localStorage.getItem('welcome_slides_done')
    if (!seen) setShowWelcomeSlides(true)
  }, [])
  const [highlightedRequestId, setHighlightedRequestId] = useState<number | null>(null)

  // Helper function para verificar autenticación y perfil completo
  const checkAuthAndProfile = useCallback((): { canInteract: boolean; reason?: 'login' | 'profile' } => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) {
      return { canInteract: false, reason: 'login' }
    }
    if (!user) {
      return { canInteract: false, reason: 'login' }
    }
    // Verificar perfil completo: necesita avatar y nombre
    if (!user.avatarUrl || !user.name || user.name === 'Usuario') {
      return { canInteract: false, reason: 'profile' }
    }
    return { canInteract: true }
  }, [user])

  // Fetch user profile from API
  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) { 
        localStorage.removeItem('auth_token')
        setUser(null)
        setWorkerStatus('guest')
        return
      }
      const data = await r.json()
      setUser({
        id: data.id,
        name: data.name || 'Usuario',
        firstName: (data.name || 'Usuario').split(' ')[0],
        avatarUrl: data.avatar || data.worker?.avatar || null,
        provider: data.provider || 'email',
        token,
      })
      
      // Verificar si necesita onboarding (trabajador sin datos mínimos)
      // Usa localStorage → aparecerá hasta que complete ubicación, categoría y tarifa
      const onboardingDoneKey = `onboarding_done_${data.id}`
      const onboardingDone = localStorage.getItem(onboardingDoneKey) === 'true'
      
      // Cargar datos del worker siempre, independiente del onboarding
      fetchWorkerData(token)

      if (onboardingDone) {
        return
      }
      
      const workerIntent = localStorage.getItem('worker_intent')
      
      if (data.worker) {
        const profileCompleted = data.worker.profile_completed !== undefined 
          ? data.worker.profile_completed 
          : (data.worker.category_id && data.worker.hourly_rate)
        
        if (!profileCompleted) {
          setTimeout(() => setShowOnboarding(true), 300)
          if (workerIntent) localStorage.removeItem('worker_intent')
        } else {
          localStorage.setItem(onboardingDoneKey, 'true')
        }
      } else if (workerIntent === 'activate' || workerIntent === 'register') {
        setTimeout(() => setShowOnboarding(true), 300)
        localStorage.removeItem('worker_intent')
      }
      
      // LÓGICA: Después del login, SIEMPRE empezar en inactive (plomo)
      // El usuario debe activar explícitamente el modo trabajo
      // No usar el estado guardado del backend - el usuario debe cambiarlo manualmente
      setWorkerStatus(prev => {
        if (prev !== 'guest') return prev // NUNCA sobrescribir si ya cambió
        return 'inactive' // Siempre empezar en PLOMO después de login
      })
      
      // Actualizar ref también
      workerStatusRef.current = workerStatus === 'guest' ? 'inactive' : workerStatus
    } catch {
      localStorage.removeItem('auth_token')
      setUser(null)
      setWorkerStatus('guest')
    }
  }, [])

  // Fetch worker data including categories
  const fetchWorkerData = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/worker/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.categories) {
          setWorkerCategories(data.data.categories.map((c: any) => c.id))
        }
        if (data.data?.id) {
          setWorkerProfile(data.data)
          setIsSeller(!!data.data.is_seller)
        }
      }
    } catch (err) {
      console.error('Error fetching worker data:', err)
    }
  }, [])

  // Handle OAuth callback en Capacitor via browserFinished + key en caché
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cap = (window as any).Capacitor
    if (!cap) return

    let removeBrowserListener: () => void = () => {}
    let removeUrlListener: () => void = () => {}

    // Cuando Chrome Custom Tab cierra, recuperar token del backend
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.addListener('browserFinished', async () => {
        const authKey = localStorage.getItem('pending_auth_key')
        if (!authKey) return
        localStorage.removeItem('pending_auth_key')
        try {
          const res = await fetch(`https://jobshours.com/api/auth/mobile-token?key=${authKey}`)
          if (res.ok) {
            const data = await res.json()
            if (data.token) {
              localStorage.setItem('auth_token', data.token)
              fetchUserProfile(data.token)
            }
          }
        } catch (e) {
          console.error('Error recuperando token:', e)
        }
      }).then((listener: any) => {
        removeBrowserListener = listener.remove
      })
    })

    // Deep link handler: jobshour://auth-success (desde mobile-success page) o jobshour://auth?token=...
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async (data: { url: string }) => {
        try {
          const url = new URL(data.url)
          // Caso 1: jobshour://auth-success?key=... → recuperar token del backend
          if (data.url.startsWith('jobshour://auth-success')) {
            const authKey = url.searchParams.get('key')
            if (!authKey) return
            const res = await fetch(`https://jobshours.com/api/auth/mobile-token?key=${authKey}`)
            if (res.ok) {
              const d = await res.json()
              if (d.token) { localStorage.setItem('auth_token', d.token); fetchUserProfile(d.token) }
            }
            return
          }
          // Caso 2: jobshour://auth?token=... (legacy)
          const token = url.searchParams.get('token')
          if (token) { localStorage.setItem('auth_token', token); fetchUserProfile(token) }
        } catch (e) {
          console.error('Error parsing deep link:', e)
        }
      }).then((listener: any) => {
        removeUrlListener = listener.remove
      })
    })

    return () => { removeBrowserListener(); removeUrlListener() }
  }, [fetchUserProfile])

  // Handle social login callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const loginSuccess = urlParams.get('login')
    const workerIntent = localStorage.getItem('worker_intent')

    if (token && loginSuccess === 'success') {
      localStorage.setItem('auth_token', token)
      window.history.replaceState({}, '', window.location.pathname)
      fetchUserProfile(token)
      
      // Si hay worker_intent guardado, abrir modal automáticamente
      if (workerIntent === 'activate') {
        localStorage.removeItem('worker_intent')
      }
    } else {
      const existingToken = localStorage.getItem('auth_token')
      if (existingToken) {
        fetchUserProfile(existingToken)
      } else {
        // Auto-login con credenciales guardadas
        const savedEmail = localStorage.getItem('saved_email')
        const savedPassword = localStorage.getItem('saved_password')
        if (savedEmail && savedPassword) {
          fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail, password: savedPassword })
          })
          .then(r => r.json())
          .then(data => {
            if (data.token) {
              localStorage.setItem('auth_token', data.token)
              fetchUserProfile(data.token)
            }
          })
          .catch(() => {
            // Silencioso - si falla, no mostrar error
          })
        }
      }
    }
  }, [fetchUserProfile])

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setWorkerStatus('guest')
    alert('Sesión cerrada')
  }

  // Resetear posición del mapa — borra todos los datos de LS y recarga
  const handleResetMapLocation = () => {
    clearMapLocalStorageFull()
    window.location.reload()
  }

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!user || !token) return

    const sameIds = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
      return true
    }

    const sync = () => {
      fetch(`${API_BASE}/api/v1/requests/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(r => r.json())
        .then(data => {
          const list = data?.data ?? []
          const activeList = list.filter((sr: any) => ['pending', 'accepted', 'in_progress'].includes(sr.status))
          const ids = activeList
            .map((sr: any) => sr.id)
            .filter((id: any) => typeof id === 'number')
            .sort((a: number, b: number) => b - a)
            .slice(0, 5)

          setActiveChatRequestIds(prev => (sameIds(prev, ids) ? prev : ids))

          console.log('[ChatNotify] sync active request ids', ids)

          const mostRecentId = ids[0]
          if (typeof mostRecentId === 'number' && mostRecentId !== activeRequestId) setActiveRequestId(mostRecentId)

          // Detectar servicios recién completados para mostrar modal de calificación
          const completedList = list.filter((sr: any) => sr.status === 'completed')
          completedList.forEach((sr: any) => {
            const storageKey = `rated_${sr.id}`
            const alreadyRated = localStorage.getItem(storageKey)
            
            if (!alreadyRated && sr.worker) {
              // Verificar si ya tiene reseña
              fetch(`${API_BASE}/api/v1/workers/${sr.worker.id}/reviews`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
                .then(r => r.json())
                .then(reviewsData => {
                  const hasReview = reviewsData.data?.some((r: any) => r.service_request_id === sr.id)
                  
                  if (!hasReview) {
                    // Mostrar modal después de 2 segundos
                    setTimeout(() => {
                      setRatingRequestId(sr.id)
                      setRatingWorkerInfo({
                        name: sr.worker.name || 'Trabajador',
                        avatar: sr.worker.avatar,
                      })
                      setShowRatingModal(true)
                    }, 2000)
                  }
                })
                .catch(() => {
                  // Si falla, mostrar modal de todas formas
                  setTimeout(() => {
                    setRatingRequestId(sr.id)
                    setRatingWorkerInfo({
                      name: sr.worker?.name || 'Trabajador',
                      avatar: sr.worker?.avatar || null,
                    })
                    setShowRatingModal(true)
                  }, 2000)
                })
            }
          })
        })
        .catch((e) => {
          console.error('[ChatNotify] sync failed', e)
        })
    }

    sync()
    const interval = setInterval(sync, 8000)
    return () => clearInterval(interval)
  }, [user, activeRequestId])

  useEffect(() => {
    if (!user?.id) return

    let echo: any = null
    let mounted = true
    let hideTimer: any = null

    import('@/lib/echo').then(({ getEcho }) => {
      if (!mounted) return
      echo = getEcho()
      if (!echo) return

      const pusher = (echo as any)?.connector?.pusher

      const notify = (title: string, body?: string) => {
        toast(title, 'info', body, 7000)
        setNotifBadge(prev => prev + 1)
        if (hideTimer) clearTimeout(hideTimer)

        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: body || '', icon: '/icon-192x192.png' })
          }
        } catch {
          // ignore
        }
      }

      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {})
        }
      } catch {
        // ignore
      }

      const workerChannel = echo.private(`worker.${user.id}`)
      const userChannel = echo.private(`user.${user.id}`)

      try {
        const workerPusherName = `private-worker.${user.id}`
        const userPusherName = `private-user.${user.id}`
        const rawWorker = pusher?.channel?.(workerPusherName)
        const rawUser = pusher?.channel?.(userPusherName)

        rawWorker?.bind('pusher:subscription_succeeded', () => console.log('[Notifications] subscription_succeeded', { channel: workerPusherName }))
        rawWorker?.bind('pusher:subscription_error', (status: any) => console.error('[Notifications] subscription_error', { channel: workerPusherName, status }))

        rawUser?.bind('pusher:subscription_succeeded', () => console.log('[Notifications] subscription_succeeded', { channel: userPusherName }))
        rawUser?.bind('pusher:subscription_error', (status: any) => console.error('[Notifications] subscription_error', { channel: userPusherName, status }))
      } catch (e) {
        console.error('[Notifications] Failed to bind subscription events', e)
      }

      workerChannel
        .listen('.request.new', (e: any) => {
          console.log('[Notifications] .request.new', e)
          const reqId = e?.id
          if (typeof reqId === 'number') setActiveRequestId(reqId)
          const clientName = e?.client?.name || e?.client_name || ''
          const desc = e?.description ? String(e.description).slice(0, 60) : ''
          notify(
            `🔔 Nueva solicitud${clientName ? ` de ${clientName}` : ''}`,
            desc || 'Alguien quiere contratarte'
          )
          playNotifSound()
        })
        .listen('.request.updated', (e: any) => {
          console.log('[Notifications] .request.updated (worker)', e)
          const statusMap: Record<string, string> = {
            cancelled: '❌ Solicitud cancelada por el cliente',
            completed: '🎉 Servicio marcado como completado',
          }
          notify('Solicitud actualizada', statusMap[e?.status] || `Estado: ${e?.status ?? 'actualizado'}`)
        })

      userChannel
        .listen('.request.updated', (e: any) => {
          console.log('[Notifications] .request.updated (user)', e)
          const statusMap: Record<string, string> = {
            accepted: '✅ ¡Tu solicitud fue aceptada!',
            rejected: '❌ Tu solicitud fue rechazada',
            completed: '🎉 Servicio completado. ¡Califica al trabajador!',
            cancelled: '🚫 Solicitud cancelada',
          }
          notify('Actualización de solicitud', statusMap[e?.status] || `Estado: ${e?.status ?? 'actualizado'}`)
        })
    })

    return () => {
      mounted = false
      if (hideTimer) clearTimeout(hideTimer)
      if (echo) {
        try {
          echo.leave(`worker.${user.id}`)
          echo.leave(`user.${user.id}`)
        } catch {
          // ignore
        }
      }
    }
  }, [user?.id])

  // Listener tiempo real — canal público 'workers' → actualiza pines del mapa sin polling
  useEffect(() => {
    let echo: any = null
    let mounted = true

    import('@/lib/echo').then(({ getEcho }) => {
      if (!mounted) return
      echo = getEcho()
      if (!echo) return

      echo.channel('workers').listen('.worker.updated', (e: any) => {
        if (!e?.worker_id) return
        // Ignorar evento del propio usuario — ya se actualiza localmente al cambiar estado
        if (e.user_id && user?.id && e.user_id === user.id) return
        const newStatus: 'active' | 'intermediate' | 'inactive' =
          e.status === 'intermediate' ? 'intermediate' :
          e.status === 'inactive' ? 'inactive' :
          e.is_active ? 'active' : 'inactive'
        setPoints(prev => prev.map(p => {
          if (p.id !== e.worker_id || p.pin_type === 'demand') return p
          return {
            ...p,
            status: newStatus,
            pos: e.lat && e.lng ? { lat: e.lat, lng: e.lng } : p.pos,
          }
        }))
        fetchWorkerCount(userLatRef.current, userLngRef.current)
      })
    })

    return () => {
      mounted = false
      if (echo) {
        try { echo.leave('workers') } catch { /* ignore */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- no necesita reconectar cuando el usuario mueve el mapa
  }, [])

  // Contador workers verdes cercanos — polling cada 45s + cacheado en backend
  const fetchWorkerCount = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/experts/count?lat=${lat}&lng=${lng}&radius=10`)
      if (!res.ok) return
      const data = await res.json()
      setWorkerCount({ count: data.count, label: data.label })
    } catch {
      // silencioso — no romper UI
    }
  }, [])

  useEffect(() => {
    fetchWorkerCount(userLat, userLng)
    const interval = setInterval(() => fetchWorkerCount(userLat, userLng), 45_000)
    return () => clearInterval(interval)
  }, [userLat, userLng, fetchWorkerCount])

  useEffect(() => {
    if (!user?.id) return
    if (!activeChatRequestIds.length) return

    let echo: any = null
    let mounted = true
    const seenMessageIds = chatNotifySeenIdsRef.current
    const subscribedIds = chatNotifySubscribedIdsRef.current

    import('@/lib/echo').then(({ getEcho }) => {
      if (!mounted) return
      echo = getEcho()
      if (!echo) return

      const onMessage = (e: any) => {
        const msg = e?.message ?? e
        const msgId = msg?.id
        const senderId = msg?.sender_id

        if (typeof msgId !== 'number') return
        if (seenMessageIds.has(msgId)) return
        seenMessageIds.add(msgId)

        if (senderId === user.id) return

        const shouldNotify = !showChat || (typeof document !== 'undefined' && document.hidden)

        const senderName = msg?.sender_name ? String(msg.sender_name) : ''
        const text = msg?.body ? String(msg.body).slice(0, 80) : 'Nuevo mensaje'
        const title = senderName ? `💬 ${senderName}` : '💬 Nuevo mensaje'

        // Siempre incrementar badge aunque el chat esté abierto
        setChatBadge(prev => prev + 1)

        if (!shouldNotify) return

        console.log('[ChatNotify] message.new', { id: msgId, sender: senderName })
        toast(title, 'info', text, 5000)
        playNotifSound()

        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: text, icon: '/icon-192x192.png' })
          }
        } catch {
          // ignore
        }
      }

      // Subscribe new ids (avoid leaving all channels on every poll)
      activeChatRequestIds.forEach((rid) => {
        if (subscribedIds.has(rid)) return
        subscribedIds.add(rid)
        console.log('[ChatNotify] subscribing', { channel: `private-chat.${rid}` })
        echo.private(`chat.${rid}`).listen('.message.new', onMessage)
      })
    })

    return () => {
      mounted = false
      if (echo) {
        try {
          activeChatRequestIds.forEach((rid) => echo.leave(`chat.${rid}`))
        } catch {
          // ignore
        }
      }
    }
  }, [user?.id, activeChatRequestIds, showChat])
  // Tips de Utilidad — enseñan al usuario a decidir, NO repiten lo del mapa
  const UTILITY_TIPS = [
    { icon: '🛡️', label: 'Confianza', text: '¿Sabías que el "Fresh Score" solo cuenta los últimos 10 servicios? Así premiamos a quien se esfuerza por mejorar cada día.' },
    { icon: '🔒', label: 'Seguridad', text: 'Usa el Nickname para tu primer contacto. Tu privacidad es nuestra prioridad hasta que tú decidas cerrar el trato.' },
    { icon: '⏰', label: 'Eficiencia', text: '¿Necesitas algo para después? Busca a alguien en "Amarillo" y coordina por chat con calma.' },
    { icon: '🤝', label: 'Comunidad', text: 'Si un vecino hizo un gran trabajo, califícalo. Tu reseña ayuda a que el talento honesto sea más visible.' },
    { icon: '🔍', label: 'Acción', text: '¿No encuentras lo que buscas? Intenta cambiar de categoría arriba; a veces el talento que necesitas tiene varias habilidades.' },
  ]

  // Nudge ticker: fetch random nudge every 12s
  useEffect(() => {
    const fetchNudge = () => {
      fetch(`${API_BASE}/api/v1/nudges/random`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(data => {
          // NudgeController ahora devuelve {message, id, category} directamente
          if (data.message) {
            setNudgeFade(false)
            setTimeout(() => {
              setNudge(data.message)
              setNudgeFade(true)
            }, 300)
          }
        })
        .catch((err) => {
          console.error('Error fetching nudge:', err);
        })
    }
    fetchNudge()
    const interval = setInterval(fetchNudge, 12000)
    return () => clearInterval(interval)
  }, [])

  // Fetch categorías desde API v1
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/categories`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        // CategoryController ahora devuelve array directo
        setCategories(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Error fetching categories:', err);
      })
  }, [])

  // Fetch puntos ligeros desde API v1 (workers + demandas doradas)
  const fetchNearbyRef = useRef<{ lastCall: number; timeoutId: NodeJS.Timeout | null; abortController: AbortController | null }>({ 
    lastCall: 0, 
    timeoutId: null,
    abortController: null,
  })
  
  const fetchNearby = useCallback((categoryId?: number | null, overrideLat?: number, overrideLng?: number) => {
    // Throttle: máximo una llamada cada 2 segundos
    const now = Date.now()
    const timeSinceLastCall = now - fetchNearbyRef.current.lastCall
    const throttleMs = 2000

    if (timeSinceLastCall < throttleMs && fetchNearbyRef.current.lastCall !== 0) {
      if (fetchNearbyRef.current.timeoutId) clearTimeout(fetchNearbyRef.current.timeoutId)
      const delay = throttleMs - timeSinceLastCall
      console.log(`⏭️ fetchNearby: throttling ${Math.round(delay)}ms`)
      fetchNearbyRef.current.timeoutId = setTimeout(() => {
        fetchNearbyRef.current.timeoutId = null
        fetchNearbyRef.current.lastCall = 0
        fetchNearby(categoryId, overrideLat, overrideLng)
      }, delay)
      return
    }

    if (fetchNearbyRef.current.timeoutId) {
      clearTimeout(fetchNearbyRef.current.timeoutId)
      fetchNearbyRef.current.timeoutId = null
    }

    fetchNearbyRef.current.lastCall = now

    // Cancelar fetch anterior si existe
    if (fetchNearbyRef.current.abortController) {
      fetchNearbyRef.current.abortController.abort()
    }
    const abortController = new AbortController()
    fetchNearbyRef.current.abortController = abortController
    
    // Solo mostrar la pantalla de carga en la primera vez; refrescos siguientes son silenciosos
    if (!overrideLat && !hasLoadedOnceRef.current) setLoading(true)
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    
    // Usar coordenadas override (mover mapa), luego GPS usuario (ref), luego fallback
    const lat = overrideLat ?? userLatRef.current ?? DEFAULT_MAP_LAT
    const lng = overrideLng ?? userLngRef.current ?? DEFAULT_MAP_LNG
    
    
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: '50',
    })
    if (categoryId) params.append('categories[]', String(categoryId))
    
    // Headers con autenticación para incluir al usuario actual en los resultados
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    // Fetch workers y demandas en paralelo
    Promise.all([
      fetch(`${API_BASE}/api/v1/experts/nearby?${params}`, { headers, signal: abortController.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch(`${API_BASE}/api/v1/demand/nearby?${params}`, { headers, signal: abortController.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .catch(() => ({ data: [], meta: {} })) // Si falla, continuar sin demandas
    ])
      .then(([expertsData, demandsData]) => {
        // Combinar workers y demandas
        const workers = (expertsData.data ?? []).map((w: any) => ({
          ...w,
          pin_type: (w.pin_type ?? 'worker') as any,
          // Incluir información de active_route si existe (modo viaje)
          active_route: w.active_route || null,
          // Asegurar que user_id esté disponible
          user_id: w.user_id || null,
        }))
        
        const demands = (demandsData.data ?? []).map((d: any) => ({
          id: d.id,
          pos: d.pos,
          name: d.client_name,
          avatar: d.client_avatar,
          price: d.offered_price,
          category_color: d.category_color,
          category_slug: d.category_slug,
          category_name: d.category_name,
          fresh_score: 0,
          status: 'demand' as const,
          pin_type: 'demand' as const,
          urgency: d.urgency,
          travel_role: d.travel_role ?? null,
          payload: d.payload ?? null,
          description: d.description,
          distance_km: d.distance_km,
        }))
        
        // Logs reducidos - solo si hay problema
        if (user && workers.length > 0) {
          const userInResults = workers.find((w: any) => {
            return (w.user_id && w.user_id === user.id) || (w.id && w.id === user.id)
          })
          if (!userInResults && workerStatus !== 'inactive') {
            // Solo mostrar warning si el usuario debería estar visible pero no está
            console.warn('⚠️ Usuario no visible en mapa. Estado:', workerStatus)
          }
        }
        
        // Actualizar puntos directamente
        setPoints([...workers, ...demands])
        setMeta(expertsData.meta ?? null)
        hasLoadedOnceRef.current = true
        setLoading(false)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return // fetch cancelado, ignorar
        console.error('Error fetching experts/demands:', err);
        hasLoadedOnceRef.current = true
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- usa userLatRef/userLngRef para evitar recrear en cada moveend
  }, [user])

  const mapViewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMapViewportMove = useCallback(
    (lat: number, lng: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) < 0.01) return
      mapPannedByUserRef.current = true
      logMapEvent(`moveend→save(${lat.toFixed(4)},${lng.toFixed(4)})`)
      try {
        localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
        localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
      } catch {
        /* ignore */
      }
      userLatRef.current = lat
      userLngRef.current = lng
      setUserLat(lat)
      setUserLng(lng)

      if (mapViewportTimerRef.current) clearTimeout(mapViewportTimerRef.current)
      mapViewportTimerRef.current = setTimeout(() => {
        mapViewportTimerRef.current = null
        fetchNearby(activeCategory, lat, lng)
      }, 400)
    },
    [activeCategory, fetchNearby],
  )

  const mapDebugRef = useRef<HTMLDivElement | null>(null)
  const logMapEvent = (msg: string) => {
    console.error('[MAP-DEBUG] ' + msg)
    if (mapDebugRef.current) {
      mapDebugRef.current.insertAdjacentHTML('afterbegin',
        `<div style="font-size:10px;border-bottom:1px solid #333;padding:1px 0">${msg}</div>`)
      // Mantener solo 8 líneas
      const children = mapDebugRef.current.children
      while (children.length > 8) mapDebugRef.current.removeChild(children[children.length - 1])
    }
  }

  const handleLeafletMapReady = useCallback((map: LeafletMap) => {
    const v = readInitialMapCoords()
    const lsLat = typeof window !== 'undefined' ? localStorage.getItem('jobs_map_view_lat_v4') : null
    const lsVer = typeof window !== 'undefined' ? localStorage.getItem(LS_MAP_LS_VER_KEY) : null
    logMapEvent(`setView(${v.lat.toFixed(4)},${v.lng.toFixed(4)}) LS_v4=${lsLat} ver=${lsVer}`)
    map.setView([v.lat, v.lng], 15, { animate: false })
    // Interceptar setView/flyTo para rastrear movimientos inesperados
    const origSetView = map.setView.bind(map)
    const origFlyTo = map.flyTo.bind(map)
    ;(map as any).setView = (latlng: any, zoom: any, opts: any) => {
      logMapEvent(`setView(${JSON.stringify(latlng)},${zoom})`)
      return origSetView(latlng, zoom, opts)
    }
    ;(map as any).flyTo = (latlng: any, zoom: any, opts: any) => {
      logMapEvent(`flyTo(${JSON.stringify(latlng)},${zoom})`)
      return origFlyTo(latlng, zoom, opts)
    }
    requestAnimationFrame(() => map.invalidateSize())
  }, [])

  // Sincroniza estado + primera carga nearby con las mismas coords que guardamos en LS (no uses solo userLat del primer render).
  useEffect(() => {
    let cancelled = false
    const v = readInitialMapCoords()
    userLatRef.current = v.lat
    userLngRef.current = v.lng
    setUserLat(v.lat)
    setUserLng(v.lng)
    fetchNearbyRef.current.lastCall = 0
    queueMicrotask(() => {
      if (!cancelled) fetchNearby(null, v.lat, v.lng)
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem('user_lat', String(pos.coords.latitude))
            localStorage.setItem('user_lng', String(pos.coords.longitude))
          } catch {
            /* ignore */
          }
        },
        () => {},
        { timeout: 12000, maximumAge: 600_000 },
      )
    }

    return () => {
      cancelled = true
      if (mapViewportTimerRef.current) {
        clearTimeout(mapViewportTimerRef.current)
        mapViewportTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje: una sola carga inicial / restauración
  }, [])

  // Listener para abrir PublishDemand desde el estado vacío del feed
  useEffect(() => {
    const handler = () => setShowPublishDemand(true)
    window.addEventListener('open-publish-demand', handler)
    return () => window.removeEventListener('open-publish-demand', handler)
  }, [])

  // Filtro local por búsqueda de texto (el propio marcador siempre visible para poder abrirlo y ver Mi perfil / Ver tienda)
  const filtered = (() => {
    let result = points
    
    // Ya no ocultamos el pin del usuario cuando está inactive: así puede hacer clic y ver modal con Mi perfil / Ver mi tienda
    
    // Filtro por búsqueda de texto
    const q = searchQuery.trim().toLowerCase()
    if (!q) return result
    // Si busca el nombre de la ciudad, mostrar todos (ya filtrados)
    if (meta?.city && meta.city.toLowerCase().includes(q)) return result
    return result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category_slug && p.category_slug.toLowerCase().includes(q))
    )
  })()

  const handleCategoryClick = (catId: number) => {
    const next = activeCategory === catId ? null : catId
    setActiveCategory(next)
    setSelectedDetail(null)
    fetchNearby(next)
  }

  // Fetch detalle on-demand al hacer click en marcador
  const handlePointClick = async (point: MapPoint) => {
    // Premium store: solo abrir el negocio (sin modal de worker/demand)
    if (point.pin_type === 'premium_store') {
      setSelectedDetail(null)
      setLoadingDetail(false)
      const url = point.store_url || point.payload?.store_url || 'https://dondemorales.cl'
      try {
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch {}
      return
    }
    setLoadingDetail(true)
    setSelectedDetail(null)
    try {
      // Obtener token si existe para enviar en headers
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const headers: HeadersInit = {
        'Accept': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Si es demanda dorada, usar endpoint de demandas
      if (point.pin_type === 'demand') {
        const url = `/api/v1/demand/${point.id}`
        console.log('📡 Fetching demand:', url)
        const r = await fetch(url, { headers })
        
        // Verificar si la respuesta es OK
        if (!r.ok) {
          const errorText = await r.text()
          console.error('❌ Error HTTP:', r.status, errorText)
          throw new Error(`Error ${r.status}: ${r.statusText}`)
        }
        
        // Intentar parsear como JSON
        let data
        try {
          data = await r.json()
        } catch (jsonErr) {
          console.error('❌ Error parseando JSON:', jsonErr)
          throw new Error('La respuesta del servidor no es válida')
        }
        
        if (data.data) {
          // Convertir formato de demanda a formato de detalle
          setSelectedDetail({
            id: data.data.id,
            name: data.data.client?.name || 'Cliente',
            nickname: null,
            avatar: data.data.client?.avatar || null,
            client_id: data.data.client?.id || data.data.client_id || null,
            phone: data.data.client?.phone || null,
            title: data.data.description || 'Sin descripción',
            bio: '',
            skills: [],
            hourly_rate: data.data.offered_price || 0,
            fresh_score: 0,
            fresh_score_count: 0,
            rating_count: 0,
            total_jobs: 0,
            is_verified: false,
            status: 'demand' as const,
            category: data.data.category || { name: 'Sin categoría', color: '#6b7280', slug: '', icon: '' },
            videos_count: 0,
            pos: data.data.pos || point.pos,
            travel_role: data.data.travel_role ?? null,
            payload: data.data.payload ?? null,
            microcopy: `Demanda: ${data.data.description || 'Sin descripción'}`,
          })
          console.log('✅ Detail cargado:', data.data.client?.name)
        } else {
          console.warn('⚠️ No hay data en la respuesta:', data)
        }
      } else {
        // Worker normal
        const url = `/api/v1/experts/${point.id}`
        console.log('📡 Fetching expert:', url)
        const r = await fetch(url, { headers })
        
        if (!r.ok) {
          const errorText = await r.text()
          console.error('❌ Error HTTP:', r.status, errorText)
          throw new Error(`Error ${r.status}: ${r.statusText}`)
        }
        
        let data
        try {
          data = await r.json()
        } catch (jsonErr) {
          console.error('❌ Error parseando JSON:', jsonErr)
          throw new Error('La respuesta del servidor no es válida')
        }
        
        if (data.data) {
          setSelectedDetail(data.data)
          console.log('✅ Detail cargado:', data.data.name)
        }
      }
    } catch (err) {
      console.error('❌ Error fetching detail:', err)
      // Mostrar mensaje de error al usuario
      toast(err instanceof Error ? err.message : 'Error al cargar los detalles', 'error')
    }
    setLoadingDetail(false)
    console.log('🏁 Loading detail finalizado')
  }

  // Vitality counts
  const activeCount = filtered.filter(p => p.status === 'active').length
  const intermediateCount = filtered.filter(p => p.status === 'intermediate').length

  // Rotate tips every 10s + widget cycle every 25s
  useEffect(() => {
    const tipTimer = setInterval(() => setTipIndex(i => (i + 1) % 5), 10000)
    const widgetTimer = setInterval(() => setWidgetCycle(c => (c + 1) % 4), 25000)
    return () => { clearInterval(tipTimer); clearInterval(widgetTimer) }
  }, [])

  // Map click = dismiss floating card
  const handleMapClick = useCallback(() => {
    setSelectedDetail(null)
    setLoadingDetail(false)
  }, [])

  // Tab navigation handler
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    if (tab === 'map') { setDashHidden(true); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'feed') { setDashHidden(false); setShowSolicitudesPanel(false); setActiveSection('map') }
    if (tab === 'requests') { setDashHidden(true); setShowSolicitudesPanel(true); setActiveSection('map'); setChatBadge(0) }
    if (tab === 'profile') {
      if (!user) { setShowLoginModal(true); return }
      setActiveSection('profile')
    }
  }, [user])

  // Worker status change handler (replaces inline fetch + alert)
  const handleWorkerStatusChange = useCallback(async (next: 'active' | 'intermediate' | 'inactive') => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) { setShowLoginModal(true); return }
    if (next === 'active' && workerCategories.length === 0) {
      setShowCategoryRequiredModal(true); return
    }
    const apiStatus = next === 'intermediate' ? 'listening' : next
    setStatusLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/worker/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: apiStatus, lat: userLat || DEFAULT_MAP_LAT, lng: userLng || DEFAULT_MAP_LNG, categories: next === 'active' ? workerCategories : undefined }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setWorkerStatus(next)
        // Actualizar el marcador propio inmediatamente sin esperar fetchNearby
        if (user) {
          setPoints(prev => prev.map(p => {
            const isMe = (p.user_id && p.user_id === user.id) || p.id === user.id
            if (!isMe || p.pin_type === 'demand') return p
            return { ...p, status: next as 'active' | 'intermediate' | 'inactive' }
          }))
        }
        fetchNearby(activeCategory)
        const labels = { active: '🟢 Disponibilidad Inmediata activada', intermediate: '🔵 Disponibilidad Flexible activada', inactive: '⚫ Te desconectaste del mapa' }
        toast(labels[next], next === 'inactive' ? 'info' : 'success')
      } else {
        toast(data.message || 'Error al actualizar estado', 'error')
      }
    } catch {
      toast('Error de conexión', 'error')
    } finally {
      setStatusLoading(false)
    }
  }, [workerCategories, userLat, userLng, activeCategory, fetchNearby, toast])

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* ── WORKER PROFILE HUB (MODERNO) ── */}
      {activeSection === 'profile' && user && (
        <WorkerProfileHub 
          user={user} 
          onClose={() => setActiveSection('map')}
          onSellerChange={(val) => setIsSeller(val)}
          onCategorySelected={() => {
            // Cuando se selecciona una categoría, refrescar datos del worker
            const token = localStorage.getItem('auth_token')
            if (token) {
              fetchWorkerData(token) // Refrescar categorías
            }
          }}
        />
      )}

      {/* ── WORKER JOBS SECTION ── */}
      {activeSection === 'jobs' && user && (
        <WorkerJobs user={user} onClose={() => setActiveSection('map')} />
      )}

      {/* ── CATEGORY MANAGEMENT ── */}
      {showCategoryManagement && (
        <CategoryManagement onClose={() => setShowCategoryManagement(false)} />
      )}

      {/* ── PUBLISH DEMAND MODAL ── */}
      {showPublishDemand && (
        <PublishDemandModal
          userLat={userLat}
          userLng={userLng}
          categories={categories}
          onClose={() => setShowPublishDemand(false)}
          onPublished={() => {
            setShowPublishDemand(false)
            setShowPublishSuccess(true)
            setTimeout(() => setShowPublishSuccess(false), 3000)
            toast('Demanda publicada', 'success', 'Aparecerá en el mapa en unos segundos.')
            
            // Recargar feed y mapa después de publicar
            setTimeout(() => {
              fetchNearby()
              if (dashExpanded) {
                // Recargar feed si está expandido
                const event = new Event('reload-feed')
                window.dispatchEvent(event)
              }
            }, 1000)
          }}
        />
      )}

      {/* ── MAPA FULLSCREEN (always visible in background) ── */}
      <div className="absolute inset-0 pt-[180px] pb-[68px]">
        <MapSection
          ref={mapRef}
          points={filtered}
          onPointClick={handlePointClick}
          onMapClick={handleMapClick}
          highlightedId={highlightedRequestId}
          onLeafletReady={handleLeafletMapReady}
          onMapMove={handleMapViewportMove}
        />
      </div>

      {/* ── MENSAJE MAPA VACÍO ── */}
      {activeTab === 'map' && !loading && filtered.length === 0 && !selectedDetail && !dismissEmptyMap && (
        <div className="absolute inset-0 pt-[180px] pb-[68px] flex items-center justify-center pointer-events-none z-[150]">
          <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-2xl px-6 py-5 mx-6 text-center shadow-2xl pointer-events-auto">
            <button onClick={() => setDismissEmptyMap(true)} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition">✕</button>
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-white font-black text-base mb-1">No hay trabajadores cerca</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">Mueve el mapa para buscar en otra zona, o publica lo que necesitas y te contactarán.</p>
            <button
              onClick={() => { const a = checkAuthAndProfile(); if (!a.canInteract) { if (a.reason === 'login') setShowLoginModal(true); else setShowOnboarding(true); return; } setShowPublishDemand(true) }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-xs transition active:scale-95"
            >💰 Publicar lo que necesito</button>
          </div>
        </div>
      )}


      {/* ── HEADER MODERNO CON GRADIENTES ── */}
      <div className="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
        {/* Header Bar con fondo slate oscuro */}
        <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center justify-between">
            {/* Botón menú */}
            <button
              onClick={() => { setShowSidebar(!showSidebar); setNotifBadge(0) }}
              className="relative w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition active:scale-95"
              aria-label="Menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              {notifBadge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                  {notifBadge > 9 ? '9+' : notifBadge}
                </span>
              )}
            </button>

            {/* Logo JOBSHOURS — Jobs blanco + H-reloj-urs teal */}
            <div className="flex items-center font-black tracking-tight text-2xl leading-none gap-1">
              <span className="text-white">Jobs</span>
              <span className="text-teal-400 flex items-center">
                <span>H</span>
                {/* Reloj como la "O" */}
                <span className="relative inline-flex items-center justify-center mx-0.5" style={{ width: 28, height: 28 }}>
                  <span className="absolute inset-0 rounded-full border-[3px] border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.35)]" />
                  <span className="clock-hand-long" style={{ position: 'absolute', bottom: '50%', left: '50%', width: '2.5px', height: '42%', background: 'linear-gradient(to top,#5eead4,#fbbf24)', borderRadius: '2px', transformOrigin: 'bottom center' }} />
                  <span className="clock-hand-short" style={{ position: 'absolute', bottom: '50%', left: '50%', width: '2.5px', height: '28%', background: '#f1f5f9', borderRadius: '2px', transformOrigin: 'bottom center' }} />
                  <span className="rounded-full bg-amber-400 z-10" style={{ position: 'relative', width: 5, height: 5 }} />
                </span>
                <span>urs</span>
              </span>
            </div>

            {/* Auth button */}
            {!user ? (
              <button
                onClick={() => setShowLoginModal(!showLoginModal)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-[0_0_12px_rgba(45,212,191,0.3)]"
              >
                Ingresar
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
              </button>
            ) : (
              <button
                onClick={() => setShowSidebar(true)}
                className="flex items-center gap-2 pr-3 pl-1 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition active:scale-95"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-7 h-7 rounded-lg object-cover" alt={user.firstName} />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-black text-sm">
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-300 max-w-[60px] truncate">{user.firstName}</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de búsqueda + contador */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-slate-800 rounded-xl px-3.5 py-2 border border-slate-700">
              <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Buscar servicios cercanos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-500 ml-2.5"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300 ml-2 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {workerCount !== null && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full text-xs font-bold text-teal-400">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block" />
                {workerCount.label}
              </span>
            )}
          </div>
        </div>

        {/* Spacer eliminado — contador ahora está integrado en la barra de búsqueda */}
        {false && workerCount !== null && (
          <div className="hidden"></div>
        )}

        {/* Filtros de categorías */}
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 pointer-events-auto border-b border-slate-800/50">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => handleCategoryClick(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === c.id
                    ? 'bg-teal-500/25 text-teal-300 border border-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.15)]'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <span className="text-sm">{ICON_MAP[c.icon] || '📌'}</span>
                <span>{c.name}</span>
                {c.active_count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === c.id ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-700 text-slate-500'}`}>
                    {c.active_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOGIN MODAL ── */}
      {showLoginModal && !user && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={(_user, token) => {
            localStorage.setItem('auth_token', token)
            fetchUserProfile(token)
            setShowLoginModal(false)
          }}
          onSwitchToRegister={() => { setShowLoginModal(false); toast('Registro disponible en jobshours.com', 'info') }}
          onForgotPassword={() => { window.open('https://jobshours.com/recuperar', '_blank') }}
        />
      )}

      {/* Toasts reemplazan el demandAlert banner — ver ToastContainer al final */}

      {/* ══════════════════════════════════════════════
          WORKER DETAIL — Bottom Sheet moderno
         ══════════════════════════════════════════════ */}
      {(selectedDetail || loadingDetail) && (
        <>
          {/* Backdrop tap-to-close */}
          <div
            className="fixed inset-0 z-[108] bg-black/30 backdrop-blur-[2px]"
            onClick={() => { setSelectedDetail(null); setLoadingDetail(false) }}
          />
          <div className="fixed left-0 right-0 z-[109] bottom-[68px] animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.22)] max-h-[72vh] overflow-y-auto">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {loadingDetail && !selectedDetail ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin w-8 h-8 border-[3px] border-green-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-400">Cargando perfil...</p>
                </div>
              ) : selectedDetail && (() => {
                const _catColor = selectedDetail.category?.color || '#6b7280'
                const _isDemand = selectedDetail.status === 'demand'
                return (
                <div className="pb-6">
                  {/* Hero banner con gradiente de categoría */}
                  <div className="px-5 pt-4 pb-5 relative" style={{ background: `linear-gradient(135deg, ${_catColor}15 0%, ${_catColor}05 100%)` }}>
                    {/* Categorías top-right — todas las habilidades */}
                    <div className="absolute top-3 right-4 flex flex-wrap justify-end gap-1 max-w-[55%]">
                      {(selectedDetail.categories && selectedDetail.categories.length > 0
                        ? selectedDetail.categories
                        : selectedDetail.category ? [selectedDetail.category] : []
                      ).map((cat, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: `${cat.color || _catColor}25`, color: cat.color || _catColor }}>
                          <span>{ICON_MAP[cat.icon] || '⚙️'}</span>
                          <span>{cat.display_name || cat.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Avatar + info */}
                    <div className="flex items-center gap-4 mt-1">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: `3px solid ${_catColor}60`, boxShadow: `0 8px 24px ${_catColor}30` }}>
                          <img src={selectedDetail.avatar || `https://i.pravatar.cc/150?u=${selectedDetail.id}`} alt={selectedDetail.name} className="w-full h-full object-cover" />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full shadow-md ${
                          selectedDetail.status === 'active' ? 'bg-green-500 animate-pulse' :
                          selectedDetail.status === 'intermediate' ? 'bg-sky-400 animate-pulse' :
                          _isDemand ? 'bg-amber-400' : 'bg-gray-300'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-gray-900 text-lg leading-tight">{selectedDetail.name}</h3>
                          {user && selectedDetail.user_id && user.id === selectedDetail.user_id && (
                            <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Tú</span>
                          )}
                          {_isDemand && selectedDetail.client_id && user?.id === selectedDetail.client_id && (
                            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">(yo)</span>
                          )}
                          {selectedDetail.is_verified && (
                            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          )}
                        </div>
                        {selectedDetail.nickname && <p className="text-xs text-gray-400 font-medium mt-0.5">@{selectedDetail.nickname}</p>}
                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          <span className="font-black text-xl" style={{ color: _catColor }}>
                            {formatCLP(selectedDetail.hourly_rate)}<span className="text-xs font-semibold text-gray-400">/hr</span>
                          </span>
                          {selectedDetail.fresh_score > 0 && (
                            <span className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3 fill-orange-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <span className="text-xs font-bold text-orange-700">{selectedDetail.fresh_score}</span>
                            </span>
                          )}
                          {selectedDetail.total_jobs > 0 && <span className="text-xs text-gray-400 font-semibold">{selectedDetail.total_jobs} trabajos</span>}
                          {selectedDetail.showcase_video && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">📹 Video</span>}
                        </div>
                      </div>
                    </div>

                    {/* Status pill */}
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                        selectedDetail.status === 'active' ? 'bg-green-500 text-white' :
                        selectedDetail.status === 'intermediate' ? 'bg-sky-500 text-white' :
                        _isDemand ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          selectedDetail.status === 'active' ? 'bg-white animate-pulse' :
                          selectedDetail.status === 'intermediate' ? 'bg-white animate-pulse' :
                          _isDemand ? 'bg-white' : 'bg-gray-400'
                        }`} />
                        {selectedDetail.status === 'active' ? 'Disp. Inmediata' :
                         selectedDetail.status === 'intermediate' ? 'Disp. Flexible' :
                         _isDemand ? 'Demanda activa' : 'No disponible'}
                      </span>
                    </div>
                  </div>

                  {/* Microcopy */}
                  {selectedDetail.microcopy && (
                    <div className="px-5 py-3 border-t border-gray-50">
                      <p className="text-sm text-gray-500 italic leading-relaxed">"{selectedDetail.microcopy}"</p>
                    </div>
                  )}

                  {/* Card de Viaje — chofer o pasajero */}
                  {selectedDetail.travel_role && (
                    <div className={`mx-5 mt-3 rounded-2xl p-3.5 border ${
                      selectedDetail.travel_role === 'driver'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{selectedDetail.travel_role === 'driver' ? '🚗' : '🙋'}</span>
                        <span className={`text-sm font-bold ${selectedDetail.travel_role === 'driver' ? 'text-emerald-800' : 'text-blue-800'}`}>
                          {selectedDetail.travel_role === 'driver' ? 'Ofrece transporte' : 'Busca transporte'}
                        </span>
                        {selectedDetail.payload?.seats && (
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                            selectedDetail.travel_role === 'driver' ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-200 text-blue-800'
                          }`}>
                            {selectedDetail.payload.seats} {selectedDetail.travel_role === 'driver' ? 'asientos libres' : 'asientos necesarios'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        {selectedDetail.payload?.origin_address && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-emerald-700' : 'text-blue-700'}>
                            📍 Desde: <span className="font-semibold">{selectedDetail.payload.origin_address}</span>
                          </p>
                        )}
                        {(selectedDetail.payload?.destination_address || selectedDetail.payload?.destination_name) && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-emerald-700' : 'text-blue-700'}>
                            🏁 Hacia: <span className="font-semibold">{selectedDetail.payload.destination_address || selectedDetail.payload.destination_name}</span>
                          </p>
                        )}
                        {selectedDetail.payload?.departure_time && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-emerald-700' : 'text-blue-700'}>
                            🕐 Salida: <span className="font-semibold">{new Date(selectedDetail.payload.departure_time).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modo Viaje worker activo */}
                  {!selectedDetail.travel_role && selectedDetail.active_route?.available_seats && selectedDetail.active_route.available_seats > 0 && (
                    <div className="mx-5 mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🚗</span>
                        <span className="text-sm font-bold text-blue-800">Modo Viaje Activo</span>
                        <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {selectedDetail.active_route.available_seats} asientos
                        </span>
                      </div>
                      {selectedDetail.active_route.destination && (
                        <p className="text-xs text-blue-700">Hacia: <span className="font-semibold">{selectedDetail.active_route.destination.address}</span></p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {(() => {
                    const isSelf = !!(user && selectedDetail.user_id && user.id === selectedDetail.user_id) || !!(workerProfile?.id && selectedDetail.id && Number(workerProfile.id) === Number(selectedDetail.id))
                    const isDemand = selectedDetail.status === 'demand'
                    const isTravelPin = isDemand && !!selectedDetail.travel_role
                    const isOwnDemand = isDemand && selectedDetail.client_id === user?.id

                    const handleTravelJoin = async () => {
                      const auth = checkAuthAndProfile()
                      if (!auth.canInteract) { setShowLoginModal(true); toast(auth.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil', 'info'); return }
                      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                      try {
                        const res = await fetch(`${API_BASE}/api/v1/demand/${selectedDetail.id}/take`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        })
                        const data = await res.json()
                        if (res.ok && data.status === 'success') {
                          toast(selectedDetail.travel_role === 'driver' ? '🙋 Solicitud enviada al chofer' : '🚗 Te ofreciste como chofer', 'success')
                          setSelectedDetail(null)
                          fetchNearby(activeCategory)
                        } else {
                          toast(data.message || 'Error al conectar', 'error')
                        }
                      } catch { toast('Error de conexión', 'error') }
                    }

                    return (
                      <div className="px-5 mt-4">
                        {isSelf || isOwnDemand ? (
                          <div className="space-y-2.5">
                            <button
                              onClick={() => setActiveSection('profile')}
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              Mi perfil
                            </button>
                            {!isDemand && selectedDetail.is_seller && (
                              <a href={`/tienda/${selectedDetail.id}`} target="_blank" rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95">
                                🛒 Ver mi tienda
                              </a>
                            )}
                          </div>
                        ) : isTravelPin ? (
                          /* Botones de match para viaje */
                          <div className="space-y-2.5">
                            <button
                              onClick={handleTravelJoin}
                              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95 ${
                                selectedDetail.travel_role === 'driver'
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {selectedDetail.travel_role === 'driver' ? '🙋 Solicitar unirse al viaje' : '🚗 Ofrecerme como chofer'}
                            </button>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.pos.lat},${selectedDetail.pos.lng}`}
                              target="_blank" rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              Ver en mapa
                            </a>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            {isDemand ? (
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.pos.lat},${selectedDetail.pos.lng}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-3 rounded-2xl text-sm font-bold transition active:scale-95">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Cómo llegar
                              </a>
                            ) : (
                              <button onClick={() => { setSelectedWorkerId(selectedDetail.id); setShowWorkerProfileDetail(true) }}
                                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-2xl text-sm font-bold transition active:scale-95">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Ver perfil
                              </button>
                            )}
                            {selectedDetail.status === 'inactive' ? (
                              <button disabled className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-2xl text-sm font-bold cursor-not-allowed">No disponible</button>
                            ) : activeRequestId ? (
                              <button onClick={() => { const a = checkAuthAndProfile(); if (!a.canInteract) { setShowLoginModal(true); return }; setShowChat(true) }}
                                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl text-sm font-bold transition active:scale-95">
                                💬 Chat activo
                              </button>
                            ) : (
                              <button
                                onClick={() => { const a = checkAuthAndProfile(); if (!a.canInteract) { setShowLoginModal(true); toast(a.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil', a.reason === 'login' ? 'info' : 'warning'); return }; setShowRequestModal(true) }}
                                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition active:scale-95 ${selectedDetail.status === 'active' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-amber-400 hover:bg-amber-500 text-white'}`}>
                                {selectedDetail.status === 'active' ? '⚡ Solicitar ahora' : '💬 Consultar'}
                              </button>
                            )}
                            {!isDemand && selectedDetail.is_seller && (
                              <a href={`/tienda/${selectedDetail.id}`} target="_blank" rel="noopener noreferrer"
                                className="col-span-2 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 py-3 rounded-2xl text-sm font-bold transition active:scale-95">
                                🛒 Ver tienda
                              </a>
                            )}
                            {selectedDetail.phone && (
                              <button onClick={() => { const a = checkAuthAndProfile(); if (!a.canInteract) { setShowLoginModal(true); toast('Inicia sesión para ver el teléfono', 'info'); return }; window.open(`tel:${selectedDetail.phone}`, '_self') }}
                                className="col-span-2 flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 py-3 rounded-2xl text-sm font-bold transition active:scale-95">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                Llamar ahora
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                )
              })()}
            </div>
          </div>
        </>
      )}


      {/* ══════════════════════════════════════════════
          DASHBOARD MODERNO — Feed de Oportunidades
         ══════════════════════════════════════════════ */}
      <div className={`fixed inset-0 z-[150] transition-all duration-500 ease-out ${dashHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'}`}>
        <div className="bg-slate-900 h-full w-full overflow-hidden flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 px-4 pt-4 pb-3 border-b border-slate-700/50 z-10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Demandas</h2>
              <p className="text-xs text-slate-400">Solicitudes reales que puedes tomar ahora</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('🔄 Forzando recarga del feed...')
                  setPoints([]) // Limpiar puntos
                  fetchNearby() // Recargar mapa
                  // Recargar feed
                  const event = new Event('reload-feed')
                  window.dispatchEvent(event)
                  toast('Feed recargado', 'info')
                }}
                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center transition"
                title="Recargar feed"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button
                onClick={() => { setDashHidden(true); setActiveTab('map') }}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition border border-slate-700"
              >
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Dashboard Feed Moderno */}
          <div className="flex-1 overflow-y-auto">
            <DashboardFeed
              userLat={userLat}
              userLng={userLng}
              currentUserId={user?.id}
              onCardClick={(request) => {
                // Resaltar el pin sin recentrar el mapa (el usuario pidió evitar autocentradas).
                setHighlightedRequestId(request.id)
                setTimeout(() => setHighlightedRequestId(null), 3000)
                setSelectedDetail(null)
              }}
              highlightedRequestId={highlightedRequestId}
              onRequestService={(request) => {
                console.log('🔘 Botón "Tomar Solicitud" clickeado:', request)
                
                // Verificar autenticación ANTES de abrir modal
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
                
                // Convertir ServiceRequest a ExpertDetail para el modal
                // Primero necesitamos obtener el detalle del worker si existe
                if (request.worker_id) {
                  console.log('📡 Obteniendo detalle del worker:', request.worker_id)
                  // Si tiene worker asignado, obtener su detalle
                  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                  const headers: HeadersInit = { 'Accept': 'application/json' }
                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                  }
                  fetch(`${API_BASE}/api/v1/experts/${request.worker_id}`, { headers })
                    .then(r => {
                      if (!r.ok) {
                        throw new Error(`HTTP ${r.status}`)
                      }
                      return r.json()
                    })
                    .then(data => {
                      console.log('✅ Detalle del worker obtenido:', data?.data)
                      if (data?.data) {
                        setSelectedDetail(data.data)
                        setShowRequestModal(true)
                        setDashHidden(true)
                        console.log('✅ Modal abierto con detalle del worker')
                      } else {
                        throw new Error('No data en respuesta')
                      }
                    })
                    .catch(err => {
                      console.error('❌ Error fetching worker detail:', err)
                      // Si falla, crear un detalle básico desde el request
                      const fallbackDetail = {
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
                        status: 'active' as const,
                        category: request.category ? {
                          slug: (request.category as any)?.slug || '',
                          name: (request.category as any)?.display_name || request.category?.name || 'Servicio',
                          color: request.category?.color || '#6b7280',
                          icon: request.category?.icon || '📌',
                        } : { slug: '', name: 'Servicio', color: '#6b7280', icon: '📌' },
                        videos_count: 0,
                        pos: request.pos,
                        microcopy: request.description || '',
                      }
                      console.log('⚠️ Usando detalle de fallback:', fallbackDetail)
                      setSelectedDetail(fallbackDetail)
                      setShowRequestModal(true)
                      setDashHidden(true)
                    })
                } else {
                  // DEMANDA PÚBLICA: Worker toma la demanda directamente
                  console.log('📋 Request sin worker_id - Es una demanda pública, tomando directamente')
                  
                  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                  if (!token) {
                    setShowLoginModal(true)
                    toast('Inicia sesión para tomar demandas', 'info')
                    return
                  }

                  // Llamar al endpoint para tomar la demanda
                  console.log('📡 Enviando POST a /take_demand.php?id=' + request.id)
                  fetch(`/take_demand.php?id=${request.id}`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Accept': 'application/json',
                    },
                  })
                  .then(r => {
                    console.log('📥 Respuesta HTTP:', r.status, r.ok)
                    return r.json()
                  })
                  .then(data => {
                    console.log('📦 Datos recibidos:', data)
                    if (data.status === 'success') {
                      toast('Demanda tomada', 'success', 'El cliente será notificado.')
                      
                      // Remover la tarjeta del feed y el pin del mapa inmediatamente
                      const removeEvent = new CustomEvent('remove-feed-item', { detail: { id: request.id } })
                      window.dispatchEvent(removeEvent)
                      setPoints(prev => prev.filter(p => !(p.id === request.id && p.pin_type === 'demand')))
                      setSelectedDetail(null)
                      
                      // Recargar feed y mapa para sincronizar con el servidor
                      setTimeout(() => {
                        fetchNearby()
                        const event = new Event('reload-feed')
                        window.dispatchEvent(event)
                      }, 1500)
                      
                      setDashHidden(true)
                    } else {
                      toast(data.message || 'Error al tomar demanda', 'error')
                    }
                  })
                  .catch(err => {
                    console.error('Error tomando demanda:', err)
                    toast('Error de conexión al tomar demanda', 'error')
                  })
                }
              }}
              onOpenChat={(request) => {
                // Verificar autenticación antes de abrir chat
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
                setChatContext({ description: request?.description, name: request?.client?.name, avatar: request?.client?.avatar })
                setShowChat(true)
                setDashHidden(true)
              }}
              onGoToLocation={async (request) => {
                // Obtener coordenadas
                let targetLat = request.pos?.lat
                let targetLng = request.pos?.lng
                
                // Intentar obtener coordenadas exactas si hay token
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                if (token && request.id) {
                  try {
                    const headers: HeadersInit = { 'Accept': 'application/json' }
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`
                    }
                    const detailRes = await fetch(`${API_BASE}/api/v1/demand/${request.id}`, { headers })
                    
                    if (detailRes.ok) {
                      const detailData = await detailRes.json()
                      if (detailData.status === 'success' && detailData.data?.pos) {
                        targetLat = detailData.data.pos.lat
                        targetLng = detailData.data.pos.lng
                      }
                    }
                  } catch (err) {
                    // Usar coordenadas del feed si falla
                  }
                }
                
                if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) {
                  return
                }
                
                // Cerrar dashboard
                setDashHidden(true)
                console.log('🗺️ Ver en mapa: targetLat=' + targetLat + ' targetLng=' + targetLng)
                
                // Mover el mapa - esperar a que el dashboard se cierre y el mapa se redimensione
                setTimeout(() => {
                  const map = (window as any).__leafletMap
                  console.log('🗺️ __leafletMap:', !!map)
                  if (map && typeof map.flyTo === 'function') {
                    map.invalidateSize()
                    map.flyTo([targetLat, targetLng], 18, { duration: 1.5 })
                    setHighlightedRequestId(request.id)
                    setTimeout(() => setHighlightedRequestId(null), 3000)
                    console.log('✅ flyTo ejecutado')
                  } else {
                    console.error('❌ No se encontró instancia del mapa')
                  }
                }, 400)
              }}
            />
          </div>
        </div>
      </div>

      {/* ══ PANEL MIS SOLICITUDES ══ */}
      {showSolicitudesPanel && (
        <div className="fixed inset-0 z-[150]">
          <MisSolicitudes
            user={user}
            onLoginRequest={() => { setShowSolicitudesPanel(false); setShowLoginModal(true) }}
            onClose={() => { setShowSolicitudesPanel(false); setActiveTab('map') }}
            onOpenChat={(requestId, otherName, otherAvatar, myRole, isSelf) => {
              setShowSolicitudesPanel(false)
              setActiveRequestId(requestId)
              setChatContext({ name: otherName, avatar: otherAvatar, myRole, isSelf })
              setShowChat(true)
              setChatBadge(0)
            }}
          />
        </div>
      )}

      {/* ── PROMPT UBICACIÓN PERSUASIVO ── */}
      {showLocationPrompt && (
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
                <p className="text-slate-400 text-xs mt-0.5">
                  Compartir tu ubicación nos ayuda a mostrarte oportunidades cercanas
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            // Solo perfil/recomendaciones: no mover el mapa ni el centro de búsqueda.
                            localStorage.setItem('user_lat', String(pos.coords.latitude))
                            localStorage.setItem('user_lng', String(pos.coords.longitude))
                            setShowLocationPrompt(false)
                          },
                          (err) => {
                            if (err.code === 1) {
                              // Permiso denegado - mostrar guía inline
                              const el = document.getElementById('location-denied-msg')
                              if (el) { el.style.display = 'block' }
                            } else {
                              setShowLocationPrompt(false)
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
                    onClick={() => setShowLocationPrompt(false)}
                    className="px-3 py-2 text-slate-500 text-xs font-semibold hover:text-slate-300 transition"
                  >
                    Ahora no
                  </button>
                  <div id="location-denied-msg" style={{display:'none'}} className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-amber-400 text-xs font-bold">📵 Permiso denegado</p>
                    <p className="text-slate-400 text-xs mt-0.5">Ve a <strong className="text-white">Ajustes → Apps → JobsHours → Permisos → Ubicación → Permitir</strong></p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowLocationPrompt(false)} className="text-slate-600 hover:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR PREMIUM ── */}
      {showSidebar && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] transition-opacity" onClick={() => setShowSidebar(false)} />
          <div className="fixed left-0 top-0 h-full w-80 bg-slate-900 z-[201] shadow-2xl overflow-y-auto animate-slide-in-left border-r border-slate-800">
            {/* Header con logo */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 py-3 z-10 flex items-center justify-between">
              <div className="flex items-baseline font-black tracking-tighter text-lg">
                {/* Jobs with clock */}
                <span className="text-white">J</span>
                <div className="relative mx-[1px] inline-flex h-[14px] w-[14px] -translate-y-[2px] align-baseline items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[1.5px] border-teal-400"></div>
                  <div className="absolute h-1/2 w-[1.5px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 3s linear infinite' }}></div>
                  <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400"></div>
                </div>
                <span className="text-white">bs</span>
                {/* Hours with clock */}
                <span className="text-teal-400 ml-0.5">H</span>
                <div className="relative mx-[1px] inline-flex h-[14px] w-[14px] -translate-y-[2px] align-baseline items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[1.5px] border-teal-400"></div>
                  <div className="absolute h-1/2 w-[1.5px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 3s linear infinite', animationDelay: '0.5s' }}></div>
                  <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400"></div>
                </div>
                <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">urs</span>
              </div>
              <button 
                onClick={() => setShowSidebar(false)} 
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 transition rounded-lg hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-0">
            {user ? (
              <div>
                {/* Perfil con gradiente teal */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-5 py-5 border-b border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-14 h-14 rounded-full object-cover border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]" alt={user.firstName} />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                          <span className="text-white text-xl font-black">{user.firstName.charAt(0)}</span>
                        </div>
                      )}
                      {/* Botón editar foto */}
                      <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                        <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
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
                              setUser(prev => prev ? { ...prev, avatarUrl: data.avatar_url } : prev)
                              toast('Foto actualizada', 'success')
                            }
                          } catch { toast('Error al subir foto', 'error') }
                        }} />
                      </label>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-slate-800 rounded-full ${
                        workerStatus === 'active' ? 'bg-teal-400' : workerStatus === 'intermediate' ? 'bg-sky-400' : 'bg-slate-500'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-base font-black text-white">{user.name}</p>
                      <p className="text-xs font-semibold text-amber-400/80">
                        {workerStatus === 'active' ? 'Disp. Inmediata' : workerStatus === 'intermediate' ? 'Disp. Flexible' : 'Inactivo'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menú Principal */}
                <div className="px-4 py-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Principal</p>
                  
                  <button 
                    onClick={() => { setActiveSection('profile'); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                      <svg className="w-5 h-5 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Mi Perfil</span>
                  </button>
                  
                  <button 
                    onClick={() => { setActiveSection('jobs'); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Mis Trabajos</span>
                  </button>

                  <button 
                    onClick={() => {
                      const authCheck = checkAuthAndProfile()
                      if (!authCheck.canInteract) {
                        if (authCheck.reason === 'login') {
                          setShowLoginModal(true)
                        } else {
                          setShowOnboarding(true)
                        }
                        return
                      }
                      setShowPublishDemand(true)
                      setShowSidebar(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center group-hover:bg-amber-500/25 transition">
                      <span className="text-lg">💰</span>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Publicar Demanda</span>
                  </button>

                  <button 
                    onClick={() => { setShowCategoryManagement(true); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Mis Categorías</span>
                  </button>

                  <a
                    href={user ? `/tienda/${workerProfile?.id ?? ''}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowSidebar(false)}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-orange-500/15 rounded-lg flex items-center justify-center group-hover:bg-orange-500/25 transition">
                      <span className="text-lg">🛒</span>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Mi Tienda</span>
                  </a>

                  {workerProfile && (
                    <button
                      onClick={() => { setShowStoreOrders(true); setShowSidebar(false) }}
                      className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                    >
                      <div className="w-9 h-9 bg-orange-500/15 rounded-lg flex items-center justify-center group-hover:bg-orange-500/25 transition">
                        <span className="text-lg">📦</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Mis Pedidos</span>
                    </button>
                  )}
                </div>

                {/* Separador */}
                <div className="h-px bg-slate-800 mx-5"></div>

                {/* Menú Secundario */}
                <div className="px-4 py-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Social</p>

                  <button
                    onClick={() => { setShowChatHistory(true); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-blue-500/15 rounded-lg flex items-center justify-center group-hover:bg-blue-500/25 transition">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition">Conversaciones</span>
                  </button>

                  <button 
                    onClick={() => { setShowFriends(true); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition">
                      <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">Mis Amigos</span>
                  </button>
                  
                  <button 
                    onClick={() => { setShowVerificationCard(true); setShowSidebar(false) }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">Mi Tarjeta</span>
                  </button>

                  <button 
                    onClick={async () => {
                      const { setupNotifications } = await import('@/lib/firebase')
                      const token = localStorage.getItem('auth_token')
                      if (token) {
                        await setupNotifications(token)
                        alert('Notificaciones activadas correctamente')
                      } else {
                        alert('Debes iniciar sesión primero')
                      }
                      setShowSidebar(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center group-hover:bg-amber-500/25 transition">
                      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                      </svg>
                    </div>
                    <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">Notificaciones</span>
                  </button>
                </div>

                {/* Separador */}
                <div className="h-px bg-slate-800 mx-5"></div>

                {/* Compartir + Cerrar Sesión */}
                <div className="px-4 py-3 space-y-0.5">
                  <button 
                    onClick={() => {
                      const url = 'https://jobshours.com'
                      const text = '¡Encuentra servicios cerca de ti en JobsHours! 🔧⚡'
                      if (navigator.share) {
                        navigator.share({ title: 'JobsHours', text, url })
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
                      }
                      setShowSidebar(false)
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-slate-800 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-teal-500/15 rounded-lg flex items-center justify-center group-hover:bg-teal-500/25 transition">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <span className="text-slate-400 text-sm font-semibold group-hover:text-slate-200 transition">Compartir App</span>
                  </button>

                  <button
                    onClick={handleResetMapLocation}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-blue-500/10 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-blue-500/15 rounded-lg flex items-center justify-center group-hover:bg-blue-500/25 transition">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-blue-400 text-sm font-semibold group-hover:text-blue-300 transition">Resetear ubicación del mapa</span>
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 hover:bg-red-500/10 rounded-xl transition group"
                  >
                    <div className="w-9 h-9 bg-red-500/15 rounded-lg flex items-center justify-center group-hover:bg-red-500/25 transition">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <span className="text-red-400 text-sm font-semibold group-hover:text-red-300 transition">Cerrar sesión</span>
                  </button>
                </div>

                {/* Seguridad */}
                <div className="mx-5 mb-4 bg-teal-500/5 border border-teal-500/20 rounded-xl p-3 flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[10px] text-teal-500/80 font-semibold">Conexión segura · SSL activo</p>
                </div>
              </div>
            ) : (
              /* Social Login sin sesión */
              <div className="px-5 py-6 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Iniciar sesión</p>
                <button 
                  onClick={async (e) => { e.preventDefault(); const { openExternalBrowser } = await import('@/lib/capacitor'); const isNative = (await import('@capacitor/core')).Capacitor.isNativePlatform(); const url = isNative ? 'https://jobshours.com/api/auth/google?mobile=true' : 'https://jobshours.com/api/auth/google'; await openExternalBrowser(url) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-sm text-slate-300 font-semibold transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>
              </div>
            )}
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-5 py-3">
              <p className="text-[10px] text-slate-600 font-semibold">jobshours.com</p>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL SOLICITUD ── */}
      {showRequestModal && selectedDetail && (
        <ServiceRequestModal
          expert={{
            id: selectedDetail.id,
            name: selectedDetail.name,
            avatar: selectedDetail.avatar,
            hourly_rate: selectedDetail.hourly_rate,
            category: selectedDetail.category ? { name: selectedDetail.category.name, color: selectedDetail.category.color, icon: selectedDetail.category.icon } : null,
            pos: selectedDetail.pos,
            active_route: selectedDetail.active_route || null,
          }}
          currentUser={user}
          onClose={() => setShowRequestModal(false)}
          onSent={(reqId: number) => {
            setShowRequestModal(false)
            setActiveRequestId(reqId)
            setShowChat(true)
            toast('Solicitud enviada exitosamente', 'success')
            setChatContext({})
          }}
        />
      )}

      {/* ── CHAT PANEL ── */}
      {showChat && activeRequestId && (
        <ChatPanel
          requestId={activeRequestId}
          myRole={chatContext.myRole}
          isSelf={chatContext.isSelf}
          currentUserId={user?.id ?? 0}
          onClose={() => setShowChat(false)}
          requestDescription={chatContext.description}
          otherPersonName={chatContext.name}
          otherPersonAvatar={chatContext.avatar}
        />
      )}

      {/* ── FRIENDS MODAL ── */}
      {showFriends && user && (
        <Friends user={user} onClose={() => setShowFriends(false)} />
      )}

      {/* ── VERIFICATION CARD ── */}
      {showVerificationCard && user && (
        <VerificationCard user={user} onClose={() => setShowVerificationCard(false)} />
      )}

      {/* ── WORKER PROFILE DETAIL MODAL ── */}
      {showWorkerProfileDetail && selectedDetail && (
        <WorkerDetailModal
          detail={selectedDetail}
          onClose={() => { setShowWorkerProfileDetail(false); setSelectedWorkerId(null) }}
        />
      )}

      {/* ── RATING MODAL ── */}
      {showRatingModal && ratingRequestId && ratingWorkerInfo && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false)
            setRatingRequestId(null)
            setRatingWorkerInfo(null)
          }}
          serviceRequestId={ratingRequestId}
          workerName={ratingWorkerInfo.name}
          workerAvatar={ratingWorkerInfo.avatar}
          onRated={() => {
            // Marcar como calificado en localStorage
            if (ratingRequestId) {
              localStorage.setItem(`rated_${ratingRequestId}`, 'true')
            }
            setShowRatingModal(false)
            setRatingRequestId(null)
            setRatingWorkerInfo(null)
            // Recargar datos si es necesario
            if (user) {
              const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
              if (token) {
                fetch(`${API_BASE}/api/v1/requests/mine`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(r => r.json())
                  .then(data => {
                    // Actualizar estado si es necesario
                  })
              }
            }
          }}
        />
      )}

      {/* ── CATEGORY REQUIRED MODAL ── */}
      {showCategoryRequiredModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚙️</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Configura tu perfil</h3>
              <p className="text-sm text-gray-600">
                Necesitas seleccionar al menos una habilidad para poder activar el modo trabajo y aparecer en el mapa.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCategoryRequiredModal(false)
                  setActiveSection('profile')
                  setShowSidebar(true)
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-xl font-black text-base shadow-lg hover:from-yellow-500 hover:to-orange-600 transition"
              >
                Ir a Mi Perfil →
              </button>
              
              <button
                onClick={() => setShowCategoryRequiredModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── TRAVEL MODE MODAL ── */}
      {/* Temporalmente deshabilitado para debug */}
      {/* {showTravelModeModal && user && TravelModeModal && (
        <TravelModeModal
          user={{
            name: user.name,
            token: user.token
          }}
          onClose={() => setShowTravelModeModal(false)}
          onActivated={(route) => {
            setShowTravelModeModal(false)
            // Refrescar el mapa para mostrar la ruta activa
            fetchNearby()
            // Mostrar notificación de éxito
            toast('Modo Viaje Activado', 'success', 'Te notificaremos si alguien necesita ir en tu dirección.')
          }}
        />
      )} */}

      {/* ── WORKER FAB ── */}
      <WorkerFAB 
        user={user} 
        onActivate={() => {
          // El WorkerFAB maneja la activación directamente sin modal
          fetchNearby()
        }}
        onShowLogin={() => setShowLoginModal(true)}
        onRequireCategory={() => {
          // Si requiere categoría, abrir el perfil hub para seleccionarla
          if (user) {
            setActiveSection('profile')
            setShowSidebar(true)
          }
        }}
        onStatusChange={() => {
          fetchNearby()
          // Sincronizar estado del botón con WorkerFAB
          const token = localStorage.getItem('auth_token')
          if (token) fetchUserProfile(token)
        }}
      />

      {/* ── BOTONES INFERIORES MODERNOS ── */}
      {/* ── FAB CREAR DEMANDA (encima del bottom tab) ── */}
      {activeTab === 'map' && !selectedDetail && (
        <div className="fixed bottom-[68px] right-4 z-[91]">
          <button
            onClick={() => {
              const authCheck = checkAuthAndProfile()
              if (!authCheck.canInteract) {
                if (authCheck.reason === 'login') setShowLoginModal(true)
                else setShowOnboarding(true)
                return
              }
              setShowPublishDemand(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-500/40 active:scale-95 transition"
          >
            <span className="text-lg">💰</span>
            <span>Necesito ayuda</span>
          </button>
        </div>
      )}

      {/* ── WORKER STATUS PILL (encima del bottom tab) ── */}
      {activeTab === 'map' && (
        <div className="fixed bottom-[68px] left-4 z-[91]">
          <WorkerStatusPill
            status={workerStatus}
            loading={statusLoading}
            isLoggedIn={!!user}
            onActivate={() => {
              if (workerCategories.length === 0) { setShowCategoryRequiredModal(true); return }
              handleWorkerStatusChange('active')
            }}
            onChangeTo={handleWorkerStatusChange}
            onShowLogin={() => setShowLoginModal(true)}
          />
        </div>
      )}

      {/* ── DEBUG MAP PANEL (quitar cuando se resuelva el bug) ── */}
      <div
        ref={mapDebugRef}
        style={{
          position:'fixed', top:0, right:0, zIndex:99999,
          background:'rgba(0,0,0,0.85)', color:'#0f0', fontFamily:'monospace',
          padding:'4px 6px', maxWidth:'280px', minWidth:'180px', maxHeight:'120px',
          overflow:'hidden', fontSize:'9px', pointerEvents:'none',
        }}
      />

      {/* ── BOTTOM TAB NAVIGATION ── */}
      <BottomTabBar
        active={activeTab}
        onChange={handleTabChange}
        requestsBadge={chatBadge > 0 ? chatBadge : activeChatRequestIds.length}
        demandsBadge={points.filter(p => p.pin_type === 'demand').length}
        isWorker={workerStatus !== 'guest' && workerStatus !== 'inactive'}
      />

      {loading && (
        <div className="absolute inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center p-8">
          {/* Logo principal */}
          <div className="text-center">
            <h1 className="text-7xl font-black tracking-tight leading-none mb-5 flex items-center justify-center gap-2">
              <span className="text-gray-100">Jobs</span>
              <span className="text-teal-400 flex items-center">
                <span>H</span>
                {/* Reloj animado como la "O" */}
                <span className="relative inline-flex items-center justify-center w-16 h-16 mx-1">
                  <span className="absolute inset-0 rounded-full border-4 border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.35)]" />
                  {/* Manecilla larga — pivota desde el centro */}
                  <span className="clock-hand-long" style={{
                    position: 'absolute',
                    bottom: '50%',
                    left: '50%',
                    width: '3px',
                    height: '44%',
                    background: 'linear-gradient(to top, #5eead4, #fbbf24)',
                    borderRadius: '2px',
                    transformOrigin: 'bottom center',
                  }} />
                  {/* Manecilla corta — pivota desde el centro */}
                  <span className="clock-hand-short" style={{
                    position: 'absolute',
                    bottom: '50%',
                    left: '50%',
                    width: '3px',
                    height: '30%',
                    background: '#f1f5f9',
                    borderRadius: '2px',
                    transformOrigin: 'bottom center',
                  }} />
                  {/* Centro */}
                  <span className="w-3 h-3 rounded-full bg-amber-400 z-10 shadow-md" style={{ position: 'relative' }} />
                </span>
                <span>urs</span>
              </span>
            </h1>
            <p className="text-xl font-medium text-amber-300">Servicios ahora, cerca de ti</p>
          </div>
          {/* Dots loader */}
          <div className="mt-10 flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* ── CATEGORY REQUIRED MODAL ── */}
      {showCategoryRequiredModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚙️</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Configura tu perfil</h3>
              <p className="text-sm text-gray-600">
                Necesitas seleccionar al menos una habilidad para poder activar el modo trabajo y aparecer en el mapa.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCategoryRequiredModal(false)
                  setActiveSection('profile')
                  setShowSidebar(true)
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-xl font-black text-base shadow-lg hover:from-yellow-500 hover:to-orange-600 transition"
              >
                Ir a Mi Perfil →
              </button>
              
              <button
                onClick={() => setShowCategoryRequiredModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── ONBOARDING WIZARD (Primera vez para trabajadores nuevos) ── */}
      {showOnboarding && user && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => {
            setShowOnboarding(false)
          }}
          onComplete={async () => {
            setShowOnboarding(false)
            // Marcar como completado permanentemente
            if (user?.id) {
              localStorage.setItem(`onboarding_done_${user.id}`, 'true')
            }
            // Refrescar perfil del usuario después del onboarding
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            if (token) {
              await fetchUserProfile(token)
            }
          }}
          userToken={user.token}
          userName={user.name}
          userAvatar={user.avatarUrl}
        />
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── OFFLINE BANNER ── */}
      <OfflineBanner />

      {/* ── HISTORIAL DE CHATS ── */}
      {showStoreOrders && (
        <StoreOrdersPanel onClose={() => setShowStoreOrders(false)} />
      )}

      {showChatHistory && (
        <ChatHistory
          onClose={() => setShowChatHistory(false)}
          onOpenChat={(requestId, ctx) => {
            setShowChatHistory(false)
            setActiveRequestId(requestId)
            setChatContext(ctx)
            setShowChat(true)
          }}
        />
      )}

      {/* ── ONBOARDING SLIDES (primera vez) ── */}
      {showWelcomeSlides && (
        <OnboardingSlides onDone={() => {
          localStorage.setItem('welcome_slides_done', 'true')
          setShowWelcomeSlides(false)
        }} />
      )}

      {/* ── ANIMACIÓN ÉXITO PUBLICAR DEMANDA ── */}
      {showPublishSuccess && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50">
              <span className="text-5xl">✨</span>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl drop-shadow-lg">¡Demanda publicada!</p>
              <p className="text-white/70 text-sm mt-1">Los trabajadores cercanos la verán ahora</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
