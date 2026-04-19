'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { emptyStateCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

interface LiveStatsProps {
  lat: number
  lng: number
  radius?: number
}

interface StatsData {
  active_workers: number
  active_demands: number
  message: string
}

export default function LiveStats({ lat, lng, radius = 50 }: LiveStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    active_workers: 0,
    active_demands: 0,
    message: 'Cargando...',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const url = `/api/v1/dashboard/live-stats?lat=${lat}&lng=${lng}&radius=${radius}`
      console.log('📊 LiveStats: Iniciando fetch a:', url)
      
      try {
        const res = await fetch(url)
        console.log('📊 LiveStats: Respuesta recibida. Status:', res.status, 'OK:', res.ok)
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'No se pudo leer el error')
          console.error('❌ LiveStats: Error HTTP', res.status, ':', errorText.substring(0, 200))
          throw new Error(`HTTP ${res.status}: ${res.statusText}. Respuesta: ${errorText.substring(0, 100)}`)
        }
        
        const data = await res.json()
        console.log('📊 LiveStats: Datos recibidos:', JSON.stringify(data, null, 2))
        
        if (data.status === 'success' && data.data) {
          console.log('✅ LiveStats: Datos válidos. Workers:', data.data.active_workers, 'Demands:', data.data.active_demands)
          setStats({
            active_workers: data.data.active_workers || 0,
            active_demands: data.data.active_demands || 0,
            message: data.data.message || 'Pueblo activo'
          })
          setLoading(false)
        } else {
          console.warn('⚠️ LiveStats: Respuesta inválida. Status:', data.status, 'Data:', data.data)
          // Si la respuesta no es válida, usar valores por defecto
          setStats({
            active_workers: 0,
            active_demands: 0,
            message: emptyStateCopy.liveStatsUnavailable
          })
          setLoading(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('❌ LiveStats: Error completo:', errorMessage)
        console.error('❌ LiveStats: Stack:', err instanceof Error ? err.stack : 'N/A')
        // En caso de error, mostrar mensaje de error pero dejar de cargar
        setStats({
          active_workers: 0,
          active_demands: 0,
          message: `Error al cargar datos: ${errorMessage.substring(0, 50)}`
        })
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Actualizar cada 30s
    
    return () => clearInterval(interval)
  }, [lat, lng, radius])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={uiTone.liveStatsStrip}
    >
      <div className="flex items-start gap-3">
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-3xl shrink-0"
        >
          🌍
        </motion.span>
        
        <div className="flex-1">
          <p className="text-xs opacity-90 font-bold uppercase tracking-wider mb-1">PUEBLO VIVO</p>
          <p className="font-black text-lg leading-tight mb-3">
            {loading ? 'Cargando...' : stats.message}
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">👥</span>
              <span className="text-xs font-bold">{stats.active_workers} socios</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">💰</span>
              <span className="text-xs font-bold">{stats.active_demands} demandas</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
