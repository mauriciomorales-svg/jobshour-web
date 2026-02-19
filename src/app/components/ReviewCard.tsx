'use client'

interface ReviewCardProps {
  review: {
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
  canRespond?: boolean
  onRespond?: (reviewId: number) => void
}

export default function ReviewCard({ review, canRespond = false, onRespond }: ReviewCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={review.reviewer.avatar || `https://i.pravatar.cc/60?u=${review.reviewer.name}`}
          alt={review.reviewer.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-gray-900 text-sm">{review.reviewer.name}</p>
            <p className="text-xs text-gray-400">{review.created_at}</p>
          </div>
          {/* Estrellas */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-4 h-4 ${
                  star <= review.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>

      {/* Comentario */}
      {review.comment && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
        </div>
      )}

      {/* Respuesta del worker */}
      {review.response && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700">Respuesta del trabajador</span>
            {review.responded_at && (
              <span className="text-xs text-blue-500">{review.responded_at}</span>
            )}
          </div>
          <p className="text-sm text-blue-900">{review.response}</p>
        </div>
      )}

      {/* Botón responder */}
      {canRespond && !review.response && onRespond && (
        <button
          onClick={() => onRespond(review.id)}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
        >
          Responder reseña
        </button>
      )}
    </div>
  )
}
