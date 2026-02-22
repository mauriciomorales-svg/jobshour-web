'use client'

import { useState, useEffect, useRef } from 'react'
import ChatImageUpload from './ChatImageUpload'
import { apiFetch } from '@/lib/api'
import dynamic from 'next/dynamic'
const VoiceInput = dynamic(() => import('./VoiceInput'), { ssr: false })

interface ChatMessage {
  id: number
  sender_id: number
  sender_name: string
  sender_avatar: string | null
  body: string
  type: string
  created_at: string
}

interface Props {
  requestId: number
  currentUserId: number
  onClose: () => void
  requestDescription?: string
  otherPersonName?: string
  otherPersonAvatar?: string | null
  otherPersonPhone?: string | null
  myRole?: 'cliente' | 'trabajador'
  isSelf?: boolean
}

export default function ChatPanel({ requestId, currentUserId, onClose, requestDescription, otherPersonName, otherPersonAvatar, otherPersonPhone, myRole, isSelf }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [requestingPayment, setRequestingPayment] = useState(false)
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

  // Fetch existing messages
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    apiFetch(`/api/v1/requests/${requestId}/messages`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => setMessages(prev => mergeUniqueById(prev, data.data ?? [])))
      .catch(() => {})
  }, [requestId])

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
  }, [requestId, currentUserId])

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
          body: data.data.body,
          type: data.data.type,
          created_at: data.data.created_at,
        }
        setMessages(prev => mergeUniqueById(prev, [msg]))
        setNewMsg('')
        setSelectedImage(null)
      } else {
        console.error('Error enviando mensaje:', data)
      }
    } catch (err) {
      console.error('Error de red:', err)
    }
    setSending(false)
  }

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
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
        alert('Error obteniendo ubicación: ' + error.message)
      }
    )
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-auto w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-slate-700" style={{ height: '75vh', maxHeight: '600px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-800/95 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {otherPersonAvatar ? (
              <img src={otherPersonAvatar} alt={otherPersonName} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/40" />
            ) : (
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                <span className="text-blue-300 font-black text-lg">{otherPersonName?.charAt(0) ?? '💬'}</span>
              </div>
            )}
            <div>
              <h3 className="font-black text-white text-sm leading-tight">{otherPersonName ?? 'Chat'}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {myRole && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                    Tú: {myRole === 'cliente' ? 'Cliente' : 'Trabajador'}
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
                className="w-8 h-8 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 transition"
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

        {/* Bloqueo auto-chat */}
        {isSelf && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h3 className="text-white font-bold text-lg mb-2">No puedes chatear contigo mismo</h3>
            <p className="text-slate-400 text-sm">Este chat es para comunicarte con la otra persona de la solicitud.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition">Cerrar</button>
          </div>
        )}

        {/* Messages */}
        {!isSelf && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm font-medium">Sin mensajes aún</p>
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

            if (isSystem) {
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
                    <p className="text-[10px] font-semibold text-slate-400 mb-1 px-1">{m.sender_name}</p>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-sm'
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
                        <a href={m.body} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 underline">Ver en mapa</a>
                      </div>
                    ) : m.type === 'payment_link' ? (
                      (() => {
                        try {
                          const pd = JSON.parse(m.body)
                          return (
                            <div className="min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💳</span>
                                <span className="text-sm font-bold">Solicitud de pago</span>
                              </div>
                              <p className="text-xs mb-3 opacity-80">Monto: <span className="font-bold">${Math.round(pd.amount).toLocaleString('es-CL')} CLP</span></p>
                              <a
                                href={pd.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black py-2 px-3 rounded-xl transition"
                              >
                                Pagar ahora →
                              </a>
                            </div>
                          )
                        } catch {
                          return <p className="text-sm">{m.body}</p>
                        }
                      })()
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200/70' : 'text-slate-500'}`}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
                {isMine && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">Tú</div>
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
                  setRequestingPayment(true)
                  try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                    const r = await apiFetch('/api/v1/payments/mp/create-link', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                      body: JSON.stringify({ service_request_id: requestId }),
                    })
                    const data = await r.json()
                    if (!r.ok) alert(data.message || 'Error al generar link')
                  } catch { alert('Error de conexión') }
                  finally { setRequestingPayment(false) }
                }}
                disabled={requestingPayment}
                className="w-9 h-9 bg-emerald-700 hover:bg-emerald-600 rounded-xl flex items-center justify-center text-white transition disabled:opacity-50 shrink-0"
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
              className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-400 transition disabled:opacity-50"
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
              className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition placeholder:text-slate-500"
              maxLength={1000}
            />
            <VoiceInput onTranscript={(t) => setNewMsg(prev => prev ? prev + ' ' + t : t)} />
            <button
              onClick={handleSend}
              disabled={sending || (!newMsg.trim() && !selectedImage)}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center text-white transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
    </div>
  )
}
