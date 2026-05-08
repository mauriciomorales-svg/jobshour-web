'use client'

import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react'

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
 * Polling de `/api/v1/requests/mine`: IDs activos para Echo chat y solicitud más reciente.
 * Nota UX: la calificación NO se abre automática para evitar forzar al usuario
 * en casos ambiguos; se mantiene desde "Mis Solicitudes".
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

    const sync = () => {
      fetch(`${getPublicApiBase()}/api/v1/requests/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
        .then((r) => r.json())
        .then((data) => {
          const list = data?.data ?? []
          const activeList = list.filter((sr: any) => ['pending', 'accepted', 'in_progress'].includes(sr.status))
          setOpenActiveRequestsCount(activeList.length)

          const byWorker: Record<number, number> = {}
          for (const sr of activeList) {
            const wid = sr.worker?.id
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
            .map((sr: any) => sr.id)
            .filter((id: any) => typeof id === 'number')
            .sort((a: number, b: number) => b - a)
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
