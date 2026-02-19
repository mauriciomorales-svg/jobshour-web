'use client'

import { useState } from 'react'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  serviceRequestId: number
  workerName: string
  workerAvatar: string | null
  onRated: () => void
}

export default function RatingModal({
  isOpen,
  onClose,
  serviceRequestId,
  workerName,
  workerAvatar,
  onRated,
}: RatingModalProps) {
  const [stars, setStars] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (stars === 0) {
      setError('Por favor selecciona una calificación')
      return
    }

    if (comment.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError('Debes iniciar sesión para calificar')
        setSubmitting(false)
        return
      }

      const response = await fetch('https://jobshour.dondemorales.cl/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_request_id: serviceRequestId,
          stars: stars,
          comment: comment.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.status === 'success') {
        onRated()
        onClose()
      } else {
        setError(data.message || 'Error al enviar la reseña')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <img
              src={workerAvatar || `https://i.pravatar.cc/60?u=${workerName}`}
              alt={workerName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white"
            />
            <div>
              <h3 className="text-white font-bold text-lg">Califica el Servicio</h3>
              <p className="text-white/90 text-sm">{workerName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Estrellas */}
          <div className="text-center">
            <p className="text-gray-700 font-semibold mb-4">¿Cómo calificarías este servicio?</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-12 h-12 ${
                      star <= (hoveredStar || stars)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {stars === 1 && '😞 Muy malo'}
                {stars === 2 && '😐 Malo'}
                {stars === 3 && '😊 Regular'}
                {stars === 4 && '😄 Bueno'}
                {stars === 5 && '🤩 Excelente'}
              </p>
            )}
          </div>

          {/* Comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentario (mínimo 10 caracteres) *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos sobre tu experiencia con este servicio..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 caracteres
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
            disabled={submitting || stars === 0 || comment.trim().length < 10}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <span>⭐</span>
                <span>Enviar Reseña</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
