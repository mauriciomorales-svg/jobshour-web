'use client'

import { useState, useEffect, useRef } from 'react'
import ChatImageUpload from './ChatImageUpload'

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
}

export default function ChatPanel({ requestId, currentUserId, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const subscribedRequestIdRef = useRef<number | null>(null)
  const boundConnectionRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const mergeUniqueById = (prev: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map<number, ChatMessage>()
    for (const m of prev) map.set(m.id, m)
    for (const m of incoming) map.set(m.id, m)
    return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  // Fetch existing messages
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    fetch(`/api/v1/requests/${requestId}/messages`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => setMessages(prev => mergeUniqueById(prev, data.data ?? [])))
      .catch(() => {})
  }, [requestId])

  // Listen for new messages via WebSocket
  useEffect(() => {
    let echo: any = null

    if (subscribedRequestIdRef.current === requestId) {
      return
    }
    subscribedRequestIdRef.current = requestId

    import('@/lib/echo').then(({ getEcho }) => {
      echo = getEcho()
      if (!echo) {
        console.error('[ChatPanel] Echo instance is null/undefined')
        return
      }

      const pusher = (echo as any)?.connector?.pusher
      if (!pusher) {
        console.error('[ChatPanel] Echo has no pusher connector', echo)
      } else {
        try {
          if (!boundConnectionRef.current) {
            boundConnectionRef.current = true
            pusher.connection.bind('state_change', (states: any) => {
              console.log('[ChatPanel] Pusher state_change', states)
            })
            pusher.connection.bind('connected', () => {
              console.log('[ChatPanel] Pusher connected', { socket_id: pusher.connection.socket_id })
            })
            pusher.connection.bind('error', (err: any) => {
              console.error('[ChatPanel] Pusher connection error', err)
            })
          }
        } catch (e) {
          console.error('[ChatPanel] Failed to bind Pusher connection events', e)
        }
      }

      const channelName = `chat.${requestId}`
      console.log('[ChatPanel] Subscribing private channel', channelName)

      const echoChannel = echo.private(channelName)

      try {
        const pusherChannelName = `private-${channelName}`
        const rawChannel = (pusher as any)?.channel?.(pusherChannelName)
        if (rawChannel) {
          rawChannel.bind('pusher:subscription_succeeded', () => {
            console.log('[ChatPanel] subscription_succeeded', { channel: pusherChannelName })
          })
          rawChannel.bind('pusher:subscription_error', (status: any) => {
            console.error('[ChatPanel] subscription_error', { channel: pusherChannelName, status })
          })
        } else {
          console.log('[ChatPanel] rawChannel not available yet (will still subscribe)', { channel: pusherChannelName })
        }
      } catch (e) {
        console.error('[ChatPanel] Failed to bind subscription events', e)
      }

      echoChannel.listen('.message.new', (e: any) => {
        console.log('[ChatPanel] received .message.new', e)
        const msg: ChatMessage | null = e?.message ?? e ?? null
        if (!msg || typeof msg.id !== 'number') return
        setMessages(prev => mergeUniqueById(prev, [msg]))
      })

      // Escuchar indicador de "escribiendo"
      echoChannel.listen('.typing', (e: any) => {
        if (e.user_id !== currentUserId) {
          setOtherTyping(true)
          setTimeout(() => setOtherTyping(false), 3000)
        }
      })
    })
    return () => {
      subscribedRequestIdRef.current = null
      if (echo) echo.leave(`chat.${requestId}`)
    }
  }, [requestId])

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

    // Enviar evento de "escribiendo" via WebSocket
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

      const r = await fetch(`/api/v1/requests/${requestId}/messages`, {
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

      <div className="relative mt-auto w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '75vh', maxHeight: '600px' }}>
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-black text-white text-lg">Chat</h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">Sin mensajes aún</p>
              <p className="text-gray-300 text-xs mt-1">Comienza la conversación</p>
            </div>
          )}
          {otherTyping && (
            <div className="flex items-center gap-2 text-gray-500 text-sm italic">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>Escribiendo...</span>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {m.sender_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                  {!isMine && (
                    <p className="text-xs font-semibold text-gray-600 mb-1 px-1">{m.sender_name}</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                    isMine 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}>
                    {m.type === 'image' ? (
                      <div>
                        {(() => {
                          try {
                            const imageData = JSON.parse(m.body)
                            return (
                              <div>
                                <img
                                  src={imageData.image_url}
                                  alt={imageData.caption || 'Imagen'}
                                  className="max-w-full rounded-lg mb-2"
                                />
                                {imageData.caption && (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{imageData.caption}</p>
                                )}
                              </div>
                            )
                          } catch {
                            return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                          }
                        })()}
                      </div>
                    ) : m.type === 'location' ? (
                      <div>
                        <p className="text-sm mb-2">📍 Ubicación compartida</p>
                        <a
                          href={m.body}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline"
                        >
                          Ver en mapa
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <p className={`text-[10px] mt-1.5 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
                {isMine && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    Tú
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input mejorado */}
        <div className="p-4 bg-white border-t border-gray-200">
          {selectedImage && (
            <div className="mb-3 flex items-center gap-2">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg border-2 border-blue-500"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ChatImageUpload
              onImageSelected={setSelectedImage}
              disabled={sending}
            />
            <button
              onClick={handleShareLocation}
              disabled={sending}
              className="w-10 h-10 bg-green-100 hover:bg-green-200 rounded-lg flex items-center justify-center text-green-600 transition disabled:opacity-50"
              title="Compartir ubicación"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              value={newMsg}
              onChange={(e) => {
                setNewMsg(e.target.value)
                handleTyping()
              }}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition placeholder:text-gray-400 border border-transparent focus:border-blue-200"
              maxLength={1000}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!newMsg.trim() && !selectedImage)}
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white hover:from-blue-600 hover:to-blue-700 transition shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
