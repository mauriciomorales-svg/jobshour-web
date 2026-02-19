'use client'

import { useState, useEffect } from 'react'

interface RequestHistoryScreenProps {
  isOpen: boolean
  onClose: () => void
}

interface ServiceRequest {
  id: number
  description: string
  status: string
  offered_price: number
  final_price: number
  created_at: string
  completed_at: string | null
  worker?: {
    name: string
    avatar: string | null
  }
  category?: {
    name: string
    color: string
  }
}

export default function RequestHistoryScreen({ isOpen, onClose }: RequestHistoryScreenProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('https://jobshour.dondemorales.cl/api/v1/requests/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(req => {
    // Filtro por estado
    if (filter !== 'all' && req.status !== filter) return false

    // Filtro por búsqueda
    if (searchQuery && !req.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const reqDate = new Date(req.created_at)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24))

      if (dateFilter === 'today' && diffDays !== 0) return false
      if (dateFilter === 'week' && diffDays > 7) return false
      if (dateFilter === 'month' && diffDays > 30) return false
    }

    return true
  })

  const formatCLP = (amount: number) => {
    return '$' + amount.toLocaleString('es-CL')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: 'Completado',
      cancelled: 'Cancelado',
      pending: 'Pendiente',
      accepted: 'Aceptado',
      rejected: 'Rechazado',
      in_progress: 'En Progreso',
    }
    return statusMap[status] || status
  }

  const handleReorder = (requestId: number) => {
    // Implementar lógica de reordenar
    alert('Funcionalidad de reordenar próximamente')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl">Historial de Pedidos</h3>
              <p className="text-white/90 text-sm mt-1">{filteredRequests.length} pedido{filteredRequests.length !== 1 ? 's' : ''}</p>
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

        {/* Filters y Search */}
        <div className="p-4 border-b border-gray-200 shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por descripción..."
              className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-transparent focus:border-blue-200"
            />
            <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'completed', label: 'Completados' },
              { key: 'cancelled', label: 'Cancelados' },
              { key: 'pending', label: 'Pendientes' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                  filter === key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todas las fechas' },
              { key: 'today', label: 'Hoy' },
              { key: 'week', label: 'Esta semana' },
              { key: 'month', label: 'Este mes' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateFilter(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  dateFilter === key
                    ? 'bg-indigo-600 text-white'
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
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 font-semibold">No hay pedidos</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'all' ? 'Aún no has realizado ningún pedido' : `No hay pedidos ${filter === 'completed' ? 'completados' : filter === 'cancelled' ? 'cancelados' : 'pendientes'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {request.category && (
                          <span
                            className="text-xs px-2 py-1 rounded-full font-bold text-white"
                            style={{ backgroundColor: request.category.color }}
                          >
                            {request.category.name}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getStatusColor(request.status)}`}>
                          {getStatusText(request.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-semibold mb-2">{request.description}</p>
                      {request.worker && (
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={request.worker.avatar || `https://i.pravatar.cc/60?u=${request.worker.name}`}
                            alt={request.worker.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <p className="text-xs text-gray-600">{request.worker.name}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {new Date(request.created_at).toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {request.completed_at && (
                          <span>
                            Completado: {new Date(request.completed_at).toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {request.final_price ? (
                        <p className="text-lg font-black text-green-600">{formatCLP(request.final_price)}</p>
                      ) : request.offered_price ? (
                        <p className="text-lg font-black text-blue-600">{formatCLP(request.offered_price)}</p>
                      ) : null}
                      {request.status === 'completed' && (
                        <button
                          onClick={() => handleReorder(request.id)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          🔄 Reordenar
                        </button>
                      )}
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
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition shadow-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
