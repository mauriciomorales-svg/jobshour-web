'use client'

import { useState, useEffect } from 'react'

interface PaymentHistoryScreenProps {
  isOpen: boolean
  onClose: () => void
}

interface Payment {
  id: number
  service_request_id: number
  amount: number
  payment_method: string
  status: string
  completed_at: string | null
  created_at: string
  service_request?: {
    id: number
    description: string
    worker?: {
      name: string
      avatar: string | null
    }
  }
}

export default function PaymentHistoryScreen({ isOpen, onClose }: PaymentHistoryScreenProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')

  useEffect(() => {
    if (isOpen) {
      fetchPayments()
    }
  }, [isOpen])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      // Nota: Este endpoint necesita ser creado en el backend
      const response = await fetch('https://jobshour.dondemorales.cl/api/v1/payments/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true
    return p.status === filter
  })

  const totalPaid = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalReceived = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0) // Ajustar según si es worker o cliente

  const formatCLP = (amount: number) => {
    return '$' + amount.toLocaleString('es-CL')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'failed': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'pending': return 'Pendiente'
      case 'failed': return 'Fallido'
      default: return status
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'flow': return '💳'
      case 'mercadopago': return '💵'
      case 'stripe': return '💳'
      default: return '💰'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl">Historial de Pagos</h3>
              <p className="text-white/90 text-sm mt-1">Todos tus pagos y transacciones</p>
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

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Total Pagado</p>
              <p className="text-2xl font-black text-green-600">{formatCLP(totalPaid)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Pagos Completados</p>
              <p className="text-2xl font-black text-gray-900">
                {filteredPayments.filter(p => p.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 shrink-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'completed', label: 'Completados' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'failed', label: 'Fallidos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                  filter === key
                    ? 'bg-green-600 text-white shadow-lg'
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
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 font-semibold">No hay pagos</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'all' ? 'Aún no has realizado ningún pago' : `No hay pagos ${filter === 'completed' ? 'completados' : filter === 'pending' ? 'pendientes' : 'fallidos'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                        {getPaymentMethodIcon(payment.payment_method)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {payment.service_request?.description || 'Servicio'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-green-600">
                        {formatCLP(payment.amount)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                  </div>

                  {payment.service_request?.worker && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <img
                        src={payment.service_request.worker.avatar || `https://i.pravatar.cc/60?u=${payment.service_request.worker.name}`}
                        alt={payment.service_request.worker.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <p className="text-xs text-gray-600">{payment.service_request.worker.name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
