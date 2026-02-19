'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'

import Logo from './components/Logo'
const MapSection = dynamic(() => import('./components/MapSection'), { ssr: false })
const ServiceRequestModal = dynamic(() => import('@/app/components/ServiceRequestModal'), { ssr: false }) as any
const ChatPanel = dynamic(() => import('./components/ChatPanel'), { ssr: false })
const WorkerProfileHub = dynamic(() => import('./components/WorkerProfileHub'), { ssr: false })
const WorkerProfile = dynamic(() => import('./components/WorkerProfile'), { ssr: false })
const OnboardingWizard = dynamic(() => import('./components/OnboardingWizard'), { ssr: false })
const WorkerJobs = dynamic(() => import('./components/WorkerJobs'), { ssr: false })
const Friends = dynamic(() => import('./components/Friends'), { ssr: false })
const VerificationCard = dynamic(() => import('./components/VerificationCard'), { ssr: false })
const WorkerFAB = dynamic(() => import('./components/WorkerFAB'), { ssr: false })
const DashboardFeed = dynamic(() => import('./components/DashboardFeed'), { ssr: false })
const CategoryManagement = dynamic(() => import('./components/CategoryManagement'), { ssr: false })
const PublishDemandModal = dynamic(() => import('./components/PublishDemandModal'), { ssr: false })
const MisSolicitudes = dynamic(() => import('./components/MisSolicitudes'), { ssr: false })
const ReviewsList = dynamic(() => import('./components/ReviewsList'), { ssr: false })
const RatingModal = dynamic(() => import('./components/RatingModal'), { ssr: false })
// Temporalmente deshabilitado para debug
// const TravelModeModal = dynamic(() => import('./components/TravelModeModal'), { ssr: false })

import { useNotifications } from '@/hooks/useNotifications'
import { useToast } from '@/hooks/useToast'
import { MapPoint } from './components/MapSection'
import ToastContainer from './components/Toast'
import BottomTabBar, { TabKey } from './components/BottomTabBar'
import WorkerStatusPill from './components/WorkerStatusPill'

interface ExpertDetail {
  id: number
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
  category: { slug: string; name: string; color: string; icon: string } | null
  videos_count: number
  showcase_video?: { url: string; thumbnail: string | null; duration: number | null } | null
  pos: { lat: number; lng: number }
  microcopy?: string
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

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '🧹',
  hammer: '🪵', leaf: '🌿', key: '🔑', building: '🧱',
  scissors: '🧵', 'paw-print': '🐾',
  'shopping-bag': '🛍️', truck: '🚚', package: '📦',
}

function formatCLP(val: number) {
  return '$' + val.toLocaleString('es-CL')
}

