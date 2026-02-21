'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import dynamic from 'next/dynamic'

const LiveTrackingModal = dynamic(() => import('./LiveTrackingModal'), { ssr: false })

interface Props {
  isOpen: boolean
  onClose: () => void
  userToken: string
  workerId: number
}

interface ServiceRequest {
  id: number
  client: {
    id: number
    name: string
    avatar: string | null
  }
  description: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'in_progress'
  urgency: 'normal' | 'urgent'
  offered_price: number | null
  created_at: string
  expires_at: string | null
  delivery_address?: string
  delivery_lat?: number
  delivery_lng?: number
}

export default function WorkerRequestsScreen({ isOpen, onClose, userToken, workerId }: Props) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'all'>('pending')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [trackingRequestId, setTrackingRequestId] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/v1/requests/worker/${workerId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      })
      const data = await res.json()
      setRequests(data.data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
    setLoading(false)
  }

  const handleRespond = async (requestId: number, action: 'accept' | 'reject', reason?: string) => {
    setActionLoading(requestId)
    try {
      await apiFetch(`/api/v1/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ action, reason })
      })
      fetchRequests()
    } catch (err) {
      console.error('Error responding to request:', err)
    }
    setActionLoading(null)
  }

  const filtered = requests.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => r.status === 'accepted').length

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${days}d`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-2xl mx-4 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-6 relative overflow-hidden shrink-0">
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
            <h3 className="text-white text-2xl font-black">Solicitudes Recibidas</h3>
            <p className="text-white/80 text-sm mt-1">
              {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}` : 'Sin solicitudes pendientes'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⏳ Pendientes {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition ${
                filter === 'accepted'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✅ Activas {acceptedCount > 0 && `(${acceptedCount})`}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📋 Todas
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-slate-500 font-semibold">No hay solicitudes</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'pending' ? 'No tienes solicitudes pendientes' : filter === 'accepted' ? 'No tienes trabajos activos' : 'Aún no has recibido solicitudes'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(request => (
                <div
                  key={request.id}
                  className={`bg-white border-2 rounded-2xl p-4 transition ${
                    request.status === 'pending'
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={request.client.avatar || `https://i.pravatar.cc/100?u=${request.client.id}`}
                      alt={request.client.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{request.client.name}</h4>
                      <p className="text-xs text-slate-500">{getTimeAgo(request.created_at)}</p>
                      {request.urgency === 'urgent' && (
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold mt-1">
                          🚨 Urgente
                        </span>
                      )}
                    </div>
                    {request.offered_price && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Oferta</p>
                        <p className="text-lg font-black text-green-600">
                          ${request.offered_price.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="bg-white rounded-xl p-3 mb-3 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {request.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Expiration */}
                  {request.status === 'pending' && request.expires_at && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Expira: {new Date(request.expires_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(request.id, 'accept')}
                        disabled={actionLoading === request.id}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        {actionLoading === request.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          '✅ Aceptar'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('¿Por qué rechazas esta solicitud? (opcional)')
                          if (reason !== null) {
                            handleRespond(request.id, 'reject', reason)
                          }
                        }}
                        disabled={actionLoading === request.id}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition border-2 border-red-200 disabled:opacity-50"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  )}

                  {(request.status === 'accepted' || request.status === 'in_progress') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTrackingRequestId(request.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>📍</span>
                        <span>Ver Tracking</span>
                      </button>
                      <button className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                        💬 Chat
                      </button>
                      <button className="px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition">
                        ✓ Completar
                      </button>
                    </div>
                  )}

                  {(request.status === 'rejected' || request.status === 'cancelled') && (
                    <div className="bg-slate-100 rounded-xl p-3 text-center">
                      <p className="text-sm text-slate-600 font-semibold">
                        {request.status === 'rejected' ? '❌ Rechazada' : '🚫 Cancelada'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {!loading && requests.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
                <p className="text-xs text-slate-600 font-semibold">Pendientes</p>
              </div>
              <div>
                <p className="text-2xl font-black text-green-600">{acceptedCount}</p>
                <p className="text-xs text-slate-600 font-semibold">Activas</p>
              </div>
              <div>
                <p className="text-2xl font-black text-blue-600">{requests.length}</p>
                <p className="text-xs text-slate-600 font-semibold">Total</p>
              </div>
            </div>
          </div>
        )}
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
            workerName="Tú"
            workerAvatar={null}
            clientName={request.client.name}
            clientAvatar={request.client.avatar}
            destinationAddress={request.delivery_address}
            destinationLat={request.delivery_lat}
            destinationLng={request.delivery_lng}
            isWorker={true}
          />
        )
      })()}
    </div>
  )
}
