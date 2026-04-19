'use client'

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import type { MapPoint } from '@/app/components/MapSection'

export interface UseEchoRealtimeParams {
  user: { id: number } | null
  toast: (title: string, type?: 'success' | 'error' | 'info' | 'warning', body?: string, duration?: number) => void
  playNotifSound: () => void
  setNotifBadge: Dispatch<SetStateAction<number>>
  setActiveRequestId: Dispatch<SetStateAction<number | null>>
  setPoints: Dispatch<SetStateAction<MapPoint[]>>
  userLatRef: MutableRefObject<number>
  userLngRef: MutableRefObject<number>
  fetchWorkerCount: (lat: number, lng: number) => void | Promise<void>
  activeChatRequestIds: number[]
  showChat: boolean
  chatNotifySeenIdsRef: MutableRefObject<Set<number>>
  chatNotifySubscribedIdsRef: MutableRefObject<Set<number>>
  setChatBadge: Dispatch<SetStateAction<number>>
}

/**
 * Laravel Echo / Pusher: canales privados de usuario y worker, mapa `workers`, y chats por solicitud.
 */
export function useEchoRealtime({
  user,
  toast,
  playNotifSound,
  setNotifBadge,
  setActiveRequestId,
  setPoints,
  userLatRef,
  userLngRef,
  fetchWorkerCount,
  activeChatRequestIds,
  showChat,
  chatNotifySeenIdsRef,
  chatNotifySubscribedIdsRef,
  setChatBadge,
}: UseEchoRealtimeParams) {
  useEffect(() => {
    if (!user?.id) return

    let echo: any = null
    let mounted = true
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    import('@/lib/echo').then(({ getEcho }) => {
      if (!mounted) return
      echo = getEcho()
      if (!echo) return

      const pusher = (echo as any)?.connector?.pusher

      const notify = (title: string, body?: string) => {
        toast(title, 'info', body, 7000)
        setNotifBadge((prev) => prev + 1)
        if (hideTimer) clearTimeout(hideTimer)

        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: body || '', icon: '/icon-192x192.png' })
          }
        } catch {
          /* ignore */
        }
      }

      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {})
        }
      } catch {
        /* ignore */
      }

      const workerChannel = echo.private(`worker.${user.id}`)
      const userChannel = echo.private(`user.${user.id}`)

      try {
        const workerPusherName = `private-worker.${user.id}`
        const userPusherName = `private-user.${user.id}`
        const rawWorker = pusher?.channel?.(workerPusherName)
        const rawUser = pusher?.channel?.(userPusherName)

        rawWorker?.bind('pusher:subscription_succeeded', () =>
          console.log('[Notifications] subscription_succeeded', { channel: workerPusherName }),
        )
        rawWorker?.bind('pusher:subscription_error', (status: unknown) =>
          console.error('[Notifications] subscription_error', { channel: workerPusherName, status }),
        )

        rawUser?.bind('pusher:subscription_succeeded', () =>
          console.log('[Notifications] subscription_succeeded', { channel: userPusherName }),
        )
        rawUser?.bind('pusher:subscription_error', (status: unknown) =>
          console.error('[Notifications] subscription_error', { channel: userPusherName, status }),
        )
      } catch (e) {
        console.error('[Notifications] Failed to bind subscription events', e)
      }

      workerChannel
        .listen('.request.new', (e: any) => {
          console.log('[Notifications] .request.new', e)
          const reqId = e?.id
          if (typeof reqId === 'number') setActiveRequestId(reqId)
          const clientName = e?.client?.name || e?.client_name || ''
          const desc = e?.description ? String(e.description).slice(0, 60) : ''
          notify(`🔔 Nueva solicitud${clientName ? ` de ${clientName}` : ''}`, desc || 'Alguien quiere contratarte')
          playNotifSound()
        })
        .listen('.request.updated', (e: any) => {
          console.log('[Notifications] .request.updated (worker)', e)
          const statusMap: Record<string, string> = {
            cancelled: '❌ Solicitud cancelada por el cliente',
            completed: '🎉 Servicio marcado como completado',
          }
          notify('Solicitud actualizada', statusMap[e?.status] || `Estado: ${e?.status ?? 'actualizado'}`)
        })

      userChannel.listen('.request.updated', (e: any) => {
        console.log('[Notifications] .request.updated (user)', e)
        const statusMap: Record<string, string> = {
          accepted: '✅ ¡Tu solicitud fue aceptada!',
          rejected: '❌ Tu solicitud fue rechazada',
          completed: '🎉 Servicio completado. ¡Califica al trabajador!',
          cancelled: '🚫 Solicitud cancelada',
        }
        notify('Actualización de solicitud', statusMap[e?.status] || `Estado: ${e?.status ?? 'actualizado'}`)
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
          /* ignore */
        }
      }
    }
    // toast/playNotifSound/setters estables o intencionalmente no listados (evitar re-suscribir canales en cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    let echo: any = null
    let mounted = true

    import('@/lib/echo').then(({ getEcho }) => {
      if (!mounted) return
      echo = getEcho()
      if (!echo) return

      echo.channel('workers').listen('.worker.updated', (e: any) => {
        if (!e?.worker_id) return
        if (e.user_id && user?.id && e.user_id === user.id) return
        const newStatus: 'active' | 'intermediate' | 'inactive' =
          e.status === 'intermediate' ? 'intermediate' : e.status === 'inactive' ? 'inactive' : e.is_active ? 'active' : 'inactive'
        setPoints((prev: MapPoint[]) =>
          prev.map((p) => {
            if (p.id !== e.worker_id || p.pin_type === 'demand') return p
            return {
              ...p,
              status: newStatus,
              pos: e.lat && e.lng ? { lat: e.lat, lng: e.lng } : p.pos,
            }
          }),
        )
        void fetchWorkerCount(userLatRef.current, userLngRef.current)
      })
    })

    return () => {
      mounted = false
      if (echo) {
        try {
          echo.leave('workers')
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- no reconectar al mover mapa / cambiar user en caliente
  }, [])

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

        const senderName = msg?.sender_name ? String(msg.sender_name) : ''
        const text = msg?.body ? String(msg.body).slice(0, 80) : 'Nuevo mensaje'
        const title = senderName ? `💬 ${senderName}` : '💬 Nuevo mensaje'

        setChatBadge((prev) => prev + 1)

        if (!shouldNotify) return

        console.log('[ChatNotify] message.new', { id: msgId, sender: senderName })
        toast(title, 'info', text, 5000)
        playNotifSound()

        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: text, icon: '/icon-192x192.png' })
          }
        } catch {
          /* ignore */
        }
      }

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
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mismo criterio que page.tsx (solo ids de chat y visibilidad)
  }, [user?.id, activeChatRequestIds, showChat])
}