export default function Home() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ExpertDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)
  const [activeChatRequestIds, setActiveChatRequestIds] = useState<number[]>([])
  const [showChat, setShowChat] = useState(false)
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
  const [showFriends, setShowFriends] = useState(false)
  const [showVerificationCard, setShowVerificationCard] = useState(false)
  const [showWorkerProfileDetail, setShowWorkerProfileDetail] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showPublishDemand, setShowPublishDemand] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingRequestId, setRatingRequestId] = useState<number | null>(null)
  const [ratingWorkerInfo, setRatingWorkerInfo] = useState<{ name: string; avatar: string | null } | null>(null)
  const [showCategoryRequiredModal, setShowCategoryRequiredModal] = useState(false)
  const [workerCategories, setWorkerCategories] = useState<number[]>([]) // Categorías del worker
  // const [showTravelModeModal, setShowTravelModeModal] = useState(false)
  const [workerStatus, setWorkerStatus] = useState<'guest' | 'inactive' | 'intermediate' | 'active'>('guest') // Estados del trabajador
  const workerStatusRef = useRef<'guest' | 'inactive' | 'intermediate' | 'active'>('guest')
  const [activeTab, setActiveTab] = useState<TabKey>('map')
  const [statusLoading, setStatusLoading] = useState(false)
  const { toasts, toast, removeToast } = useToast()

  // Actualizar ref cuando cambia el estado
  useEffect(() => {
    workerStatusRef.current = workerStatus
  }, [workerStatus])

  const [userLat, setUserLat] = useState<number>(-37.6672) // Latitud del usuario
  const [userLng, setUserLng] = useState<number>(-72.5730) // Longitud del usuario
  const [workerCount, setWorkerCount] = useState<{ count: number; label: string } | null>(null)
  const chatNotifySeenIdsRef = useRef<Set<number>>(new Set())
  const chatNotifySubscribedIdsRef = useRef<Set<number>>(new Set())
  const mapRef = useRef<{ flyTo: (latlng: [number, number], zoom: number) => Promise<boolean> } | null>(null)
  
  // Exponer mapRef globalmente para debugging y acceso alternativo
  useEffect(() => {
    (window as any).mapRef = mapRef
    return () => {
      delete (window as any).mapRef
    }
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
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
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
      
      // Cargar datos del worker incluyendo categorías
      fetchWorkerData(token)
      
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
      const res = await fetch('/api/v1/worker/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.categories) {
          setWorkerCategories(data.data.categories.map((c: any) => c.id))
        }
      }
    } catch (err) {
      console.error('Error fetching worker data:', err)
    }
  }, [])

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
      if (existingToken) fetchUserProfile(existingToken)
    }
  }, [fetchUserProfile])

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setWorkerStatus('guest')
    alert('Sesión cerrada')
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
      fetch('/api/v1/requests/mine', {
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
              fetch(`/api/v1/workers/${sr.worker.id}/reviews`, {
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
          if (typeof reqId === 'number') {
            setActiveRequestId(reqId)
          }
          notify('Nueva solicitud', e?.description ? String(e.description) : 'Tienes una nueva solicitud')
        })
        .listen('.request.updated', (e: any) => {
          console.log('[Notifications] .request.updated (worker)', e)
          notify('Solicitud actualizada', e?.status ? `Estado: ${e.status}` : 'Una solicitud fue actualizada')
        })

      userChannel
        .listen('.request.updated', (e: any) => {
          console.log('[Notifications] .request.updated (user)', e)
          notify('Actualización de solicitud', e?.status ? `Estado: ${e.status}` : 'Tu solicitud fue actualizada')
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
        setPoints(prev => prev.map(p => {
          if (p.id !== e.worker_id || p.pin_type === 'demand') return p
          return {
            ...p,
            status: e.is_active ? 'active' : 'inactive',
            pos: e.lat && e.lng ? { lat: e.lat, lng: e.lng } : p.pos,
          }
        }))
        // Invalidar cache del contador cuando cambia un worker
        fetchWorkerCount(userLat, userLng)
      })
    })

    return () => {
      mounted = false
      if (echo) {
        try { echo.leave('workers') } catch { /* ignore */ }
      }
    }
  }, [userLat, userLng])

  // Contador workers verdes cercanos — polling cada 45s + cacheado en backend
  const fetchWorkerCount = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/v1/experts/count?lat=${lat}&lng=${lng}&radius=10`)
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
        if (!shouldNotify) return

        const text = msg?.body ? String(msg.body) : 'Nuevo mensaje'
        console.log('[ChatNotify] message.new', { id: msgId })
        toast('Nuevo mensaje', 'info', text, 5000)

        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuevo mensaje', { body: text, icon: '/icon-192x192.png' })
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
      fetch('/api/v1/nudges/random')
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
    fetch('/api/v1/categories')
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
  const fetchNearbyRef = useRef<{ lastCall: number; timeoutId: NodeJS.Timeout | null }>({ 
    lastCall: 0, 
    timeoutId: null 
  })
  
  const fetchNearby = useCallback((categoryId?: number | null) => {
    // Throttle simple: máximo una llamada cada 2 segundos
    const now = Date.now()
    const timeSinceLastCall = now - fetchNearbyRef.current.lastCall
    const throttleMs = 2000
    
    if (fetchNearbyRef.current.timeoutId) {
      return // Ya hay una llamada pendiente
    }
    
    if (timeSinceLastCall < throttleMs) {
      const delay = throttleMs - timeSinceLastCall
      console.log(`⏭️ fetchNearby: throttling ${Math.round(delay)}ms`)
      fetchNearbyRef.current.timeoutId = setTimeout(() => {
        fetchNearbyRef.current.lastCall = Date.now()
        fetchNearbyRef.current.timeoutId = null
        fetchNearby(categoryId)
      }, delay)
      return
    }
    
    fetchNearbyRef.current.lastCall = now
    
    setLoading(true)
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    
    // Usar ubicación del usuario si está disponible, sino usar coordenadas por defecto
    const lat = userLat || -37.6672
    const lng = userLng || -72.5730
    
    
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
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
      fetch(`/api/v1/experts/nearby?${params}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch(`/api/v1/demand/nearby?${params}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .catch(() => ({ data: [], meta: {} })) // Si falla, continuar sin demandas
    ])
      .then(([expertsData, demandsData]) => {
        // Combinar workers y demandas
        const workers = (expertsData.data ?? []).map((w: any) => ({
          ...w,
          pin_type: 'worker' as const,
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
          description: d.description,
          distance_km: d.distance_km,
        }))
        
        // Logs reducidos - solo si hay problema
        if (user && workers.length > 0) {
          const userInResults = workers.find(w => {
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
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching experts/demands:', err);
        setLoading(false)
      })
  }, [userLat, userLng, user])

  // Obtener ubicación del usuario al cargar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude)
          setUserLng(position.coords.longitude)
        },
        (error) => {
          console.warn('⚠️ Error obteniendo ubicación:', error)
          // Usar coordenadas por defecto si falla
        }
      )
    }
  }, [])

  useEffect(() => { fetchNearby() }, [fetchNearby])

  // Filtro local por búsqueda de texto Y estado del usuario
  const filtered = (() => {
    let result = points
    
    // Si el usuario está en estado 'inactive' (plomo), NO mostrar su pin en el mapa
    if (user && workerStatus === 'inactive') {
      result = result.filter(p => {
        // Excluir el pin del usuario actual si está en estado inactive
        const isCurrentUser = (p.user_id && p.user_id === user.id) || (p.id && p.id === user.id)
        return !isCurrentUser
      })
    }
    
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
    if (tab === 'requests') { setDashHidden(true); setShowSolicitudesPanel(true); setActiveSection('map') }
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
      const res = await fetch('/api/v1/worker/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: apiStatus, lat: userLat || -37.67, lng: userLng || -72.57, categories: next === 'active' ? workerCategories : undefined }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setWorkerStatus(next)
        fetchNearby(activeCategory)
        const labels = { active: '🟢 Estás activo y visible', intermediate: '🟡 Modo Escucha activado', inactive: '⚫ Te desconectaste del mapa' }
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
            // Mostrar feedback visual
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
        <MapSection ref={mapRef} points={filtered} onPointClick={handlePointClick} onMapClick={handleMapClick} highlightedId={highlightedRequestId} />
      </div>

      {/* ── HEADER MODERNO CON GRADIENTES ── */}
      <div className="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
        {/* Header Bar con fondo slate oscuro */}
        <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 pointer-events-auto">
          <div className="flex items-center justify-between">
            {/* Botón menú */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition active:scale-95"
              aria-label="Menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Logo JOBSHOURS animado */}
            <div className="flex items-baseline font-black tracking-tighter text-xl">
              <span className="text-white">J</span>
              <div className="relative mx-[2px] inline-flex h-[18px] w-[18px] -translate-y-[3px] items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2px] border-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.3)]"></div>
                <div className="absolute h-1/2 w-[2px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 3s linear infinite' }}></div>
                <div className="z-10 h-[4px] w-[4px] rounded-full bg-amber-400"></div>
              </div>
              <span className="text-white">b</span>
              <span className="text-teal-400">s</span>
              <span className="mx-1"></span>
              <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">H</span>
              <div className="relative mx-[2px] inline-flex h-[18px] w-[18px] -translate-y-[3px] items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2px] border-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.3)]"></div>
                <div className="absolute h-1/2 w-[2px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 5s linear infinite' }}></div>
                <div className="z-10 h-[4px] w-[4px] rounded-full bg-amber-400"></div>
              </div>
              <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">urs</span>
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

      {/* ── LOGIN MODAL DROPDOWN ── */}
      {showLoginModal && !user && (
        <>
          <div className="fixed inset-0 z-[298] bg-black/40 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[299] w-80 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-slate-100 p-5">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-black text-slate-800 mb-1">¡Únete a JobsHour!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Inicia sesión para solicitar servicios, conectar con trabajadores cerca de ti y acceder a todas las funciones</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { window.location.href = '/api/auth/google' }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm text-slate-700 font-semibold transition hover:shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </button>
                <button
                  onClick={() => { window.location.href = '/api/auth/facebook' }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm text-slate-700 font-semibold transition hover:shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continuar con Facebook</span>
                </button>
              </div>
              <p className="text-[9px] text-slate-400 text-center mt-3">Rápido, seguro y sin contraseñas</p>
            </div>
          </div>
        </>
      )}

      {/* Toasts reemplazan el demandAlert banner — ver ToastContainer al final */}

      {/* ══════════════════════════════════════════════
          WORKER DETAIL — Bottom Sheet moderno
         ══════════════════════════════════════════════ */}
      {(selectedDetail || loadingDetail) && (
        <>
          {/* Backdrop tap-to-close */}
          <div
            className="fixed inset-0 z-[108] bg-black/20"
            onClick={() => { setSelectedDetail(null); setLoadingDetail(false) }}
          />
          <div className="fixed left-0 right-0 z-[109] bottom-[68px] animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] max-h-[70vh] overflow-y-auto">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {loadingDetail && !selectedDetail ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-400">Cargando perfil...</p>
                </div>
              ) : selectedDetail && (
                <div className="px-5 pb-6">
                  {/* Header — Avatar + Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <img
                        src={selectedDetail.avatar || `https://i.pravatar.cc/150?u=${selectedDetail.id}`}
                        alt={selectedDetail.name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-sm"
                      />
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full shadow ${
                        selectedDetail.status === 'active' ? 'bg-green-500 animate-pulse' :
                        selectedDetail.status === 'intermediate' ? 'bg-yellow-400' : 'bg-gray-300'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-gray-900 text-base leading-tight">{selectedDetail.name}</h3>
                        {selectedDetail.is_verified && (
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {selectedDetail.nickname && (
                        <p className="text-xs text-gray-400 font-medium mt-0.5">@{selectedDetail.nickname}</p>
                      )}
                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {selectedDetail.fresh_score > 0 && (
                          <span className="flex items-center gap-1 text-sm">
                            <svg className="w-3.5 h-3.5 fill-orange-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span className="font-bold text-gray-900">{selectedDetail.fresh_score}</span>
                          </span>
                        )}
                        <span className="font-black text-blue-600 text-sm">{formatCLP(selectedDetail.hourly_rate)}/hr</span>
                        {selectedDetail.showcase_video && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">📹 Video</span>
                        )}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedDetail.status === 'active' ? 'bg-green-100 text-green-700' :
                      selectedDetail.status === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                      selectedDetail.status === 'demand' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedDetail.status === 'active' ? 'Disponible' :
                       selectedDetail.status === 'intermediate' ? 'En escucha' :
                       selectedDetail.status === 'demand' ? 'Demanda activa' : 'No disponible'}
                    </span>
                  </div>

                  {/* Microcopy */}
                  {selectedDetail.microcopy && (
                    <p className="text-sm text-gray-500 italic mb-4 leading-relaxed">{selectedDetail.microcopy}</p>
                  )}

                  {/* Modo Viaje */}
                  {selectedDetail.active_route?.available_seats && selectedDetail.active_route.available_seats > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🚗</span>
                        <span className="text-sm font-bold text-blue-800">Modo Viaje Activo</span>
                        <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {selectedDetail.active_route.available_seats} asientos
                        </span>
                      </div>
                      {selectedDetail.active_route.destination && (
                        <p className="text-xs text-blue-700">
                          Hacia: <span className="font-semibold">{selectedDetail.active_route.destination.address}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Ver perfil / Cómo llegar según tipo */}
                    {selectedDetail.status === 'demand' ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.pos.lat},${selectedDetail.pos.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Cómo llegar
                      </a>
                    ) : (
                      <button
                        onClick={() => { setSelectedWorkerId(selectedDetail.id); setShowWorkerProfileDetail(true) }}
                        className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Ver perfil
                      </button>
                    )}

                    {/* CTA principal */}
                    {selectedDetail.status === 'inactive' ? (
                      <button disabled className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-2xl text-sm font-bold cursor-not-allowed">
                        No disponible
                      </button>
                    ) : activeRequestId ? (
                      <button
                        onClick={() => {
                          const a = checkAuthAndProfile()
                          if (!a.canInteract) { setShowLoginModal(true); return }
                          setShowChat(true)
                        }}
                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                      >
                        💬 Chat activo
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const a = checkAuthAndProfile()
                          if (!a.canInteract) {
                            setShowLoginModal(true)
                            toast(a.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil', a.reason === 'login' ? 'info' : 'warning')
                            return
                          }
                          setShowRequestModal(true)
                        }}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition active:scale-95 ${
                          selectedDetail.status === 'active'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-amber-400 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {selectedDetail.status === 'active' ? '⚡ Solicitar ahora' : '💬 Consultar'}
                      </button>
                    )}

                    {/* Teléfono — ancho completo si está disponible */}
                    {selectedDetail.phone && (
                      <button
                        onClick={() => {
                          const a = checkAuthAndProfile()
                          if (!a.canInteract) {
                            setShowLoginModal(true)
                            toast('Inicia sesión para ver el teléfono', 'info')
                            return
                          }
                          window.open(`tel:${selectedDetail.phone}`, '_self')
                        }}
                        className="col-span-2 flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        Llamar ahora
                      </button>
                    )}
                  </div>
                </div>
              )}
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
              userLat={-37.6672}
              userLng={-72.5730}
              onCardClick={(request) => {
                // Fly to map location
                if (mapRef.current) {
                  mapRef.current.flyTo([request.pos.lat, request.pos.lng], 18).catch(console.error)
                }
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
                  fetch(`/api/v1/experts/${request.worker_id}`, { headers })
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
                          name: request.category?.name || 'Servicio',
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
                    const detailRes = await fetch(`/api/v1/demand/${request.id}`, { headers })
                    
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
          />
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
                <span className="text-white">J</span>
                <div className="relative mx-[1px] inline-flex h-[14px] w-[14px] -translate-y-[2px] items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[1.5px] border-teal-400"></div>
                  <div className="absolute h-1/2 w-[1.5px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 3s linear infinite' }}></div>
                  <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400"></div>
                </div>
                <span className="text-white">bs</span>
                <span className="text-teal-400 ml-0.5">H</span>
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
                    <div className="relative">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-14 h-14 rounded-full object-cover border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]" alt={user.firstName} />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center border-2 border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                          <span className="text-white text-xl font-black">{user.firstName.charAt(0)}</span>
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-slate-800 rounded-full ${
                        workerStatus === 'active' ? 'bg-teal-400' : workerStatus === 'intermediate' ? 'bg-amber-400' : 'bg-slate-500'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-base font-black text-white">{user.name}</p>
                      <p className="text-xs font-semibold text-amber-400/80">
                        {workerStatus === 'active' ? 'Disponible' : workerStatus === 'intermediate' ? 'Escuchando' : 'Inactivo'}
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
                </div>

                {/* Separador */}
                <div className="h-px bg-slate-800 mx-5"></div>

                {/* Menú Secundario */}
                <div className="px-4 py-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Social</p>

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
                      const url = 'https://jobshour.dondemorales.cl'
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
                  onClick={() => window.location.href = '/api/auth/google'}
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
                <button 
                  onClick={() => window.location.href = '/api/auth/facebook'}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-sm text-slate-300 font-semibold transition"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continuar con Facebook</span>
                </button>
              </div>
            )}
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-5 py-3">
              <p className="text-[10px] text-slate-600 font-semibold">jobshour.dondemorales.cl</p>
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
          onClose={() => setShowRequestModal(false)}
          onSent={(reqId: number) => {
            setShowRequestModal(false)
            setActiveRequestId(reqId)
            setShowChat(true)
            toast('Solicitud enviada exitosamente', 'success')
          }}
        />
      )}

      {/* ── CHAT PANEL ── */}
      {showChat && activeRequestId && (
        <ChatPanel
          requestId={activeRequestId}
          currentUserId={0}
          onClose={() => setShowChat(false)}
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

      {/* ── WORKER PROFILE DETAIL MODAL (al hacer click en Perfil desde pin) ── */}
      {showWorkerProfileDetail && selectedDetail && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-black text-gray-900">Perfil del Trabajador</h2>
              <button
                onClick={() => {
                  setShowWorkerProfileDetail(false)
                  setSelectedWorkerId(null)
                }}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Avatar y nombre */}
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={selectedDetail.avatar || `https://i.pravatar.cc/100?u=${selectedDetail.id}`}
                  alt={selectedDetail.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                />
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedDetail.name}</h3>
                  {selectedDetail.nickname && (
                    <p className="text-sm text-gray-600">@{selectedDetail.nickname}</p>
                  )}
                  {selectedDetail.is_verified && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verificado
                    </span>
                  )}
                </div>
              </div>

              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedDetail.fresh_score !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Fresh Score</p>
                    <p className="text-2xl font-black text-gray-900">{selectedDetail.fresh_score}</p>
                  </div>
                )}
                {selectedDetail.hourly_rate && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Tarifa por Hora</p>
                    <p className="text-2xl font-black text-blue-600">{formatCLP(selectedDetail.hourly_rate)}/hr</p>
                  </div>
                )}
                {selectedDetail.rating_count !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Calificaciones</p>
                    <p className="text-2xl font-black text-gray-900">{selectedDetail.rating_count}</p>
                  </div>
                )}
                {selectedDetail.total_jobs !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Trabajos Completados</p>
                    <p className="text-2xl font-black text-gray-900">{selectedDetail.total_jobs}</p>
                  </div>
                )}
              </div>

              {/* Categoría */}
              {selectedDetail.category && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Categoría</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedDetail.category.icon || '📌'}</span>
                    <span className="font-bold text-gray-900">{selectedDetail.category.name}</span>
                  </div>
                </div>
              )}

              {/* Bio/Microcopy */}
              {selectedDetail.microcopy && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Descripción</p>
                  <p className="text-gray-700 leading-relaxed">{selectedDetail.microcopy}</p>
                </div>
              )}

              {/* Estado */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">Estado</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  selectedDetail.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedDetail.status === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  selectedDetail.status === 'demand' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedDetail.status === 'active' ? 'Disponible' :
                   selectedDetail.status === 'intermediate' ? 'A convenir' :
                   selectedDetail.status === 'demand' ? 'Demanda activa' :
                   'No disponible'}
                </span>
              </div>

              {/* Video showcase */}
              {selectedDetail.showcase_video && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-2">Video de Presentación</p>
                  <div className="bg-gray-100 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600">Video disponible</p>
                  </div>
                </div>
              )}

              {/* Reseñas */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-3">Reseñas</p>
                <ReviewsList workerId={selectedDetail.id} showAverage={true} canRespond={false} />
              </div>
            </div>
          </div>
        </div>
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
                fetch('/api/v1/requests/mine', {
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
      {/* ── WORKER STATUS PILL (encima del bottom tab) ── */}
      {(!user || (user && workerStatus !== 'guest')) && (
        <div className="fixed bottom-[68px] left-4 z-[91]">
          <WorkerStatusPill
            status={workerStatus}
            loading={statusLoading}
            onActivate={() => {
              if (workerCategories.length === 0) { setShowCategoryRequiredModal(true); return }
              handleWorkerStatusChange('active')
            }}
            onChangeTo={handleWorkerStatusChange}
            onShowLogin={() => setShowLoginModal(true)}
          />
        </div>
      )}

      {/* ── BOTTOM TAB NAVIGATION ── */}
      <BottomTabBar
        active={activeTab}
        onChange={handleTabChange}
        requestsBadge={activeChatRequestIds.length}
        isWorker={workerStatus !== 'guest' && workerStatus !== 'inactive'}
      />

      {loading && (
        <div className="absolute inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center">
          <Logo size="md" showTagline={false} />
          <div className="mt-6 flex items-center gap-2">
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
    </div>
  )
}
