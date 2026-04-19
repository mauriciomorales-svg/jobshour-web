'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  user: any
  onActivate: () => void
  onShowLogin: () => void
  onRequireCategory?: () => void
  onStatusChange?: () => void
}

export default function WorkerFAB({ user, onActivate, onShowLogin, onRequireCategory, onStatusChange }: Props) {
  // Estados: guest | inactive | listening | active
  // Ciclo: OFF (inactive) → ACTIVE (active) → LISTENING (listening) → OFF
  const [workerStatus, setWorkerStatus] = useState<'guest' | 'inactive' | 'listening' | 'active'>('guest')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setWorkerStatus('guest')
    } else {
      checkWorkerStatus()
    }
  }, [user])

  const checkWorkerStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const res = await apiFetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await res.json()
      
      if (!data.worker) {
        setWorkerStatus('inactive')
      } else {
        // IMPORTANTE: Después del login, SIEMPRE empezar en inactive (plomo)
        // El usuario debe activar explícitamente el modo trabajador
        // No usar el estado del backend - el usuario debe cambiarlo manualmente
        setWorkerStatus('inactive')
      }
    } catch {
      setWorkerStatus('inactive')
    }
  }

  const cycleStatus = async (currentStatus: string) => {
    // OFF → ACTIVE → LISTENING → OFF
    if (currentStatus === 'inactive') return 'active'
    if (currentStatus === 'active') return 'listening'
    return 'inactive' // listening → inactive
  }

  const handleClick = async () => {
    if (workerStatus === 'guest') {
      localStorage.setItem('worker_intent', 'activate')
      onShowLogin()
      return
    }

    if (workerStatus === 'inactive') {
      // Ir a activación (modal) para seleccionar categoría y pasar a ACTIVE
      onActivate()
      return
    }

    // Ciclo ACTIVE → LISTENING → OFF
    const nextStatus = await cycleStatus(workerStatus)
    
    const confirmMessages: Record<string, string> = {
      'listening': '¿Cambiar a Modo Ahorro? Seguirás visible a 5km.',
      'inactive': '¿Desconectarte del mapa?',
    }
    
    if (!confirm(confirmMessages[nextStatus])) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(async (position) => {
        const res = await apiFetch('/api/v1/worker/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: nextStatus,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        })

        const data = await res.json()

        if (res.status === 422 && data.code === 'REQUIRE_CATEGORY') {
          onRequireCategory?.()
          setLoading(false)
          return
        }

        if (res.ok) {
          // Actualizar estado local
          if (nextStatus === 'active') setWorkerStatus('active')
          else if (nextStatus === 'listening') setWorkerStatus('listening')
          else setWorkerStatus('inactive')
          
          // Refrescar perfil
          checkWorkerStatus()
          // Notificar cambio de estado para refrescar mapa
          onStatusChange?.()
        }
        setLoading(false)
      })
    } catch {
      setLoading(false)
    }
  }

  const getButtonStyle = () => {
    switch (workerStatus) {
      case 'guest':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'inactive':
        return 'bg-gray-500 hover:bg-gray-600 text-white'
      case 'listening':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'active':
        return 'bg-teal-500 hover:bg-teal-600 text-white'
    }
  }

  const getButtonText = () => {
    switch (workerStatus) {
      case 'guest':
        return '💸 Ganar dinero extra'
      case 'inactive':
        return '⚫ Modo Worker: OFF'
      case 'listening':
        return '🟡 Modo Ahorro: ON'
      case 'active':
        return '🟢 Modo Trabajo: ON'
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-4 py-2 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 text-sm ${getButtonStyle()} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Procesando...' : getButtonText()}
    </button>
  )
}
