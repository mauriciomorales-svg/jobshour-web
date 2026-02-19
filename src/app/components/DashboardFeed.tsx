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
      const url = `https://jobshour.dondemorales.cl/api/v1/dashboard/feed?lat=${userLat}&lng=${userLng}&cursor=${currentCursor}&_t=${Date.now()}`
      
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
    <div className="h-full overflow-y-auto bg-slate-900 p-4 space-y-4">
      {/* Header con título */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h2 className="text-lg font-black text-white">Feed de Oportunidades</h2>
        </div>
      </div>

      {/* Live Stats */}
      <LiveStats lat={userLat} lng={userLng} />

      {/* Barra de Meta Diaria */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 rounded-xl p-4 border border-slate-700"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">💰</span>
            <span className="text-sm text-white font-bold">Meta Diaria</span>
          </div>
          <span className="text-sm font-bold text-emerald-400">
            ${dailyViewed.toLocaleString()} / ${dailyGoal.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Feed de Oportunidades */}
      {/* Botón de refrescar */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => loadMore(true)}
          disabled={loading}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Actualizar feed"
        >
          {loading ? '🔄' : '↻'} Actualizar
        </button>
      </div>

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
      
      {/* Mensaje cuando no hay datos y no está cargando */}
      {!loading && feed.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">No hay oportunidades disponibles</p>
          <button
            onClick={() => loadMore(true)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            ↻ Intentar de nuevo
          </button>
        </div>
      )}

      {/* Trigger para Infinite Scroll */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {hasMore && !loading && (
          <span className="text-xs text-slate-500">Desliza para ver más...</span>
        )}
        {!hasMore && feed.length > 0 && (
          <span className="text-xs text-slate-600">No hay más oportunidades por ahora</span>
        )}
      </div>
    </div>
  )
}
