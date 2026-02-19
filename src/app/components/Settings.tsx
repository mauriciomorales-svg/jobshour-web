'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api'

interface SettingsProps {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    token: string
  }
  onClose: () => void
}

export default function Settings({ user, onClose }: SettingsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadVisibility()
  }, [user.token])

  const loadVisibility = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/worker/visibility`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsVisible(data.is_visible)
        setQrCode(data.qr_code || '')
      }
    } catch (error) {
      console.error('Error loading visibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/worker/visibility`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsVisible(data.is_visible)
      }
    } catch (error) {
      console.error('Error toggling visibility:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-xl font-black italic text-white">⚙️ Configuración</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Visibilidad Switch */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Visibilidad</h3>
                <p className="text-sm text-gray-600">Permitir que tus amigos te encuentren</p>
              </div>
              <button
                onClick={toggleVisibility}
                disabled={saving}
                className={`relative w-14 h-8 rounded-full transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}
              >
                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isVisible ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              {isVisible 
                ? '✅ Eres visible. Tus amigos pueden encontrarte en la sincronización de contactos.'
                : '🔒 Eres invisible. Nadie puede encontrarte en la búsqueda ni sincronización.'}
            </p>
            
            {!isVisible && (
              <p className="text-xs text-orange-600 mt-2 font-medium">
                💡 Solo puedes recibir solicitudes directas por QR o nickname manual
              </p>
            )}
          </div>

          {/* Mi QR */}
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tu código de identidad</h3>
            <p className="text-sm text-gray-600 mb-4">Comparte este código para conectar</p>
            
            {loading ? (
              <div className="py-8 text-gray-400">Cargando...</div>
            ) : qrCode ? (
              <div className="bg-white rounded-xl p-4 inline-block">
                <p className="text-2xl font-mono font-bold text-gray-800 tracking-wider">{qrCode}</p>
              </div>
            ) : (
              <p className="text-gray-400">No disponible</p>
            )}
          </div>

          {/* Información de privacidad */}
          <div className="bg-blue-50 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-blue-800 mb-2">🔒 Sobre tu privacidad</h3>
            <ul className="text-xs text-blue-700 space-y-2">
              <li>• Tu nombre real solo se muestra a tus amigos</li>
              <li>• Los clientes solo ven tu nickname y rating</li>
              <li>• Puedes bloquear usuarios en cualquier momento</li>
              <li>• Tu historial de ganancias es privado</li>
            </ul>
          </div>

          {/* Cerrar sesión */}
          <button 
            onClick={() => {
              localStorage.removeItem('jobshour_token')
              localStorage.removeItem('jobshour_user')
              window.location.reload()
            }}
            className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
