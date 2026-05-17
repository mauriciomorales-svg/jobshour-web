'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { trackFunnelEvent } from '@/lib/analyticsFunnel'
import {
  CLIENT_DISPUTE_REASONS,
  WORKER_DISPUTE_REASONS,
  type DisputeReasonKey,
} from '@/lib/trustPolicy'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'
import { readStoredGpsCoords } from '@/lib/formAssist'

interface Props {
  serviceRequestId: number
  myRole: 'cliente' | 'trabajador'
  onClose: () => void
  onSubmitted?: () => void
}

export default function ReportProblemModal({
  serviceRequestId,
  myRole,
  onClose,
  onSubmitted,
}: Props) {
  const reasons = myRole === 'trabajador' ? WORKER_DISPUTE_REASONS : CLIENT_DISPUTE_REASONS
  const [reason, setReason] = useState<DisputeReasonKey>(reasons[0]?.value ?? 'other')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async () => {
    const desc = description.trim()
    if (desc.length < 10) {
      setError('Describe el problema con al menos 10 caracteres.')
      return
    }
    setSending(true)
    setError('')
    try {
      const gps = myRole === 'trabajador' ? readStoredGpsCoords() : null
      const body: Record<string, unknown> = {
        reason,
        description: desc.slice(0, 1000),
      }
      if (gps) {
        body.worker_lat = gps.lat
        body.worker_lng = gps.lng
      }

      let res: Response
      if (imageFile) {
        const fd = new FormData()
        Object.entries(body).forEach(([k, v]) => fd.append(k, String(v)))
        fd.append('evidence', imageFile)
        res = await apiFetch(`/api/v1/requests/${serviceRequestId}/dispute`, {
          method: 'POST',
          body: fd,
        })
      } else {
        res = await apiFetch(`/api/v1/requests/${serviceRequestId}/dispute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || data.error || feedbackCopy.networkErrorConsole)
        trackFunnelEvent('dispute_submit_error', { request_id: serviceRequestId, role: myRole })
        return
      }

      trackFunnelEvent('dispute_submit', { request_id: serviceRequestId, role: myRole, reason })
      setSuccessMsg(data.message || 'Reporte enviado. Te contactaremos si hace falta.')
      onSubmitted?.()
      setTimeout(onClose, 2200)
    } catch {
      setError(feedbackCopy.networkErrorConsole)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-lg font-black text-white">Tuve un problema</h3>
          <p className="text-xs text-slate-400 mt-1">
            Cuéntanos qué pasó. Revisamos en 24–48 h hábiles.
          </p>
        </div>

        {successMsg ? (
          <div className="px-5 py-10 text-center">
            <p className="text-teal-300 font-bold text-sm">{successMsg}</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Motivo
              </label>
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      reason === r.value
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispute_reason"
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-semibold text-white block">{r.label}</span>
                      {r.hint && <span className="text-[10px] text-slate-500">{r.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Qué pasó
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: acordamos $15.000 y al llegar pidió otro monto sin avisar antes…"
                className="w-full h-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                maxLength={1000}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Foto (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="text-xs text-slate-400 w-full"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pb-4">
              <button type="button" onClick={onClose} className={uiTone.modalReviewCancel}>
                {surfaceCopy.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending}
                className={uiTone.ctaServiceSend}
              >
                {sending ? surfaceCopy.sending : 'Enviar reporte'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
