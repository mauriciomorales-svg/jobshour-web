'use client'

import { useState, useEffect } from 'react'

interface NotificationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface NotificationPreference {
  type: string
  enabled: boolean
  push: boolean
  email: boolean
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPreferences()
    }
  }, [isOpen])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/v1/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.data || [])
      } else {
        // Si no hay preferencias, usar defaults
        setPreferences([
          { type: 'request_accepted', enabled: true, push: true, email: false },
          { type: 'request_rejected', enabled: true, push: true, email: false },
          { type: 'request_completed', enabled: true, push: true, email: false },
          { type: 'new_message', enabled: true, push: true, email: false },
          { type: 'payment_received', enabled: true, push: true, email: true },
          { type: 'payment_failed', enabled: true, push: true, email: true },
          { type: 'review_received', enabled: true, push: true, email: false },
        ])
      }
    } catch (err) {
      console.error('Error fetching preferences:', err)
      // Usar defaults en caso de error
      setPreferences([
        { type: 'request_accepted', enabled: true, push: true, email: false },
        { type: 'request_rejected', enabled: true, push: true, email: false },
        { type: 'request_completed', enabled: true, push: true, email: false },
        { type: 'new_message', enabled: true, push: true, email: false },
        { type: 'payment_received', enabled: true, push: true, email: true },
        { type: 'payment_failed', enabled: true, push: true, email: true },
        { type: 'review_received', enabled: true, push: true, email: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (type: string, field: 'enabled' | 'push' | 'email', value: boolean) => {
    setPreferences(prev =>
      prev.map(p => (p.type === type ? { ...p, [field]: value } : p))
    )
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setSaving(false)
        return
      }

      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        onClose()
      } else {
        alert('Error al guardar preferencias')
      }
    } catch (err) {
      console.error('Error saving preferences:', err)
      alert('Error al guardar preferencias')
    } finally {
      setSaving(false)
    }
  }

  const getNotificationLabel = (type: string) => {
    const labels: Record<string, string> = {
      request_accepted: 'Solicitud Aceptada',
      request_rejected: 'Solicitud Rechazada',
      request_completed: 'Servicio Completado',
      new_message: 'Nuevo Mensaje',
      payment_received: 'Pago Recibido',
      payment_failed: 'Pago Fallido',
      review_received: 'Nueva Reseña',
    }
    return labels[type] || type
  }

  const getNotificationDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      request_accepted: 'Cuando un trabajador acepta tu solicitud',
      request_rejected: 'Cuando un trabajador rechaza tu solicitud',
      request_completed: 'Cuando se completa un servicio',
      new_message: 'Cuando recibes un nuevo mensaje en el chat',
      payment_received: 'Cuando recibes un pago',
      payment_failed: 'Cuando falla un pago',
      review_received: 'Cuando recibes una nueva reseña',
    }
    return descriptions[type] || ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl">Configuración de Notificaciones</h3>
              <p className="text-white/90 text-sm mt-1">Personaliza cómo recibes las notificaciones</p>
            </div>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {preferences.map((pref) => (
                <div
                  key={pref.type}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{getNotificationLabel(pref.type)}</h4>
                      <p className="text-sm text-gray-600">{getNotificationDescription(pref.type)}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.enabled}
                        onChange={(e) => updatePreference(pref.type, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {pref.enabled && (
                    <div className="flex gap-4 pt-3 border-t border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.push}
                          onChange={(e) => updatePreference(pref.type, 'push', e.target.checked)}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Push</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.email}
                          onChange={(e) => updatePreference(pref.type, 'email', e.target.checked)}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Email</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
