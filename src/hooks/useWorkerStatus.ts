'use client'

import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react'
import { getPublicApiBase } from '@/lib/api'
import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from '@/lib/mapStorage'
import { MapPoint } from '@/app/components/MapSection'
import { feedbackCopy } from '@/lib/userFacingCopy'

type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'
type ToastFn = (msg: string, type?: 'info' | 'success' | 'error' | 'warning', subtitle?: string) => void

interface UseWorkerStatusOptions {
  workerStatus: WorkerStatus
  setWorkerStatus: Dispatch<SetStateAction<WorkerStatus>>
  workerCategories: number[]
  userLat: number
  userLng: number
  activeCategory: number | null
  fetchNearby: (categoryId?: number | null) => void
  setPoints: Dispatch<SetStateAction<MapPoint[]>>
  userId: number | undefined
  toast: ToastFn
  setActiveSection: (s: 'map' | 'profile' | 'jobs') => void
  setShowSidebar: (v: boolean) => void
  setShowLoginModal: (v: boolean) => void
}

export function useWorkerStatus({
  workerStatus,
  setWorkerStatus,
  workerCategories,
  userLat,
  userLng,
  activeCategory,
  fetchNearby,
  setPoints,
  userId,
  toast,
  setActiveSection,
  setShowSidebar,
  setShowLoginModal,
}: UseWorkerStatusOptions) {
  const workerStatusRef = useRef<WorkerStatus>(workerStatus)
  const [statusLoading, setStatusLoading] = useState(false)
  const [showCategoryRequiredModal, setShowCategoryRequiredModal] = useState(false)

  useEffect(() => {
    workerStatusRef.current = workerStatus
  }, [workerStatus])

  const handleWorkerStatusChange = useCallback(
    async (next: 'active' | 'intermediate' | 'inactive') => {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) { setShowLoginModal(true); return }
      if (next === 'active' && workerCategories.length === 0) {
        setShowCategoryRequiredModal(true); return
      }
      const apiStatus = next === 'intermediate' ? 'listening' : next
      setStatusLoading(true)
      try {
        const res = await fetch(`${getPublicApiBase()}/api/v1/worker/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: apiStatus,
            lat: userLat || DEFAULT_MAP_LAT,
            lng: userLng || DEFAULT_MAP_LNG,
            categories: next === 'active' ? workerCategories : undefined,
          }),
        })
        const data = await res.json()
        if (data.status === 'success') {
          setWorkerStatus(next)
          if (userId) {
            setPoints((prev) =>
              prev.map((p) => {
                const isMe = (p.user_id && p.user_id === userId) || p.id === userId
                if (!isMe || p.pin_type === 'demand') return p
                return { ...p, status: next as 'active' | 'intermediate' | 'inactive' }
              })
            )
          }
          fetchNearby(activeCategory)
          const labels = {
            active: '🟢 Disponibilidad Inmediata activada',
            intermediate: '🔵 Disponibilidad Flexible activada',
            inactive: '⚫ Te desconectaste del mapa',
          }
          toast(labels[next], next === 'inactive' ? 'info' : 'success')
        } else {
          toast(data.message || 'Error al actualizar estado', 'error')
        }
      } catch {
        toast(feedbackCopy.networkError, 'error')
      } finally {
        setStatusLoading(false)
      }
    },
    [workerCategories, userLat, userLng, activeCategory, fetchNearby, setPoints, setWorkerStatus, userId, toast, setShowLoginModal]
  )

  const handleCategoryRequiredGoProfile = useCallback(() => {
    setShowCategoryRequiredModal(false)
    setActiveSection('profile')
    setShowSidebar(true)
  }, [setActiveSection, setShowSidebar])

  const handleCategoryRequiredCancel = useCallback(() => {
    setShowCategoryRequiredModal(false)
  }, [])

  return {
    workerStatusRef,
    statusLoading,
    showCategoryRequiredModal,
    setShowCategoryRequiredModal,
    handleWorkerStatusChange,
    handleCategoryRequiredGoProfile,
    handleCategoryRequiredCancel,
  }
}
