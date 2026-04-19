'use client'

import { useState, useCallback } from 'react'
import { ExpertDetail } from '@/app/components/HomeWorkerDetailSheet'
import { MapPoint } from '@/app/components/MapSection'
import { feedbackCopy } from '@/lib/userFacingCopy'

type ToastFn = (msg: string, type?: 'info' | 'success' | 'error' | 'warning', subtitle?: string) => void

interface CheckAuthResult {
  canInteract: boolean
  reason?: 'login' | 'profile'
}

interface UsePointDetailOptions {
  checkAuthAndProfile: () => CheckAuthResult
  setShowLoginModal: (v: boolean) => void
  setShowChat: (v: boolean) => void
  fetchNearby: (categoryId?: number | null) => void
  activeCategory: number | null
  toast: ToastFn
}

export function usePointDetail({
  checkAuthAndProfile,
  setShowLoginModal,
  setShowChat,
  fetchNearby,
  activeCategory,
  toast,
}: UsePointDetailOptions) {
  const [selectedDetail, setSelectedDetail] = useState<ExpertDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [highlightedRequestId, setHighlightedRequestId] = useState<number | null>(null)
  const [showWorkerProfileDetail, setShowWorkerProfileDetail] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)

  const handlePointClick = useCallback(async (point: MapPoint) => {
    if (point.pin_type === 'premium_store') {
      setSelectedDetail(null)
      setLoadingDetail(false)
      const url = point.store_url || (point.payload as any)?.store_url || 'https://dondemorales.cl'
      try { window.open(url, '_blank', 'noopener,noreferrer') } catch {}
      return
    }

    setLoadingDetail(true)
    setSelectedDetail(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const headers: HeadersInit = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      if (point.pin_type === 'demand') {
        const r = await fetch(`/api/v1/demand/${point.id}`, { headers })
        if (!r.ok) {
          const errorText = await r.text()
          throw new Error(`Error ${r.status}: ${errorText}`)
        }
        const data = await r.json()
        if (data.data) {
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
        }
      } else {
        const r = await fetch(`/api/v1/experts/${point.id}`, { headers })
        if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`)
        const data = await r.json()
        if (data.data) setSelectedDetail(data.data)
      }
    } catch (err) {
      console.error('Error fetching detail:', err)
      toast(err instanceof Error ? err.message : 'Error al cargar los detalles', 'error')
    }

    setLoadingDetail(false)
  }, [toast])

  const handleMapClick = useCallback(() => {
    setSelectedDetail(null)
    setLoadingDetail(false)
  }, [])

  const handleDetailTravelJoin = useCallback(async (detail: ExpertDetail | null) => {
    if (!detail) return
    const auth = checkAuthAndProfile()
    if (!auth.canInteract) {
      setShowLoginModal(true)
      toast(auth.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil', 'info')
      return
    }
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      const res = await fetch(`/api/v1/demand/${detail.id}/take`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.status === 'success') {
        toast(detail.travel_role === 'driver' ? '🙋 Solicitud enviada al chofer' : '🚗 Te ofreciste como chofer', 'success')
        setSelectedDetail(null)
        fetchNearby(activeCategory)
      } else {
        toast(data.message || 'Error al conectar', 'error')
      }
    } catch {
      toast(feedbackCopy.networkError, 'error')
    }
  }, [checkAuthAndProfile, setShowLoginModal, toast, fetchNearby, activeCategory])

  const handleDetailChat = useCallback(() => {
    const a = checkAuthAndProfile()
    if (!a.canInteract) { setShowLoginModal(true); return }
    setShowChat(true)
  }, [checkAuthAndProfile, setShowLoginModal, setShowChat])

  const handleDetailRequest = useCallback(() => {
    const a = checkAuthAndProfile()
    if (!a.canInteract) {
      setShowLoginModal(true)
      toast(
        a.reason === 'login' ? 'Inicia sesión para continuar' : 'Completa tu perfil',
        a.reason === 'login' ? 'info' : 'warning'
      )
      return
    }
    setShowRequestModal(true)
  }, [checkAuthAndProfile, setShowLoginModal, toast])

  const handleDetailCallPhone = useCallback((phone?: string | null) => {
    const a = checkAuthAndProfile()
    if (!a.canInteract) {
      setShowLoginModal(true)
      toast('Inicia sesión para ver el teléfono', 'info')
      return
    }
    if (phone) window.open(`tel:${phone}`, '_self')
  }, [checkAuthAndProfile, setShowLoginModal, toast])

  const handleDetailVerWorkerProfile = useCallback((detail: ExpertDetail | null) => {
    if (!detail) return
    setSelectedWorkerId(detail.id)
    setShowWorkerProfileDetail(true)
  }, [])

  return {
    selectedDetail,
    setSelectedDetail,
    loadingDetail,
    setLoadingDetail,
    highlightedRequestId,
    setHighlightedRequestId,
    showWorkerProfileDetail,
    setShowWorkerProfileDetail,
    selectedWorkerId,
    setSelectedWorkerId,
    showRequestModal,
    setShowRequestModal,
    handlePointClick,
    handleMapClick,
    handleDetailTravelJoin,
    handleDetailChat,
    handleDetailRequest,
    handleDetailCallPhone,
    handleDetailVerWorkerProfile,
  }
}
