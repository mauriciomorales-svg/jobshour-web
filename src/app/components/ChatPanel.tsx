'use client'
import { chatMoneyCopy, emptyStateCopy, feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState, useEffect, useRef, useCallback } from 'react'
import ChatImageUpload from './ChatImageUpload'
import { apiFetch } from '@/lib/api'
import { jhFlowLog } from '@/lib/jhFlowLog'
import { chatEmailBadge } from '@/lib/chatIdentity'
import { getChatNextStep } from '@/lib/requestFlow'
import { trackFunnelEvent } from '@/lib/analyticsFunnel'
import dynamic from 'next/dynamic'
const VoiceInput = dynamic(() => import('./VoiceInput'), { ssr: false })
const ReportProblemModal = dynamic(() => import('./ReportProblemModal'), { ssr: false })

interface ChatMessage {
  id: number
  sender_id: number
  sender_name: string
  sender_avatar: string | null
  sender_email?: string | null
  body: string
  type: string
  created_at: string
}

interface ChatPricingFromApi {
  agreed_base_clp: number | null
  base_used_for_mp_clp: number
  mp_total_clp: number
  mp_factor: number
  source: string
  adjustment_pending: boolean
  proposed_adjusted_clp: number | null
}

interface Props {
  requestId: number
  currentUserId: number
  onClose: () => void
  requestDescription?: string
  otherPersonName?: string
  otherPersonAvatar?: string | null
  otherPersonPhone?: string | null
  /** Correo del interlocutor (único); refuerza nombre cuando hay homónimos. */
  otherPersonEmail?: string | null
  myRole?: 'cliente' | 'trabajador'
  isSelf?: boolean
  /** Mismo formulario “¿Qué necesitas?” que en el mapa (PublishDemandModal) */
  onOpenPublishDemandFromChat?: (draft?: { description?: string } | null) => void
}

