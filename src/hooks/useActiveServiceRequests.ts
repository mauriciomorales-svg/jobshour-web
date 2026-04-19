'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

import { getPublicApiBase } from '@/lib/api'

export interface UseActiveServiceRequestsParams {
  user: { id: number } | null
  activeRequestId: number | null
  setActiveChatRequestIds: Dispatch<SetStateAction<number[]>>
  setActiveRequestId: Dispatch<SetStateAction<number | null>>
  setRatingRequestId: Dispatch<SetStateAction<number | null>>
  setRatingWorkerInfo: Dispatch<SetStateAction<{ name: string; avatar: string | null } | null>>
  setShowRatingModal: Dispatch<SetStateAction<boolean>>
}

/**
 * Polling de `/api/v1/requests/mine`: IDs activos para Echo chat, solicitud más reciente, modal de calificación post-servicio.
 */
export function useActiveServiceRequests({
  user,
  activeRequestId,
  setActiveChatRequestIds,
  setActiveRequestId,
  setRatingRequestId,
  setRatingWorkerInfo,
  setShowRatingModal,
}: UseActiveServiceRequestsParams) {
  const [openActiveRequestsCount, setOpenActiveRequestsCount] = useState(0)

  useEffect(() => {
    if (!user) setOpenActiveRequestsCount(0)
  }, [user])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!user || !token) return

    const sameIds = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
      return true
    }

    const sync = () => {
      fetch(`${getPublicApiBase()}/api/v1/requests/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.json())
        .then((data) => {
          const list = data?.data ?? []
          const activeList = list.filter((sr: any) => ['pending', 'accepted', 'in_progress'].includes(sr.status))
          setOpenActiveRequestsCount(activeList.length)

          const ids = activeList
            .map((sr: any) => sr.id)
            .filter((id: any) => typeof id === 'number')
            .sort((a: number, b: number) => b - a)
            .slice(0, 5)

          setActiveChatRequestIds((prev) => (sameIds(prev, ids) ? prev : ids))

          console.log('[ChatNotify] sync active request ids', ids)

          const mostRecentId = ids[0]
          if (typeof mostRecentId === 'number' && mostRecentId !== activeRequestId) setActiveRequestId(mostRecentId)

          const completedList = list.filter((sr: any) => sr.status === 'completed')
          completedList.forEach((sr: any) => {
            const storageKey = `rated_${sr.id}`
            const alreadyRated = localStorage.getItem(storageKey)

            if (!alreadyRated && sr.worker) {
              fetch(`${getPublicApiBase()}/api/v1/workers/${sr.worker.id}/reviews`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
                .then((r) => r.json())
                .then((reviewsData) => {
                  const hasReview = reviewsData.data?.some((r: any) => r.service_request_id === sr.id)

                  if (!hasReview) {
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
  }, [
    user,
    activeRequestId,
    setActiveChatRequestIds,
    setActiveRequestId,
    setRatingRequestId,
    setRatingWorkerInfo,
    setShowRatingModal,
  ])

  return { openActiveRequestsCount }
}
