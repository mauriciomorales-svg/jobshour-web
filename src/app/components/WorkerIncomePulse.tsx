'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/api'

export type WorkerPulseData = {
  has_worker: boolean
  worker_id: number | null
  tagline: string
  store: {
    is_seller: boolean
    store_name: string | null
    orders_pending: number
    orders_paid_30d: number
    revenue_paid_30d_clp: number
  }
  services: {
    active_jobs: number
    completed_30d: number
  }
  reputation: {
    rating: number | null
    rating_count: number
    total_jobs_completed: number
  }
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('token')
      : null
  const h: HeadersInit = { Accept: 'application/json' }
  if (token) {
    ;(h as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return h
}

export default function WorkerIncomePulse({ currentUserId }: { currentUserId?: number }) {
  const [data, setData] = useState<WorkerPulseData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (currentUserId == null) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/v1/dashboard/worker-pulse', { headers: authHeaders() })
      if (res.status === 401) {
        setData(null)
        return
      }
      if (!res.ok) return
      const json = await res.json()
      if (json?.status === 'success' && json?.data) {
        setData(json.data as WorkerPulseData)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onReload = () => void load()
    window.addEventListener('reload-feed', onReload)
    return () => window.removeEventListener('reload-feed', onReload)
  }, [load])

  if (currentUserId == null) return null
  if (!loading && data && data.has_worker === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-600/60 bg-slate-800/80 p-3 text-center"
      >
        <p className="text-xs text-slate-300 leading-snug">
          Completá tu perfil de <span className="font-bold text-teal-300">socio</span> para ver acá tu tienda, servicios
          e ingresos recientes.
        </p>
      </motion.div>
    )
  }
  if (!loading && !data) return null

  const fmt = (n: number) =>
    n.toLocaleString('es-CL', { maximumFractionDigits: 0, style: 'currency', currency: 'CLP' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-3 shadow-lg shadow-teal-900/20"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-300/90">Tu resumen</p>
          <p className="text-xs text-slate-300 leading-snug mt-0.5">
            {loading ? 'Cargando…' : data?.tagline}
          </p>
        </div>
        {data?.reputation.rating_count != null && data.reputation.rating_count > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-black text-amber-300 leading-none">
              {Number(data.reputation.rating).toFixed(1)}★
            </p>
            <p className="text-[10px] text-slate-500">{data.reputation.rating_count} reseñas</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-900/70 border border-slate-700/80 p-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">🛒 Tienda</p>
          {loading || !data ? (
            <div className="h-10 bg-slate-800/80 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-sm font-black text-white">
                {data.store.is_seller ? (data.store.store_name || 'Tu tienda') : 'Sin tienda activa'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {data.store.orders_pending > 0 && (
                  <span className="text-amber-300 font-semibold">{data.store.orders_pending} pedidos por confirmar</span>
                )}
                {data.store.orders_pending > 0 && (data.store.orders_paid_30d > 0 || data.store.revenue_paid_30d_clp > 0) && (
                  <span className="text-slate-500"> · </span>
                )}
                {(data.store.orders_paid_30d > 0 || data.store.revenue_paid_30d_clp > 0) && (
                  <span>
                    {data.store.orders_paid_30d} ventas · {fmt(data.store.revenue_paid_30d_clp)} (30 días)
                  </span>
                )}
                {data.store.orders_pending === 0 &&
                  data.store.orders_paid_30d === 0 &&
                  data.store.revenue_paid_30d_clp === 0 && <span>Sin ventas en los últimos 30 días</span>}
              </p>
              {!data.store.is_seller && (
                <p className="text-[10px] text-teal-400/90 mt-1 leading-tight">
                  Activá la tienda y sumá ventas sin salir del mapa.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-700/80 p-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">🔧 Servicios</p>
          {loading || !data ? (
            <div className="h-10 bg-slate-800/80 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-sm font-black text-white">
                {data.services.active_jobs > 0 ? `${data.services.active_jobs} en curso` : 'Sin trabajos activos'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {data.services.completed_30d} completados (30 días) · {data.reputation.total_jobs_completed} total
              </p>
              {data.services.active_jobs === 0 && data.services.completed_30d === 0 && (
                <p className="text-[10px] text-teal-400/90 mt-1 leading-tight">
                  Tomá una demanda del feed y empezá a ganar hoy.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {data?.store.is_seller && data.worker_id != null && (
        <>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-store-orders'))}
            className="mt-2 w-full py-2 rounded-xl text-center text-[11px] font-bold bg-slate-800/90 border border-amber-500/40 text-amber-200 hover:bg-slate-700/90 transition"
          >
            Mis pedidos de tienda
          </button>
          <a
            href={`/tienda/${data.worker_id}`}
            className="mt-2 block text-center text-[11px] font-bold text-teal-400 hover:text-teal-300 transition"
          >
            Ver mi tienda pública →
          </a>
        </>
      )}
    </motion.div>
  )
}
