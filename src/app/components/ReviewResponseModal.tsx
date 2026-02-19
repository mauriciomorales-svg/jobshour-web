'use client'

import { useState } from 'react'

interface ReviewResponseModalProps {
  isOpen: boolean
  onClose: () => void
  reviewId: number
  onSent: () => void
}

export default function ReviewResponseModal({
  isOpen,
  onClose,
  reviewId,
  onSent,
}: ReviewResponseModalProps) {
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (response.trim().length < 10) {
      setError('La respuesta debe tener al menos 10 caracteres')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError('Debes iniciar sesión para responder')
        setSubmitting(false)
        return
      }

      const res = await fetch(`/api/v1/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          response: response.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.status === 'success') {
        onSent()
        onClose()
        setResponse('')
      } else {
        setError(data.message || 'Error al enviar la respuesta')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
          <h3 className="text-white font-bold text-lg">Responder Reseña</h3>
          <p className="text-white/90 text-sm mt-1">Tu respuesta será visible públicamente</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu respuesta (mínimo 10 caracteres) *
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Agradece al cliente o aclara cualquier punto..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {response.length}/500 caracteres
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || response.trim().length < 10}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <span>💬</span>
                <span>Publicar Respuesta</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
