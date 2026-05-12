'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wallet, Store, Wrench, RefreshCw, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { surfaceCopy } from '@/lib/userFacingCopy'

const INVENTARIO_API = '/inventario'

export type ServiceMetrics = {
  completed_jobs: number
  total_earnings: number
  average_rating: number
  pending_jobs: number
  pending_amount: number
  pending_validation: number
  pending_validation_amount: number
}

export type StoreStats = {
  ventas_hoy?: number
  ingresos_hoy?: number
  ventas_mes?: number
  ingresos_mes?: number
  total_ventas?: number
  ingresos_total?: number
  total_productos?: number
  ganancia_estimada?: number
}

function formatCLP(n: number) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CL')
}

export default function WorkerEarningsHub({
  workerId,
  onClose,
}: {
  workerId: number
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [services, setServices] = useState<ServiceMetrics | null>(null)
  const [store, setStore] = useState<StoreStats | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const [svcRes, invRes] = await Promise.all([
      apiFetch('/api/worker/metrics', { headers: { ...headers } }),
      fetch(`${INVENTARIO_API}/worker-stats/${workerId}`, { headers }),
    ])

    if (svcRes.ok) {
      const j = await svcRes.json()
      setServices(j as ServiceMetrics)
      setServicesError(null)
    } else {
      setServices(null)
      setServicesError('No se pudieron cargar las métricas de servicios.')
    }

    try {
      const invJson = await invRes.json()
      if (invRes.ok && invJson?.success && invJson?.data) {
        setStore(invJson.data as StoreStats)
        setStoreError(null)
      } else {
        setStore(null)
        setStoreError(invJson?.message || 'Tienda sin datos o inventario no disponible.')
      }
    } catch {
      setStore(null)
      setStoreError('No se pudo conectar con el inventario de la tienda.')
    }
  }, [workerId])

  useEffect(() => {
    trackEvent('worker_earnings_hub_open', { worker_id: workerId })
  }, [workerId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const svcTotal = services?.total_earnings ?? 0
  const storeTotal = store?.ingresos_total ?? 0
  const combined = svcTotal + storeTotal

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white min-w-0">
            <Wallet className="w-6 h-6 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-black truncate">{surfaceCopy.workerEarningsHubTitle}</h2>
              <p className="text-xs text-white/85 truncate">{surfaceCopy.workerEarningsHubSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 disabled:opacity-50"
              aria-label={surfaceCopy.refreshList}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
              aria-label={surfaceCopy.ariaCloseOverlay}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-center text-slate-500 py-8 text-sm font-semibold">Cargando…</p>
          ) : (
            <>
              {servicesError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{servicesError}</p>
              )}

              {/* Total combinado */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total combinado (referencia)</p>
                <p className="text-3xl font-black text-emerald-900 mt-1">{formatCLP(combined)}</p>
                <p className="text-[11px] text-emerald-800/80 mt-2 leading-snug">
                  Suma de servicios completados (JobsHours) + ingresos registrados en tu tienda (inventario). No incluye comisiones de plataforma ni pagos aún no confirmados.
                </p>
              </div>

              {/* Servicios */}
              <section className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  <h3 className="font-black text-slate-900">Servicios JobsHours</h3>
                </div>
                {services ? (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2 rounded-lg bg-white border border-slate-100 p-3">
                      <dt className="text-xs text-slate-500 font-semibold">Ganado (completados)</dt>
                      <dd className="text-xl font-black text-slate-900">{formatCLP(services.total_earnings)}</dd>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-100 p-2">
                      <dt className="text-[10px] text-slate-500">Completados</dt>
                      <dd className="font-bold text-slate-800">{services.completed_jobs}</dd>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-100 p-2">
                      <dt className="text-[10px] text-slate-500">Rating</dt>
                      <dd className="font-bold text-slate-800">{services.average_rating} ★</dd>
                    </div>
                    {services.pending_amount > 0 && (
                      <div className="col-span-2 rounded-lg bg-amber-50 border border-amber-100 p-2">
                        <dt className="text-[10px] text-amber-800 font-bold">En curso / aceptados</dt>
                        <dd className="font-black text-amber-900">{formatCLP(services.pending_amount)}</dd>
                      </div>
                    )}
                    {services.pending_validation_amount > 0 && (
                      <div className="col-span-2 rounded-lg bg-orange-50 border border-orange-100 p-2">
                        <dt className="text-[10px] text-orange-800 font-bold">Por validar / liquidar</dt>
                        <dd className="font-black text-orange-900">{formatCLP(services.pending_validation_amount)}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">Sin datos de servicios.</p>
                )}
              </section>

              {/* Tienda */}
              <section className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-5 h-5 text-violet-600" />
                  <h3 className="font-black text-slate-900">Tienda (inventario)</h3>
                </div>
                {storeError && <p className="text-xs text-amber-700 mb-2">{storeError}</p>}
                {store ? (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2 rounded-lg bg-white border border-slate-100 p-3">
                      <dt className="text-xs text-slate-500 font-semibold">Ingresos totales (tienda)</dt>
                      <dd className="text-xl font-black text-slate-900">{formatCLP(store.ingresos_total ?? 0)}</dd>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-100 p-2">
                      <dt className="text-[10px] text-slate-500">Hoy</dt>
                      <dd className="font-bold text-slate-800">{formatCLP(store.ingresos_hoy ?? 0)}</dd>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-100 p-2">
                      <dt className="text-[10px] text-slate-500">Este mes</dt>
                      <dd className="font-bold text-slate-800">{formatCLP(store.ingresos_mes ?? 0)}</dd>
                    </div>
                    {(store.ganancia_estimada ?? 0) > 0 && (
                      <div className="col-span-2 rounded-lg bg-violet-50 border border-violet-100 p-2">
                        <dt className="text-[10px] text-violet-800 font-bold">Ganancia estimada (catálogo)</dt>
                        <dd className="font-black text-violet-900">{formatCLP(store.ganancia_estimada ?? 0)}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">Activa tu tienda o revisa la conexión con inventario.</p>
                )}
              </section>

              <p className="text-[10px] text-slate-400 text-center px-2">
                El detalle de trabajos sigue en <strong>Mis trabajos</strong> en el mapa. Las ventas por producto están en la pestaña Estadísticas de tu tienda.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