export default function ChatPanel({ requestId, currentUserId, onClose, requestDescription, otherPersonName, otherPersonAvatar, otherPersonPhone, otherPersonEmail, myRole, isSelf, onOpenPublishDemandFromChat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<string | null>(null)
  const [serviceRequestDbId, setServiceRequestDbId] = useState<number | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [interlocutorEmail, setInterlocutorEmail] = useState<string | null>(otherPersonEmail ?? null)
  const [chatPricing, setChatPricing] = useState<ChatPricingFromApi | null>(null)
  const [offeredPriceHint, setOfferedPriceHint] = useState<number | null>(null)
  const [paymentStatusHint, setPaymentStatusHint] = useState<string | null>(null)
  const [showReportProblem, setShowReportProblem] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const subscribedRequestIdRef = useRef<number | null>(null)
  const boundConnectionRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastWhisperRef = useRef<number>(0)

  const mergeUniqueById = (prev: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map<number, ChatMessage>()
    for (const m of prev) map.set(m.id, m)
    for (const m of incoming) map.set(m.id, m)
    return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const parsePaymentLinkPayload = (raw: string): { amount: number; link: string } | null => {
    const normalizeLink = (value: string): string =>
      value.replace(/\\\//g, '/').trim()

    const fromObject = (parsed: any): { amount: number; link: string } | null => {
      if (parsed?.type === 'payment_link' && typeof parsed?.link === 'string' && parsed.link) {
        return {
          amount: Number(parsed?.amount || 0),
          link: normalizeLink(parsed.link),
        }
      }
      return null
    }

    try {
      const parsed = JSON.parse(raw)
      const direct = fromObject(parsed)
      if (direct) return direct
      if (typeof parsed === 'string') {
        const parsedTwice = JSON.parse(parsed)
        const nested = fromObject(parsedTwice)
        if (nested) return nested
      }
    } catch {
      // fallback regex for malformed payloads already persisted in DB
    }

    const text = String(raw || '')
    const looksLikePayment = /payment_link/i.test(text)
    if (!looksLikePayment) return null

    const amountMatch = text.match(/"amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i)
    const linkMatch = text.match(/"link"\s*:\s*"([^"]+)"/i)
    const link = linkMatch ? normalizeLink(linkMatch[1]) : ''
    if (!link) return null

    return {
      amount: amountMatch ? Number(amountMatch[1]) : 0,
      link,
    }
  }

  const fetchMessages = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      const r = await apiFetch(`/api/v1/requests/${requestId}/messages`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await r.json()
      setMessages(prev => mergeUniqueById(prev, data.data ?? []))
    } catch {
      // silent fallback
    }
  }, [requestId])

  const markRead = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      await apiFetch(`/api/v1/requests/${requestId}/messages/read`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
    } catch {
      // silent
    }
  }, [requestId])

  const formatClp = (n: number) =>
    `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })} CLP`

  const pricingSourceLabel = (src: string) => {
    if (src === 'negotiated') return chatMoneyCopy.sourceNegotiated
    if (src === 'hourly_rate') return chatMoneyCopy.sourceHourly
    return chatMoneyCopy.sourceDefault
  }

  const fetchServiceRequestSummary = useCallback(async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    try {
      const r = await apiFetch(`/api/v1/requests/${requestId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await r.json()
      const sr = data.data ?? data
      if (sr?.status) setServiceStatus(sr.status)
      if (sr?.id) setServiceRequestDbId(sr.id)
      const op = sr?.offered_price
      setOfferedPriceHint(typeof op === 'number' && op > 0 ? op : null)
      setPaymentStatusHint(typeof sr?.payment_status === 'string' ? sr.payment_status : null)
      const p = sr?.pricing
      if (p && typeof p.base_used_for_mp_clp === 'number') {
        setChatPricing({
          agreed_base_clp: p.agreed_base_clp ?? null,
          base_used_for_mp_clp: Number(p.base_used_for_mp_clp),
          mp_total_clp: Number(p.mp_total_clp),
          mp_factor: Number(p.mp_factor) || 1.08,
          source: String(p.source ?? 'default'),
          adjustment_pending: Boolean(p.adjustment_pending),
          proposed_adjusted_clp:
            p.proposed_adjusted_clp != null ? Number(p.proposed_adjusted_clp) : null,
        })
      }
      const cid = sr?.client?.id
      if (typeof cid === 'number' && typeof currentUserId === 'number') {
        const email =
          cid === currentUserId
            ? (sr.worker?.email ?? null)
            : (sr.client?.email ?? null)
        if (email) setInterlocutorEmail(email)
      }
    } catch {
      // silent
    }
  }, [requestId, currentUserId])

  useEffect(() => {
    setInterlocutorEmail(otherPersonEmail ?? null)
  }, [otherPersonEmail])

  useEffect(() => {
    trackFunnelEvent('chat_open', { request_id: requestId, role: myRole ?? 'unknown' })
  }, [requestId, myRole])

  // Estado del servicio, correo del interlocutor y montos (misma fuente que el cobro MP)
  useEffect(() => {
    void fetchServiceRequestSummary()
  }, [fetchServiceRequestSummary])

  // Fetch existing messages
  useEffect(() => {
    void fetchMessages()
    void markRead()
  }, [fetchMessages, markRead])

  // Listen for new messages via WebSocket
  useEffect(() => {
    let echo: any = null
    let cancelled = false

    import('@/lib/echo').then(({ getEcho }) => {
      if (cancelled) return
      echo = getEcho()
      console.log('[Chat] Echo instance:', echo ? 'OK' : 'NULL')
      if (!echo) return

      const channelName = `chat.${requestId}`
      console.log('[Chat] Subscribing to private channel:', channelName)
      const echoChannel = echo.private(channelName)

      echoChannel
        .subscribed(() => console.log('[Chat] ✅ Subscribed to', channelName))
        .error((err: any) => console.error('[Chat] ❌ Channel error:', JSON.stringify(err)))

      echoChannel.listen('.message.new', (e: any) => {
        console.log('[Chat] 📨 Message received:', e)
        const msg: ChatMessage | null = e?.message ?? e ?? null
        if (!msg || typeof msg.id !== 'number') return
        setMessages(prev => mergeUniqueById(prev, [msg]))
        void markRead()
      })

      echoChannel.listen('.typing', (e: any) => {
        if (e.user_id !== currentUserId) {
          setOtherTyping(true)
          setTimeout(() => setOtherTyping(false), 3000)
        }
      })
    })

    return () => {
      cancelled = true
      if (echo) echo.leave(`chat.${requestId}`)
    }
  }, [requestId, currentUserId, markRead])

  // Polling fallback: evita perder mensajes cuando falla websocket; refresca montos por si hubo ajuste/aprobación.
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMessages()
      void markRead()
      void fetchServiceRequestSummary()
    }, 4500)
    return () => clearInterval(interval)
  }, [requestId, fetchMessages, markRead, fetchServiceRequestSummary])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleTyping = () => {
    setIsTyping(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)

    // Throttle whisper: máximo una vez cada 3 segundos
    const now = Date.now()
    if (now - lastWhisperRef.current < 3000) return
    lastWhisperRef.current = now

    import('@/lib/echo').then(({ getEcho }) => {
      const echo = getEcho()
      if (echo) {
        try {
          echo.private(`chat.${requestId}`).whisper('typing', {
            user_id: currentUserId,
          })
        } catch (e) {
          // ignore
        }
      }
    })
  }

  const handleSend = async () => {
    if ((!newMsg.trim() && !selectedImage) || sending) return
    setSending(true)
    setIsTyping(false)
    
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const formData = new FormData()
      
      if (selectedImage) {
        formData.append('image', selectedImage)
      }
      if (newMsg.trim()) {
        formData.append('body', newMsg.trim())
      }

      const r = await apiFetch(`/api/v1/requests/${requestId}/messages`, {
        method: 'POST',
        headers: { 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
      })
      const data = await r.json()
      if (r.ok) {
        const msg: ChatMessage = {
          id: data.data.id,
          sender_id: data.data.sender_id,
          sender_name: data.data.sender_name,
          sender_avatar: null,
          sender_email: data.data.sender_email ?? null,
          body: data.data.body,
          type: data.data.type,
          created_at: data.data.created_at,
        }
        setMessages(prev => mergeUniqueById(prev, [msg]))
        setNewMsg('')
        setSelectedImage(null)
      } else {
        console.error('Error enviando mensaje:', data)
        alert(data?.message || feedbackCopy.networkErrorRetry)
      }
    } catch (err) {
      console.error('Error de red:', err)
      alert(feedbackCopy.networkError)
    }
    setSending(false)
  }

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      alert(feedbackCopy.browserNoGeolocation)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        const message = `📍 Mi ubicación: ${locationUrl}`
        
        setNewMsg(message)
        // Opcional: enviar automáticamente
        // await handleSend()
      },
      (error) => {
        alert(feedbackCopy.geolocationErrorPrefix + error.message)
      }
    )
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  const buildDraftForPublishDemand = (): { description?: string } | null => {
    const fromMe = messages
      .filter((m) => m.sender_id === currentUserId)
      .map((m) => m.body.trim())
      .filter(Boolean)
    const joined = fromMe.slice(-8).join('\n').slice(0, 500)
    if (joined) return { description: joined }
    const rd = requestDescription?.trim()
    if (rd) return { description: rd.slice(0, 500) }
    return null
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-auto w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-slate-700" style={{ height: '75vh', maxHeight: '600px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-800/95 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt={otherPersonName} className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40" />
            ) : (
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/35">
                <span className="text-amber-200 font-black text-lg">{otherPersonName?.charAt(0) ?? '💬'}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-white text-sm leading-tight">{otherPersonName ?? 'Chat'}</h3>
              {chatEmailBadge(interlocutorEmail) ? (
                <p className="text-slate-500 text-[10px] truncate max-w-[220px] mt-0.5" title={interlocutorEmail ?? ''}>
                  {chatEmailBadge(interlocutorEmail)}
                </p>
              ) : null}
              <div className="flex items-center gap-1.5 mt-0.5">
                {myRole && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 font-bold">
                    Tú: {myRole === 'cliente' ? 'Solicita' : 'Realiza'}
                  </span>
                )}
                {requestDescription && (
                  <p className="text-slate-500 text-[10px] truncate max-w-[140px]">{requestDescription}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {otherPersonPhone && (
              <a
                href={`tel:${otherPersonPhone}`}
                className="w-8 h-8 bg-teal-500/20 hover:bg-teal-500/30 rounded-full flex items-center justify-center text-teal-300 transition"
                title="Llamar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-300 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {(() => {
          const nextStep = getChatNextStep({
            status: serviceStatus,
            myRole,
            paymentStatus: paymentStatusHint,
            isSelf,
          })
          if (!nextStep) return null
          return (
            <div className="px-3 py-2.5 border-b border-slate-700/80 bg-gradient-to-r from-amber-500/10 to-teal-500/10">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-300/90 mb-1">
                Siguiente paso
              </p>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span aria-hidden>{nextStep.icon}</span>
                {nextStep.title}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{nextStep.detail}</p>
            </div>
          )
        })()}

        {!isSelf && onOpenPublishDemandFromChat && (
          <div className="px-3 py-2 border-b border-slate-700/80 bg-slate-800/50">
            <button
              type="button"
              onClick={() => onOpenPublishDemandFromChat(buildDraftForPublishDemand())}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-100 text-xs font-black transition active:scale-[0.99]"
            >
              <span aria-hidden>✨</span>
              <span>{surfaceCopy.publishNewDemandFromChat}</span>
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-1">{surfaceCopy.publishNewDemandFromChatHint}</p>
          </div>
        )}

        {/* Montos: siempre desde el servidor (simple y alineado con Mercado Pago) */}
        {!isSelf && chatPricing && (
          <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-700/80">
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-400/90 mb-1.5">
              {chatMoneyCopy.boxTitle}
            </p>
            {chatPricing.adjustment_pending && (
              <div
                className={`mb-2 rounded-lg px-2.5 py-2 text-xs leading-snug ${
                  myRole === 'cliente'
                    ? 'bg-amber-500/15 text-amber-100 border border-amber-500/35'
                    : 'bg-slate-700/80 text-slate-200 border border-slate-600'
                }`}
              >
                {myRole === 'cliente'
                  ? chatMoneyCopy.adjustmentPendingClient
                  : chatMoneyCopy.adjustmentPendingWorker}
                {chatPricing.proposed_adjusted_clp != null && chatPricing.proposed_adjusted_clp > 0 && (
                  <span className="block mt-1 font-semibold">
                    {chatMoneyCopy.proposedLabel}: {formatClp(chatPricing.proposed_adjusted_clp)}
                  </span>
                )}
              </div>
            )}
            {chatPricing.agreed_base_clp != null && chatPricing.agreed_base_clp > 0 ? (
              <p className="text-sm text-white font-semibold">
                {chatMoneyCopy.agreedLabel}:{' '}
                <span className="text-teal-300">{formatClp(chatPricing.agreed_base_clp)}</span>
              </p>
            ) : offeredPriceHint != null ? (
              <p className="text-xs text-slate-300">
                {chatMoneyCopy.offeredHint}:{' '}
                <span className="font-semibold text-white">{formatClp(offeredPriceHint)}</span>
                <span className="text-slate-500"> · </span>
                <span className="text-slate-400">{chatMoneyCopy.noAmountYet}</span>
              </p>
            ) : chatPricing.base_used_for_mp_clp > 0 ? (
              <p className="text-xs text-slate-300">
                {chatMoneyCopy.baseForLinkToday}:{' '}
                <span className="font-semibold text-white">{formatClp(chatPricing.base_used_for_mp_clp)}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">{chatMoneyCopy.noAmountYet}</p>
            )}
            {chatPricing.mp_total_clp > 0 && (
              <p className="text-[11px] text-slate-300 mt-1.5">
                {chatMoneyCopy.mpTotalLabel}:{' '}
                <span className="font-bold text-amber-300">{formatClp(chatPricing.mp_total_clp)}</span>
                <span className="text-slate-500"> — {chatMoneyCopy.mpCommissionNote}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">{pricingSourceLabel(chatPricing.source)}</p>
            {paymentStatusHint === 'completed' && (
              <p className="text-[11px] text-emerald-400/95 mt-1 font-medium">{chatMoneyCopy.paymentDone}</p>
            )}
          </div>
        )}

        {!isSelf && myRole && serviceStatus && ['accepted', 'in_progress', 'completed', 'disputed'].includes(serviceStatus) && (
          <div className="px-3 py-2 border-b border-slate-700/80 bg-slate-900/80">
            <button
              type="button"
              onClick={() => setShowReportProblem(true)}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs font-bold hover:bg-red-500/20 transition"
            >
              ⚠️ Tuve un problema con este servicio
            </button>
          </div>
        )}

        {/* Bloqueo auto-chat */}
        {isSelf && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h3 className="text-white font-bold text-lg mb-2">No puedes chatear contigo mismo</h3>
            <p className="text-slate-400 text-sm">Este chat es para comunicarte con la otra persona de la solicitud.</p>
            <button type="button" onClick={onClose} className={`mt-6 ${uiTone.modalCloseFilled}`}>{surfaceCopy.close}</button>
          </div>
        )}

        {/* Messages */}
        {!isSelf && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-amber-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm font-medium">{emptyStateCopy.noMessagesYet}</p>
              <p className="text-slate-600 text-xs mt-1">Comienza la conversación con {otherPersonName ?? 'la otra persona'}</p>
            </div>
          )}
          {otherTyping && (
            <div className="flex items-center gap-2 text-slate-500 text-sm italic px-1">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>{otherPersonName ?? 'La otra persona'} está escribiendo...</span>
            </div>
          )}
          {messages.map(m => {
            const isMine = m.sender_id === currentUserId
            const isSystem = m.type === 'system'
            const paymentPayload = parsePaymentLinkPayload(m.body)

            if (isSystem && !paymentPayload) {
              return (
                <div key={m.id} className="text-center">
                  <span className="inline-block text-xs text-gray-500 bg-gray-100 px-4 py-1.5 rounded-full font-medium">
                    {m.body}
                  </span>
                </div>
              )
            }

            return (
              <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  otherPersonAvatar
                    ? <img src={otherPersonAvatar} alt={m.sender_name} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-600" />
                    : <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">{m.sender_name.charAt(0).toUpperCase()}</div>
                )}
                <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                  {!isMine && (
                    <div className="mb-1 px-1">
                      <p className="text-[10px] font-semibold text-slate-400">{m.sender_name}</p>
                      {chatEmailBadge(m.sender_email) ? (
                        <p className="text-[9px] text-slate-500 truncate max-w-[200px]" title={m.sender_email ?? ''}>
                          {chatEmailBadge(m.sender_email)}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl ${
                    isMine
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-sm shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
                  }`}>
                    {m.type === 'image' ? (
                      <div>
                        {(() => {
                          try {
                            const imageData = JSON.parse(m.body)
                            return (
                              <div>
                                <img src={imageData.image_url} alt={imageData.caption || 'Imagen'} className="max-w-full rounded-lg mb-2" />
                                {imageData.caption && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{imageData.caption}</p>}
                              </div>
                            )
                          } catch {
                            return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                          }
                        })()}
                      </div>
                    ) : m.type === 'location' ? (
                      <div>
                        <p className="text-sm mb-1">📍 Ubicación compartida</p>
                        <a href={m.body} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-200 underline hover:text-teal-100">Ver en mapa</a>
                      </div>
                    ) : m.type === 'payment_link' || m.type === 'system' || m.type === 'text' ? (
                      (() => {
                        const pd = paymentPayload
                        if (!pd) {
                          return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                        }
                        return (
                          <div className="min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">💳</span>
                              <span className="text-sm font-bold">Solicitud de pago</span>
                            </div>
                            <p className="text-xs mb-3 opacity-80">Monto: <span className="font-bold">${Math.round(pd.amount || 0).toLocaleString('es-CL')} CLP</span></p>
                            <a
                              href={pd.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black py-2 px-3 rounded-xl transition shadow-md shadow-amber-500/20"
                            >
                              Pagar ahora →
                            </a>
                          </div>
                        )
                      })()
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-amber-100/80' : 'text-slate-500'}`}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
                {isMine && (
                  <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">Tú</div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        )}

        {/* Input */}
        {!isSelf && (
        <div className="p-3 bg-slate-900 border-t border-slate-700">
          {selectedImage && (
            <div className="mb-2 flex items-center gap-2">
              <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-600" />
              <button onClick={() => setSelectedImage(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            {myRole === 'trabajador' && (
              <button
                onClick={async () => {
                  if (requestingPayment) return
                  const recentLink = [...messages]
                    .reverse()
                    .map((msg) => parsePaymentLinkPayload(msg.body))
                    .find((p) => Boolean(p?.link))
                  if (recentLink?.link) {
                    window.open(recentLink.link, '_blank', 'noopener,noreferrer')
                    return
                  }
                  setRequestingPayment(true)
                  try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                    const r = await apiFetch('/api/v1/payments/mp/create-link', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                      body: JSON.stringify({ service_request_id: requestId }),
                    })
                    const data = await r.json()
                    if (!r.ok) {
                      console.error('[Chat] create-link failed', { status: r.status, data })
                      jhFlowLog('payments.create_link.failed', {
                        requestId,
                        httpStatus: r.status,
                        message: data?.message,
                      })
                      alert(data.message || feedbackCopy.linkGenerateError)
                    } else {
                      console.info('[Chat] create-link ok', { requestId, hasLink: Boolean(data?.link) })
                      jhFlowLog('payments.create_link.ok', {
                        requestId,
                        charged_clp: data?.amount,
                        pricing: data?.pricing,
                        hasLink: Boolean(data?.link),
                      })
                    }
                  } catch (e) {
                    console.error('[Chat] create-link exception', e)
                    alert(feedbackCopy.networkError)
                  }
                  finally { setRequestingPayment(false) }
                }}
                disabled={requestingPayment}
                className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl flex items-center justify-center text-white transition disabled:opacity-50 shrink-0 shadow-md shadow-amber-500/25"
                title="Solicitar pago"
              >
                {requestingPayment
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="text-base">💳</span>
                }
              </button>
            )}
            <ChatImageUpload onImageSelected={setSelectedImage} disabled={sending} />
            <button
              onClick={handleShareLocation}
              disabled={sending}
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-400 transition disabled:opacity-50"
              title="Compartir ubicación"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              value={newMsg}
              onChange={(e) => { setNewMsg(e.target.value); handleTyping() }}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Mensaje a ${otherPersonName ?? 'la otra persona'}...`}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition placeholder:text-slate-500"
              maxLength={1000}
            />
            <VoiceInput onTranscript={(t) => setNewMsg(prev => prev ? prev + ' ' + t : t)} />
            <button
              onClick={handleSend}
              disabled={sending || (!newMsg.trim() && !selectedImage)}
              className={uiTone.ctaChatSend}
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              }
            </button>
          </div>
        </div>
        )}
      </div>

      {showReportProblem && myRole && (
        <ReportProblemModal
          serviceRequestId={requestId}
          myRole={myRole}
          onClose={() => setShowReportProblem(false)}
        />
      )}

      {/* Modal de Reseña */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {reviewDone ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-lg font-black text-gray-900 mb-1">¡Gracias por tu reseña!</h3>
                <p className="text-sm text-gray-500 mb-4">Tu opinión ayuda a otros clientes.</p>
                <button type="button" onClick={() => setShowReviewModal(false)} className={uiTone.modalCloseFilled}>{surfaceCopy.close}</button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-gray-900 mb-1">¿Cómo fue el trabajo?</h3>
                <p className="text-sm text-gray-500 mb-4">Califica a {otherPersonName ?? 'el trabajador'}</p>

                {/* Estrellas */}
                <div className="flex justify-center gap-2 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReviewStars(s)} className="text-3xl transition-transform hover:scale-110">
                      <span className={s <= reviewStars ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                    </button>
                  ))}
                </div>

                {/* Comentario */}
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Cuéntanos cómo fue la experiencia (opcional)..."
                  rows={3}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none resize-none mb-4 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className={uiTone.modalReviewCancel}
                  >
                    Ahora no
                  </button>
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={async () => {
                      setSubmittingReview(true)
                      try {
                        const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                        const r = await apiFetch('/api/v1/reviews', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({
                            service_request_id: serviceRequestDbId ?? requestId,
                            stars: reviewStars,
                            comment: reviewComment.trim() || null,
                          }),
                        })
                        if (r.ok) {
                          setReviewDone(true)
                        } else {
                          const d = await r.json()
                          alert(d.message || feedbackCopy.reviewSendError)
                        }
                      } catch { alert(feedbackCopy.networkError) }
                      finally { setSubmittingReview(false) }
                    }}
                    className={uiTone.ctaReview}
                  >
                    {submittingReview ? surfaceCopy.sending : surfaceCopy.sendReview}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
