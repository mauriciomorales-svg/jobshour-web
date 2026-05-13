'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Store, Wrench, RefreshCw, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { surfaceCopy } from '@/lib/userFacingCopy'

const INVENTARIO_API = '/inventario'

/** Evita mostrar SQL, stack traces o respuestas técnicas largas al usuario. */
function userFacingStoreApiMessage(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return surfaceCopy.workerEarningsStoreErrorGeneric
  if (
    s.length > 380 ||
    /SQLSTATE|SQL syntax|SQL:|PostgreSQL|relation\s+["']?|does not exist|Undefined table|PDOException|Illuminate\\Database|Stack trace|Connection:\s*pgsql|at line\s+\d+/i.test(
      s,
    )
  ) {
    return surfaceCopy.workerEarningsStoreErrorGeneric
  }
  return s
}

export type EarningsPeriod = 'all' | '7' | '30' | '90'

export type ServiceMetrics = {
  completed_jobs: number
  total_earnings: number
  earnings_completed_last_7_days?: number
  earnings_completed_last_30_days?: number
  earnings_completed_last_90_days?: number
  metrics_generated_at?: string
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

function formatUpdatedLabel(iso?: string | null) {
  if (!iso) return new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  }
}

function servicesAmountForPeriod(s: ServiceMetrics | null, period: EarningsPeriod): number {
  if (!s) return 0
  if (period === 'all') return s.total_earnings
  if (period === '7') return Number(s.earnings_completed_last_7_days ?? 0)
  if (period === '30') return Number(s.earnings_completed_last_30_days ?? 0)
  return Number(s.earnings_completed_last_90_days ?? 0)
}

const PERIOD_CHIPS: { id: EarningsPeriod; label: string }[] = [
  { id: 'all', label: surfaceCopy.workerEarningsPeriodAll },
  { id: '7', label: surfaceCopy.workerEarningsPeriod7 },
  { id: '30', label: surfaceCopy.workerEarningsPeriod30 },
  { id: '90', label: surfaceCopy.workerEarningsPeriod90 },
]

