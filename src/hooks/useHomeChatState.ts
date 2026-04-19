'use client'

import { useRef, useState } from 'react'

export type HomeChatContext = {
  description?: string
  name?: string
  avatar?: string | null
  myRole?: 'cliente' | 'trabajador'
  isSelf?: boolean
}

export function useHomeChatState() {
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)
  const [activeChatRequestIds, setActiveChatRequestIds] = useState<number[]>([])
  const [showChat, setShowChat] = useState(false)
  const [chatBadge, setChatBadge] = useState(0)
  const [chatContext, setChatContext] = useState<HomeChatContext>({})
  const chatNotifySeenIdsRef = useRef<Set<number>>(new Set())
  const chatNotifySubscribedIdsRef = useRef<Set<number>>(new Set())

  return {
    activeRequestId,
    setActiveRequestId,
    activeChatRequestIds,
    setActiveChatRequestIds,
    showChat,
    setShowChat,
    chatBadge,
    setChatBadge,
    chatContext,
    setChatContext,
    chatNotifySeenIdsRef,
    chatNotifySubscribedIdsRef,
  }
}
