'use client'

import { useState, useEffect } from 'react'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
  data?: {
    request_id?: number
    worker_id?: number
    [key: string]: any
  }
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('https://jobshour.dondemorales.cl/api/v1/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      await fetch(`https://jobshour.dondemorales.cl/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      await fetch('https://jobshour.dondemorales.cl/api/v1/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      await fetch(`https://jobshour.dondemorales.cl/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read_at
    return !!n.read_at
  })

  const unreadCount = notifications.filter(n => !n.read_at).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_accepted': return '✅'
      case 'request_rejected': return '❌'
      case 'request_completed': return '🎉'
      case 'new_message': return '💬'
      case 'payment_received': return '💰'
      case 'payment_failed': return '⚠️'
      case 'review_received': return '⭐'
      default: return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'request_accepted': return 'bg-green-100 text-green-700 border-green-200'
      case 'request_rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'request_completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'new_message': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'payment_received': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'payment_failed': return 'bg-red-100 text-red-700 border-red-200'
      case 'review_received': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl">Notificaciones</h3>
              {unreadCount > 0 && (
                <p className="text-white/90 text-sm mt-1">{unreadCount} sin leer</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white text-sm font-bold hover:bg-white/30 transition"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'Sin leer' },
              { key: 'read', label: 'Leídas' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                  filter === key
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-gray-500 font-semibold">No hay notificaciones</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'all' ? 'Aún no tienes notificaciones' : `No hay notificaciones ${filter === 'unread' ? 'sin leer' : 'leídas'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white border-2 rounded-xl p-4 hover:border-purple-300 transition ${
                    !notification.read_at ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-bold text-gray-900 text-sm">{notification.title}</h4>
                        {!notification.read_at && (
                          <span className="w-2 h-2 bg-purple-600 rounded-full shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!notification.read_at && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="w-8 h-8 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center text-purple-600 transition"
                          title="Marcar como leída"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center text-red-600 transition"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition shadow-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
