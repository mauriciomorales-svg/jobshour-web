'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api'

interface WorkerJobsProps {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    token: string
  }
  onClose: () => void
}

interface JobHistory {
  id: number
  clientName: string
  service: string
  status: 'completed' | 'cancelled' | 'pending' | 'accepted' | 'in_progress'
  amount: number
  date: string
  rating: number
  review: string
}

export default function WorkerJobs({ user, onClose }: WorkerJobsProps) {
  const [jobs, setJobs] = useState<JobHistory[]>([])
  const [metrics, setMetrics] = useState({
    completed_jobs: 0,
    total_earnings: 0,
    average_rating: 0,
    pending_jobs: 0,
    pending_amount: 0,
    pending_validation: 0,
    pending_validation_amount: 0,
    conversion_rate: 0,
    profile_views_week: 0,
    profile_views_employers: 0,
    profile_views_clients: 0,
    can_charge_more: false,
  })
  const [loading, setLoading] = useState(true)

  // Cargar datos del worker al montar
  useEffect(() => {
    loadData()
  }, [user.token])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar métricas
      const metricsResponse = await fetch(`${API_BASE_URL}/worker/metrics`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
      
      // Cargar lista de trabajos
      const jobsResponse = await fetch(`${API_BASE_URL}/worker/jobs`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        // Asegurar que siempre sea un array
        const jobsList = Array.isArray(jobsData.jobs) 
          ? jobsData.jobs 
          : Array.isArray(jobsData.data) 
            ? jobsData.data 
            : Array.isArray(jobsData) 
              ? jobsData 
              : []
        setJobs(jobsList)
      } else {
        // Si hay error, asegurar que jobs sea array vacío
        setJobs([])
      }
    } catch (error) {
      console.error('Error loading worker data:', error)
      // Asegurar que jobs siempre sea un array en caso de error
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      case 'pending': return 'bg-amber-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'cancelled': return 'Cancelado'
      case 'pending': return 'Pendiente'
      default: return 'Desconocido'
    }
  }

  const formatCLP = (amount: number) => {
    return '$' + amount.toLocaleString('es-CL')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[250] flex items-end justify-center">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover" alt={user.firstName} />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-white bg-white/30 flex items-center justify-center text-white font-bold text-lg">
                  {user.firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-black italic text-white">Mis Trabajos</h2>
                <p className="text-xs text-white/90">Historial de servicios</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-center">
              <p className="text-xl font-black text-white">{metrics.completed_jobs}</p>
              <p className="text-[10px] text-white/80">Completados</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-center">
              <p className="text-xl font-black text-white">{formatCLP(metrics.total_earnings)}</p>
              <p className="text-[10px] text-white/80">Ganancias</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-center">
              <p className="text-xl font-black text-white">{metrics.average_rating}</p>
              <p className="text-[10px] text-white/80">★ Rating</p>
            </div>
          </div>

          {/* Capital Atrapado Alert */}
          {metrics.pending_amount > 0 && (
            <div className="mt-3 bg-amber-500/20 backdrop-blur-sm rounded-xl p-3 border border-amber-300/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/90">💰 Capital Atrapado</p>
                  <p className="text-lg font-black text-white">{formatCLP(metrics.pending_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/80">{metrics.pending_jobs} trabajos</p>
                  <p className="text-[10px] text-white/80">en proceso</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Validation */}
          {metrics.pending_validation > 0 && (
            <div className="mt-2 bg-red-500/20 backdrop-blur-sm rounded-xl p-3 border border-red-300/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/90">⏳ Por Liquidar</p>
                  <p className="text-lg font-black text-white">{formatCLP(metrics.pending_validation_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/90 font-bold">{metrics.pending_validation} acción{metrics.pending_validation > 1 ? 'es' : ''}</p>
                  <p className="text-[10px] text-white/80">necesaria{metrics.pending_validation > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Can Charge More Badge */}
          {metrics.can_charge_more && (
            <div className="mt-2 bg-green-500/20 backdrop-blur-sm rounded-xl p-3 border border-green-300/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="text-xs font-bold text-white">Tu reputación te permite</p>
                  <p className="text-sm font-black text-white">Cobrar 15% más que el promedio</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metrics Dashboard */}
        <div className="p-4 space-y-3">
          {/* Conversion Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Tasa de Conversión</span>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{metrics.conversion_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${metrics.conversion_rate}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">De pendiente a liquidado</p>
          </div>

          {/* Profile Views Segmentadas */}
          {metrics.profile_views_week > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  👁️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600">Tu portafolio esta semana</p>
                  <p className="text-lg font-black text-slate-800">{metrics.profile_views_week} visualizaciones</p>
                </div>
              </div>
              {/* Segmentación por tipo */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-orange-200">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">🏢 Empresas</p>
                  <p className="text-lg font-black text-blue-600">{metrics.profile_views_employers}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">👤 Clientes</p>
                  <p className="text-lg font-black text-green-600">{metrics.profile_views_clients}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando trabajos...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No hay trabajos aún</div>
          ) : (
            jobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(job.status)}`}></div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${getStatusColor(job.status)}`}>
                    {getStatusText(job.status)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{job.date}</span>
              </div>

              <h4 className="text-sm font-bold text-gray-800 mb-1">{job.service}</h4>
              <p className="text-xs text-gray-500 mb-2">Cliente: {job.clientName}</p>

              {job.status === 'completed' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-green-600">{formatCLP(job.amount)}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-orange-500">{'★'.repeat(job.rating)}</span>
                  </div>
                </div>
              )}

              {job.review && job.status === 'completed' && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 italic">"{job.review}"</p>
                </div>
              )}
            </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black italic py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Volver al Mapa
          </button>
        </div>
      </div>
    </div>
  )
}