export default function WorkerEarningsHub({
  workerId,
  onClose,
  onOpenMisTrabajos,
}: {
  workerId: number
  onClose: () => void
  onOpenMisTrabajos?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [storeRetrying, setStoreRetrying] = useState(false)
  const [period, setPeriod] = useState<EarningsPeriod>('all')
  const [services, setServices] = useState<ServiceMetrics | null>(null)
  const [store, setStore] = useState<StoreStats | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null)

  const loadServices = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const svcRes = await apiFetch('/api/worker/metrics', { headers: { ...headers } })

    if (svcRes.ok) {
      const j = (await svcRes.json()) as ServiceMetrics
      setServices(j)
      setServicesError(null)
      setLastUpdatedLabel(formatUpdatedLabel(j.metrics_generated_at))
    } else {
      setServices(null)
      setServicesError('No se pudieron cargar las métricas de servicios.')
    }
  }, [])

  const loadStore = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const invRes = await fetch(`${INVENTARIO_API}/worker-stats/${workerId}`, { headers })
      const invJson = await invRes.json()
      if (invRes.ok && invJson?.success && invJson?.data) {
        setStore(invJson.data as StoreStats)
        setStoreError(null)
      } else {
        setStore(null)
        const raw =
          (typeof invJson?.message === 'string' && invJson.message) ||
          (typeof invJson?.error === 'string' && invJson.error) ||
          null
        setStoreError(userFacingStoreApiMessage(raw))
      }
    } catch {
      setStore(null)
      setStoreError('No se pudo conectar con el inventario de la tienda.')
    }
  }, [workerId])

  const loadAll = useCallback(async () => {
    await Promise.all([loadServices(), loadStore()])
  }, [loadServices, loadStore])

  useEffect(() => {
    trackEvent('worker_earnings_hub_open', { worker_id: workerId })
  }, [workerId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadAll()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadAll])

  const selectPeriod = (id: EarningsPeriod) => {
    if (id === period) return
    setPeriod(id)
    trackEvent('worker_earnings_hub_period', { worker_id: workerId, period: id })
  }

  const onRefresh = async () => {
    trackEvent('worker_earnings_hub_refresh', { worker_id: workerId })
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  const onRetryStore = async () => {
    trackEvent('worker_earnings_hub_retry_store', { worker_id: workerId })
    setStoreRetrying(true)
    await loadStore()
    setStoreRetrying(false)
  }

  const svcTotalAll = services?.total_earnings ?? 0
  const storeTotal = store?.ingresos_total ?? 0
  const combinedAll = svcTotalAll + storeTotal

  const servicesInPeriod = servicesAmountForPeriod(services, period)
  const combinedDisplay = period === 'all' ? combinedAll : servicesInPeriod

  const bothApisFailed = !!(servicesError && storeError)
  const showPartialDataNote = !!(servicesError || storeError) && !bothApisFailed && !!(services || store)

  const openMisTrabajos = () => {
    trackEvent('worker_earnings_hub_nav_jobs', { worker_id: workerId })
    onClose()
    onOpenMisTrabajos?.()
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-earnings-hub-title"
        aria-busy={loading || refreshing}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white min-w-0">
            <Wallet className="w-6 h-6 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 id="worker-earnings-hub-title" className="text-lg font-black truncate">
                {surfaceCopy.workerEarningsHubTitle}
              </h2>
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
          {lastUpdatedLabel && (
            <p className="text-[11px] text-slate-500 text-center">
              {surfaceCopy.workerEarningsLastUpdated}: <span className="font-semibold text-slate-700">{lastUpdatedLabel}</span>
            </p>
          )}

          {!loading && (
            <div
              className="flex flex-wrap gap-1.5 justify-center"
              role="radiogroup"
              aria-label={surfaceCopy.workerEarningsAriaPeriodGroup}
            >
              {PERIOD_CHIPS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={period === id}
                  onClick={() => selectPeriod(id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                    period === id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-center text-slate-500 py-8 text-sm font-semibold">Cargando…</p>
          ) : (
            <>
              {servicesError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{servicesError}</p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={openMisTrabajos}
                  className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 transition"
                  aria-label={surfaceCopy.workerEarningsOpenMisTrabajos}
                >
                  {surfaceCopy.workerEarningsOpenMisTrabajos}
                </button>
                <Link
                  href={`/tienda/${workerId}?tab=stats`}
                  onClick={() => {
                    trackEvent('worker_earnings_hub_nav_tienda_stats', { worker_id: workerId })
                    onClose()
                  }}
                  className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 transition"
                  aria-label={surfaceCopy.workerEarningsOpenTiendaStats}
                >
                  {surfaceCopy.workerEarningsOpenTiendaStats}
                </Link>
              </div>

              <div
                className={`rounded-2xl border-2 p-4 ${
                  bothApisFailed
                    ? 'border-amber-300 bg-amber-50/95'
                    : 'border-emerald-200 bg-emerald-50/80'
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    bothApisFailed ? 'text-amber-900' : 'text-emerald-800'
                  }`}
                >
                  {period === 'all' ? 'Total combinado (referencia)' : 'Servicios en el periodo'}
                </p>
                <p
                  className={`text-3xl font-black mt-1 ${
                    bothApisFailed ? 'text-amber-800/80' : 'text-emerald-900'
                  }`}
                >
                  {bothApisFailed ? '—' : formatCLP(combinedDisplay)}
                </p>
                <p
                  className={`text-[11px] mt-2 leading-snug ${
                    bothApisFailed ? 'text-amber-900/85' : 'text-emerald-800/80'
                  }`}
                >
                  {bothApisFailed
                    ? surfaceCopy.workerEarningsCombinedUnavailable
                    : period === 'all'
                      ? surfaceCopy.workerEarningsCombinedHint
                      : `${surfaceCopy.workerEarningsWindowHint} ${surfaceCopy.workerEarningsStoreNoPeriodHint}`}
                </p>
                {showPartialDataNote && (
                  <p className="text-[10px] text-amber-800 font-semibold mt-2 leading-snug border-t border-amber-200/80 pt-2">
                    {surfaceCopy.workerEarningsCombinedPartialNote}
                  </p>
                )}
              </div>

              <section className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  <h3 className="font-black text-slate-900">Servicios JobsHours</h3>
                </div>
                {services ? (
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div className="col-span-2 rounded-lg bg-white border border-slate-100 p-3">
                      <dt className="text-xs text-slate-500 font-semibold">
                        {period === 'all' ? 'Ganado (completados, histórico)' : `Ganado (completados, ${PERIOD_CHIPS.find((c) => c.id === period)?.label ?? ''})`}
                      </dt>
                      <dd className="text-xl font-black text-slate-900">{formatCLP(servicesInPeriod)}</dd>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">{surfaceCopy.workerEarningsServicesCompletedHint}</p>
                    </div>
                    {period !== 'all' && (
                      <div className="col-span-2 rounded-lg bg-slate-100/80 border border-slate-200 p-2">
                        <dt className="text-[10px] text-slate-600 font-semibold">Histórico completados (referencia)</dt>
                        <dd className="font-black text-slate-800">{formatCLP(services.total_earnings)}</dd>
                      </div>
                    )}
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

              <section className="rounded-xl border border-slate-200 p-4 bg-slate-50/80">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className="w-5 h-5 text-violet-600 shrink-0" />
                    <h3 className="font-black text-slate-900 truncate">Tienda (inventario)</h3>
                  </div>
                  {storeError && (
                    <button
                      type="button"
                      onClick={() => void onRetryStore()}
                      disabled={storeRetrying}
                      aria-label={surfaceCopy.workerEarningsRetryStore}
                      className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-600 text-white disabled:opacity-50"
                    >
                      {storeRetrying ? '…' : surfaceCopy.workerEarningsRetryStore}
                    </button>
                  )}
                </div>
                {storeError && (
                  <p className="text-xs text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2 mb-2 leading-snug">
                    {storeError}
                  </p>
                )}
                {store ? (
                  <>
                    <p className="text-[10px] text-slate-500 mb-2 leading-snug">{surfaceCopy.workerEarningsStoreHint}</p>
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
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Activa tu tienda o revisa la conexión con inventario.</p>
                )}
              </section>

              <p className="text-[10px] text-slate-500 text-center px-2 leading-snug">
                {surfaceCopy.workerEarningsSupportHint}{' '}
                <a
                  href={`mailto:${surfaceCopy.supportContactEmail}`}
                  className="text-emerald-700 underline font-semibold"
                >
                  {surfaceCopy.supportContactEmail}
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
