'use client'

import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react'

import { getPublicApiBase } from '@/lib/api'
import {
  findPendingRatingRequest,
  markRatingPrompted,
  workerInfoFromRequest,
  type RateableServiceRequest,
} from '@/lib/ratingPrompt'

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
 * Polling de `/api/v1/requests/mine`: IDs activos para Echo chat y solicitud más reciente.
 * Abre el modal de reseña una vez por solicitud completada elegible (`can_rate`).
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
  const [chatRequestByWorkerId, setChatRequestByWorkerId] = useState<Record<number, number>>({})
  const activeRequestIdRef = useRef<number | null>(null)
  const lastLoggedIdsKeyRef = useRef<string>('')

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId
  }, [activeRequestId])

  useEffect(() => {
    if (!user) setOpenActiveRequestsCount(0)
  }, [user])

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('auth_token') || localStorage.getItem('token'))
      : null
    if (!user || !token) return

    const sameIds = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
      return true
    }

    const maybeOpenRatingModal = (list: RateableServiceRequest[]) => {
      const pending = findPendingRatingRequest(list)
      if (!pending) return
      const info = workerInfoFromRequest(pending)
      markRatingPrompted(pending.id)
      setRatingRequestId(pending.id)
      setRatingWorkerInfo(info)
      setShowRatingModal(true)
    }

    const sync = () => {
      fetch(`${getPublicApiBase()}/api/v1/requests/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
        .then((r) => r.json())
        .then((data) => {
          const list = (data?.data ?? []) as RateableServiceRequest[]
          const activeList = list.filter((sr) => ['pending', 'accepted', 'in_progress'].includes(sr.status))
          setOpenActiveRequestsCount(activeList.length)

          const byWorker: Record<number, number> = {}
          for (const sr of activeList) {
            const wid = sr.worker?.id as number | undefined
            if (typeof wid === 'number' && byWorker[wid] === undefined) {
              byWorker[wid] = sr.id
            }
          }
          setChatRequestByWorkerId((prev) => {
            const a = JSON.stringify(prev)
            const b = JSON.stringify(byWorker)
            return a === b ? prev : byWorker
          })

          const ids = activeList
            .map((sr) => sr.id)
            .filter((id): id is number => typeof id === 'number')
            .sort((a, b) => b - a)
            .slice(0, 5)

          setActiveChatRequestIds((prev) => (sameIds(prev, ids) ? prev : ids))

          const idsKey = ids.join(',')
          if (lastLoggedIdsKeyRef.current !== idsKey) {
            lastLoggedIdsKeyRef.current = idsKey
            console.log('[ChatNotify] sync active request ids', ids)
          }

          const mostRecentId = ids[0]
          if (typeof mostRecentId === 'number' && mostRecentId !== activeRequestIdRef.current) {
            setActiveRequestId(mostRecentId)
          }

          maybeOpenRatingModal(list)
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
    setActiveChatRequestIds,
    setActiveRequestId,
    setRatingRequestId,
    setRatingWorkerInfo,
    setShowRatingModal,
  ])

  return { openActiveRequestsCount, chatRequestByWorkerId }
}
