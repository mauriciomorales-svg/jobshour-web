'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import ServiceCard from './ServiceCard'
import LiveStats from './LiveStats'
import { motion } from 'framer-motion'

interface ServiceRequest {
  id: number
  type?: 'ride_share' | 'express_errand' | 'fixed_job'
  category_type: 'fixed' | 'travel' | 'errand'
  status: string
  template: 'premium' | 'standard' | 'historical' | 'minimal'
  pos: { lat: number; lng: number }
  client: { name: string; avatar: string | null }
  category: { name: string; color: string; icon?: string }
  offered_price: number
  urgency: string
  distance_km: number
  created_at: string
  completed_at?: string
  description?: string
  payload?: any
  worker_id?: number | null // ID del worker asignado (si existe)
}

interface DashboardFeedProps {
  userLat: number
  userLng: number
  onCardClick: (request: ServiceRequest) => void
  highlightedRequestId?: number | null
  onRequestService?: (request: ServiceRequest) => void
  onOpenChat?: (request: ServiceRequest) => void
  onGoToLocation?: (request: ServiceRequest) => void
}

export default function DashboardFeed({ userLat, userLng, onCardClick, highlightedRequestId, onRequestService, onOpenChat, onGoToLocation }: DashboardFeedProps) {
  const [feed, setFeed] = useState<ServiceRequest[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [dailyViewed, setDailyViewed] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Usar refs para evitar dependencias circulares
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const cursorRef = useRef(0)

  const loadMore = useCallback(async (reset = false) => {
    // Evitar múltiples llamadas simultáneas
    if (loadingRef.current && !reset) {
      console.log('⏭️ loadMore: ya hay una carga en progreso, saltando...')
      return
    }
    if (!hasMoreRef.current && !reset) {
      console.log('⏭️ loadMore: no hay más datos y no es reset, saltando...')
      return
    }

    console.log(`🔄 loadMore: iniciando (reset=${reset})`)
    loadingRef.current = true
    setLoading(true)

    try {
      const currentCursor = reset ? 0 : cursorRef.current
      const url = `/api/v1/dashboard/feed?lat=${userLat}&lng=${userLng}&cursor=${currentCursor}&_t=${Date.now()}`
      
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()

      if (data.status === 'success' && data.data && Array.isArray(data.data)) {
        if (reset) {
          setFeed(data.data)
          cursorRef.current = data.meta?.next_cursor ?? 0
          setCursor(data.meta?.next_cursor ?? 0)
        } else {
          setFeed(prev => [...prev, ...data.data])
          cursorRef.current = data.meta?.next_cursor ?? cursorRef.current
          setCursor(data.meta?.next_cursor ?? cursorRef.current)
        }
        hasMoreRef.current = data.meta?.has_more ?? false
        setHasMore(data.meta?.has_more ?? false)
        
        // Actualizar meta diaria
        const totalViewed = data.data.reduce((sum: number, req: ServiceRequest) => sum + (req.offered_price || 0), 0)
        setDailyViewed(prev => reset ? totalViewed : prev + totalViewed)
      } else {
        console.error('❌ Respuesta inválida del feed:', data)
        throw new Error('Respuesta inválida del servidor')
      }
    } catch (err) {
      console.error('❌ Error loading feed:', err)
      // Asegurar que siempre se quite el loading incluso si hay error
      loadingRef.current = false
      setLoading(false)
      // Si hay error y el feed está vacío, mostrar mensaje
      setHasMore(false)
    } finally {
      // Asegurar que siempre se quite el loading
      console.log('✅ loadMore: finalizado, quitando loading')
      loadingRef.current = false
      setLoading(false)
    }
  }, [userLat, userLng])

  // Cargar feed inicial cuando cambian las coordenadas
  useEffect(() => {
    // Resetear todo antes de cargar
    setFeed([])
    cursorRef.current = 0
    setCursor(0)
    hasMoreRef.current = true
    setHasMore(true)
    loadingRef.current = false // Reset loading ref
    setLoading(false) // Asegurar que loading esté en false inicialmente
    
    // Cargar después de un pequeño delay para asegurar que el estado se haya actualizado
    const timer = setTimeout(() => {
      loadMore(true)
    }, 100)
    
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng])

  // Listen for reload-feed and remove-feed-item events
  useEffect(() => {
    const handleReload = () => loadMore(true)
    const handleRemove = (e: Event) => {
      const id = (e as CustomEvent).detail?.id
      if (id) setFeed(prev => prev.filter(s => s.id !== id))
    }
    window.addEventListener('reload-feed', handleReload)
    window.addEventListener('remove-feed-item', handleRemove)
    return () => {
      window.removeEventListener('reload-feed', handleReload)
      window.removeEventListener('remove-feed-item', handleRemove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Observer para infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
        loadMore(false)
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersection, { threshold: 0.5 })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [loadMore])

  // Auto-scroll al request resaltado
  useEffect(() => {
    if (highlightedRequestId) {
      const element = document.getElementById(`request-${highlightedRequestId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedRequestId])

  const dailyGoal = 50000
  const goalProgress = Math.min((dailyViewed / dailyGoal) * 100, 100)

  return (
    <div className="h-full overflow-y-auto bg-slate-900 p-4 space-y-3">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <h2 className="text-lg font-black text-white leading-tight">Oportunidades cerca</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">
            Solicitudes reales de personas que necesitan ayuda ahora — tócala para aceptarla
          </p>
        </div>
        <button
          onClick={() => loadMore(true)}
          disabled={loading}
          className="shrink-0 mt-0.5 p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 disabled:opacity-40 transition active:scale-95"
          title="Actualizar"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Live Stats */}
      <LiveStats lat={userLat} lng={userLng} />

      {/* Barra de Meta Diaria */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 rounded-xl p-3 border border-slate-700"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 font-semibold">Meta del día (potencial en CLP)</span>
          <span className="text-xs font-bold text-emerald-400">
            ${dailyViewed.toLocaleString()} / ${dailyGoal.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        {goalProgress >= 100 && (
          <p className="text-xs text-emerald-400 font-bold mt-1 text-center">🎉 ¡Meta alcanzada!</p>
        )}
      </motion.div>

      <div className="space-y-3">
        {feed.map((request, index) => (
          <div key={request.id} id={`request-${request.id}`}>
            <ServiceCard
              request={request}
              index={index}
              onClick={() => onCardClick(request)}
              isHighlighted={highlightedRequestId === request.id}
              onRequestService={onRequestService}
              onOpenChat={onOpenChat}
              onGoToLocation={onGoToLocation}
            />
          </div>
        ))}
      </div>

      {/* Skeleton Loader - Solo mostrar si está cargando Y el feed está vacío */}
      {loading && feed.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}
      
      {/* Estado vacío */}
      {!loading && feed.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-5xl mb-3">📍</div>
          <p className="text-white font-bold text-base mb-1">No hay solicitudes cerca</p>
          <p className="text-slate-400 text-sm mb-4">Las oportunidades aparecen cuando alguien pide ayuda cerca de ti</p>
          <button
            onClick={() => loadMore(true)}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition active:scale-95"
          >
            Buscar de nuevo
          </button>
        </motion.div>
      )}

      {/* Trigger para Infinite Scroll */}
      <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
        {hasMore && loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-orange-400 rounded-full animate-spin" />
            Cargando más...
          </div>
        )}
        {!hasMore && feed.length > 0 && (
          <span className="text-xs text-slate-600">• Viste todas las oportunidades del momento •</span>
        )}
      </div>
    </div>
  )
}
