'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import ReviewCard from './ReviewCard'
import ReviewResponseModal from './ReviewResponseModal'

interface ReviewsListProps {
  workerId: number
  showAverage?: boolean
  canRespond?: boolean
}

interface Review {
  id: number
  stars: number
  comment: string | null
  reviewer: {
    name: string
    avatar: string | null
  }
  created_at: string
  response?: string | null
  responded_at?: string | null
}

export default function ReviewsList({ workerId, showAverage = true, canRespond = false }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [filter, setFilter] = useState<'all' | 'recent' | 'best' | 'worst'>('all')
  const [responseReviewId, setResponseReviewId] = useState<number | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [workerId])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const response = await apiFetch(`/api/v1/workers/${workerId}/reviews`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()

      if (data.status === 'success' && Array.isArray(data.data)) {
        let filteredReviews = [...data.data]

        // Aplicar filtros
        if (filter === 'recent') {
          // Ya vienen ordenados por fecha descendente
        } else if (filter === 'best') {
          filteredReviews = filteredReviews.sort((a, b) => b.stars - a.stars)
        } else if (filter === 'worst') {
          filteredReviews = filteredReviews.sort((a, b) => a.stars - b.stars)
        }

        setReviews(filteredReviews)
        
        // Calcular promedio
        if (filteredReviews.length > 0) {
          const avg = filteredReviews.reduce((sum, r) => sum + r.stars, 0) / filteredReviews.length
          setAverageRating(avg)
          setTotalReviews(filteredReviews.length)
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [filter])

  const handleResponseSent = () => {
    setResponseReviewId(null)
    fetchReviews() // Recargar reseñas
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Cargando reseñas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con promedio */}
      {showAverage && totalReviews > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Calificación Promedio</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-yellow-600">{averageRating.toFixed(1)}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{totalReviews} reseña{totalReviews !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {reviews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'recent', label: 'Recientes' },
            { key: 'best', label: 'Mejores' },
            { key: 'worst', label: 'Peores' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                filter === key
                  ? 'bg-yellow-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Lista de reseñas */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-gray-500 font-semibold">Aún no hay reseñas</p>
          <p className="text-gray-400 text-sm mt-1">Sé el primero en calificar este trabajador</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              canRespond={canRespond}
              onRespond={setResponseReviewId}
            />
          ))}
        </div>
      )}

      {/* Modal de respuesta */}
      {responseReviewId && (
        <ReviewResponseModal
          isOpen={!!responseReviewId}
          onClose={() => setResponseReviewId(null)}
          reviewId={responseReviewId}
          onSent={handleResponseSent}
        />
      )}
    </div>
  )
}
