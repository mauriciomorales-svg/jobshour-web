'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const LiveTrackingModal = dynamic(() => import('./LiveTrackingModal'), { ssr: false })
const RatingModal = dynamic(() => import('./RatingModal'), { ssr: false })

interface Props {
  isOpen: boolean
  onClose: () => void
  userToken: string
}

interface ServiceRequest {
  id: number
  worker: {
    id: number
    name: string
    avatar: string | null
    category: string
  }
  description: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'in_progress'
  urgency: 'normal' | 'urgent'
  offered_price: number | null
  final_price: number | null
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  delivery_address?: string
  delivery_lat?: number
  delivery_lng?: number
}

export default function MyRequestsScreen({ isOpen, onClose, userToken }: Props) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all')
  const [trackingRequestId, setTrackingRequestId] = useState<number | null>(null)
  const [ratingRequestId, setRatingRequestId] = useState<number | null>(null)
  const [completedRequests, setCompletedRequests] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/requests/my-requests', {
        headers: { Authorization: `Bearer ${userToken}` }
      })
      const data = await res.json()
      const newRequests = data.data || []
      
      // Detectar servicios recién completados para mostrar modal de calificación
      newRequests.forEach((req: ServiceRequest) => {
        if (req.status === 'completed' && !completedRequests.has(req.id)) {
          // Servicio recién completado, mostrar modal después de 2 segundos
          setTimeout(() => {
            setRatingRequestId(req.id)
          }, 2000)
          setCompletedRequests(prev => new Set(prev).add(req.id))
        }
      })
      
      setRequests(newRequests)
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
    setLoading(false)
  }

  const cancelRequest = async (id: number) => {
    if (!confirm('¿Cancelar esta solicitud?')) return

    try {
      await fetch(`/api/v1/requests/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` }
      })
      fetchRequests()
    } catch (err) {
      console.error('Error cancelling request:', err)
    }
  }

  const filtered = requests.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'accepted': return 'Aceptada'
      case 'rejected': return 'Rechazada'
      case 'cancelled': return 'Cancelada'
      case 'completed': return 'Completada'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'accepted': return '✅'
      case 'rejected': return '❌'
      case 'cancelled': return '🚫'
      case 'completed': return '🎉'
      default: return '📋'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-2xl mx-4 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 p-6 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition z-10"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10">
            <h3 className="text-white text-2xl font-black">Mis Solicitudes</h3>
            <p className="text-white/80 text-sm mt-1">{requests.length} solicitudes totales</p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todas', count: requests.length },
              { key: 'pending', label: 'Pendientes', count: requests.filter(r => r.status === 'pending').length },
              { key: 'accepted', label: 'Aceptadas', count: requests.filter(r => r.status === 'accepted').length },
              { key: 'completed', label: 'Completadas', count: requests.filter(r => r.status === 'completed').length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-semibold">No hay solicitudes</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'all' ? 'Aún no has enviado ninguna solicitud' : `No hay solicitudes ${filter === 'pending' ? 'pendientes' : filter === 'accepted' ? 'aceptadas' : 'completadas'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(request => (
                <div
                  key={request.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-blue-300 transition"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={request.worker.avatar || `https://i.pravatar.cc/100?u=${request.worker.id}`}
                      alt={request.worker.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{request.worker.name}</h4>
                      <p className="text-xs text-slate-500">{request.worker.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)} {getStatusText(request.status)}
                        </span>
                        {request.urgency === 'urgent' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">
                            🚨 Urgente
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {new Date(request.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {request.description && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                      <p className="text-sm text-slate-700 leading-relaxed">{request.description}</p>
                    </div>
                  )}

                  {/* Price */}
                  {(request.offered_price || request.final_price) && (
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-bold text-slate-700">
                        {request.final_price 
                          ? `Precio final: $${request.final_price.toLocaleString()}`
                          : request.offered_price
                          ? `Oferta: $${request.offered_price.toLocaleString()}`
                          : 'Sin precio definido'}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest(request.id)}
                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition"
                      >
                        Cancelar
                      </button>
                    )}
                    {(request.status === 'accepted' || request.status === 'in_progress') && (
                      <>
                        <button
                          onClick={() => setTrackingRequestId(request.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                        >
                          <span>📍</span>
                          <span>Ver Tracking</span>
                        </button>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition">
                          💬 Chat
                        </button>
                      </>
                    )}
                    {request.status === 'completed' && (
                      <button
                        onClick={() => setRatingRequestId(request.id)}
                        className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 rounded-xl text-sm font-bold hover:from-yellow-500 hover:to-orange-600 transition shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>⭐</span>
                        <span>Calificar</span>
                      </button>
                    )}
                    <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition">
                      Ver Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Tracking */}
      {trackingRequestId && (() => {
        const request = requests.find(r => r.id === trackingRequestId)
        if (!request) return null
        return (
          <LiveTrackingModal
            isOpen={!!trackingRequestId}
            onClose={() => setTrackingRequestId(null)}
            requestId={trackingRequestId}
            workerName={request.worker.name}
            workerAvatar={request.worker.avatar}
            destinationAddress={request.delivery_address}
            destinationLat={request.delivery_lat}
            destinationLng={request.delivery_lng}
            isWorker={false}
          />
        )
      })()}

      {/* Modal de Calificación */}
      {ratingRequestId && (() => {
        const request = requests.find(r => r.id === ratingRequestId)
        if (!request) return null
        return (
          <RatingModal
            isOpen={!!ratingRequestId}
            onClose={() => setRatingRequestId(null)}
            serviceRequestId={ratingRequestId}
            workerName={request.worker.name}
            workerAvatar={request.worker.avatar}
            onRated={() => {
              fetchRequests() // Recargar para actualizar estado
            }}
          />
        )
      })()}
    </div>
  )
}
