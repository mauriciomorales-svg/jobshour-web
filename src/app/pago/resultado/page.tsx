'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { trackFunnelEvent } from '@/lib/analyticsFunnel'
import { pagoResultadoCopy } from '@/lib/userFacingCopy'

type ResultKind = 'loading' | 'success' | 'error' | 'pending'

function inferMercadoPagoOutcome(params: URLSearchParams): ResultKind {
  const col = (params.get('collection_status') || '').toLowerCase()
  if (col === 'approved') return 'success'
  if (
    col === 'rejected' ||
    col === 'cancelled' ||
    col.startsWith('cc_rejected') ||
    col === 'charged_back'
  ) {
    return 'error'
  }
  if (col === 'pending' || col === 'in_process' || col === 'authorized' || col === 'in_mediation') {
    return 'pending'
  }

  const ours = (params.get('status') || '').toLowerCase()
  if (ours === 'success') return 'pending'
  if (ours === 'failure' || ours === 'error') return 'error'
  if (ours === 'pending') return 'pending'

  return 'pending'
}

function PagoResultadoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [kind, setKind] = useState<ResultKind>('loading')
  const [message, setMessage] = useState<string>(pagoResultadoCopy.verifying)
  const [syncRetry, setSyncRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    let redirectTimer: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const clearTimers = () => {
      if (redirectTimer) clearTimeout(redirectTimer)
      redirectTimer = null
      if (pollTimer) clearTimeout(pollTimer)
      pollTimer = null
    }

    const token = searchParams.get('token')
    const srRaw = searchParams.get('service_request_id')
    const srId = srRaw ? parseInt(srRaw, 10) : NaN

    // ── Legacy Flow (solo pagos antiguos con ?token=; checkout actual = Mercado Pago) ──
    if (token) {
      setKind('loading')
      setMessage(pagoResultadoCopy.verifying)
      void apiFetch(`/api/v1/payments/flow/confirm?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          if (data.success) {
            setKind('success')
            setMessage(pagoResultadoCopy.flowSuccess)
            redirectTimer = setTimeout(() => router.push('/'), 3000)
          } else {
            setKind('error')
            setMessage(pagoResultadoCopy.flowFailed)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setKind('error')
            setMessage(pagoResultadoCopy.flowVerifyError)
          }
        })
      return () => {
        cancelled = true
        clearTimers()
      }
    }

    // ── Mercado Pago (back_urls con service_request_id + status + params MP) ─
    if (!Number.isFinite(srId) || srId < 1) {
      setKind('error')
      setMessage(pagoResultadoCopy.mpMissingSr)
      return () => {
        cancelled = true
      }
    }

    const outcome = inferMercadoPagoOutcome(searchParams)
    setKind(outcome)

    const col = (searchParams.get('collection_status') || '').toLowerCase()
    const ours = (searchParams.get('status') || '').toLowerCase()

    if (outcome === 'success') {
      setMessage(pagoResultadoCopy.mpApproved)
    } else if (outcome === 'error') {
      setMessage(pagoResultadoCopy.mpRejected)
    } else if (col) {
      setMessage(pagoResultadoCopy.mpPending)
    } else if (ours === 'success') {
      setMessage(pagoResultadoCopy.mpOptimisticSuccess)
    } else if (ours === 'failure' || ours === 'error') {
      setMessage(pagoResultadoCopy.mpOptimisticFail)
    } else {
      setMessage(pagoResultadoCopy.mpPending)
    }

    const auth =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null

    if (!auth) {
      if (outcome === 'success') {
        redirectTimer = setTimeout(() => {
          if (!cancelled) router.push('/')
        }, 5000)
      }
      return () => {
        cancelled = true
        clearTimers()
      }
    }

    let attempts = 0
    const maxAttempts = 8

    const poll = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const r = await apiFetch(`/api/v1/requests/${srId}`, {
          headers: { Authorization: `Bearer ${auth}` },
        })
        if (!r.ok || cancelled) return
        const body = await r.json()
        const sr = body.data ?? body
        const paid = sr?.payment_status === 'completed'
        if (paid) {
          trackFunnelEvent('payment_success', { request_id: srId })
          setKind('success')
          setMessage(`${pagoResultadoCopy.mpApproved} ${pagoResultadoCopy.srSyncedPaid}`)
          redirectTimer = setTimeout(() => {
            if (!cancelled) router.push('/')
          }, 3000)
          return
        }
        if (outcome === 'success' && attempts < maxAttempts && !cancelled) {
          pollTimer = setTimeout(() => void poll(), 2000)
          return
        }
        if (outcome === 'success' && attempts >= maxAttempts && !paid && !cancelled) {
          setMessage((m) => `${m} ${pagoResultadoCopy.srSyncedPending}`)
        }
      } catch {
        if (outcome === 'success' && attempts < maxAttempts && !cancelled) {
          pollTimer = setTimeout(() => void poll(), 2000)
        }
      }
    }

    void poll()

    if (outcome === 'success') {
      redirectTimer = setTimeout(() => {
        if (!cancelled) router.push('/')
      }, 10000)
    }

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [router, searchParams, syncRetry])

  return (
    <>
      {kind === 'loading' && (
        <>
          <Loader2 className="h-16 w-16 text-teal-500 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-white">{pagoResultadoCopy.titleProcessing}</h1>
          <p className="text-slate-400">{message}</p>
        </>
      )}

      {kind === 'pending' && (
        <>
          <Clock className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-amber-200">{pagoResultadoCopy.titlePending}</h1>
          <p className="text-slate-300 mb-6 text-sm leading-relaxed">{message}</p>
          <p className="text-sm text-slate-500 mb-4">{pagoResultadoCopy.redirectHome}</p>
          <button
            type="button"
            onClick={() => {
              setKind('loading')
              setMessage(pagoResultadoCopy.verifying)
              setSyncRetry((n) => n + 1)
            }}
            className="mb-4 inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition"
          >
            {pagoResultadoCopy.retrySync}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-800 text-white rounded-xl hover:from-amber-500 hover:to-amber-700 transition"
          >
            {pagoResultadoCopy.backHome}
          </Link>
        </>
      )}

      {kind === 'success' && (
        <>
          <CheckCircle className="h-16 w-16 text-teal-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-teal-400">{pagoResultadoCopy.titleSuccess}</h1>
          <p className="text-slate-300 mb-6 text-sm leading-relaxed">{message}</p>
          <p className="text-sm text-slate-500 mb-6">{pagoResultadoCopy.redirectHome}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-xl hover:from-teal-400 hover:to-teal-600 transition shadow-lg shadow-teal-500/20"
          >
            {pagoResultadoCopy.backHome}
          </Link>
        </>
      )}

      {kind === 'error' && (
        <>
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-red-400">{pagoResultadoCopy.titleFailed}</h1>
          <p className="text-slate-300 mb-6 text-sm leading-relaxed">{message}</p>
          <Link
            href="/"
            className="block px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-xl hover:from-slate-500 hover:to-slate-700 transition"
          >
            {pagoResultadoCopy.backHome}
          </Link>
        </>
      )}
    </>
  )
}

export default function PagoResultadoPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Suspense fallback={<Loader2 className="h-16 w-16 text-teal-500 animate-spin mx-auto" />}>
          <PagoResultadoContent />
        </Suspense>
      </div>
    </div>
  )
}
