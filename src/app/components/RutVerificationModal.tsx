'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState, useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onVerified?: () => void
}

export default function RutVerificationModal({ isOpen, onClose, onVerified }: Props) {
  const [rut, setRut] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState<{ rut: string | null; rut_verified: boolean } | null>(null)

  useEffect(() => {
    if (isOpen) {
      checkStatus()
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const checkStatus = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    try {
      const res = await fetch('/api/v1/rut/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) setStatus(await res.json())
    } catch {}
  }

  const formatRutInput = (value: string) => {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length <= 1) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
    return formatted
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9kK]/g, '')
    if (raw.length <= 9) {
      setRut(formatRutInput(raw))
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!rut || rut.replace(/[^0-9kK]/gi, '').length < 8) {
      setError('Ingresa un RUT válido (ej: 12.345.678-9)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/rut/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rut }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        onVerified?.()
        setTimeout(() => onClose(), 2000)
      } else {
        setError(data.message || 'Error al verificar RUT')
      }
    } catch {
      setError(feedbackCopy.networkError)
    }

    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`${uiTone.paymentHeaderStrip} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {surfaceCopy.rutVerifyTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={surfaceCopy.close}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-white/90 text-sm mt-1">{surfaceCopy.rutVerifySubtitle}</p>
        </div>

        <div className="p-6">
          {/* Ya verificado */}
          {status?.rut_verified ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">RUT Verificado</h3>
              <p className="text-gray-500 mt-1">{status.rut}</p>
              <p className="text-xs text-teal-700 mt-2">Tu identidad está verificada</p>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-lg font-bold text-teal-800">¡RUT verificado!</h3>
              <p className="text-gray-500 mt-1">Tu cuenta ahora tiene mayor confiabilidad</p>
            </div>
          ) : (
            <>
              <div className={`${uiTone.surfaceInfoAmber} mb-5`}>
                <p className="text-amber-950 text-sm">
                  <strong>¿Por qué verificar?</strong> Los usuarios verificados generan más confianza y reciben más solicitudes.
                </p>
              </div>

              <label className="block text-sm font-bold text-gray-700 mb-2">
                RUT (Rol Único Tributario)
              </label>
              <input
                type="text"
                value={rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-mono text-center tracking-wider ${uiTone.inputFocusBrand}`}
                maxLength={12}
              />

              {error && (
                <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || rut.replace(/[^0-9kK]/gi, '').length < 8}
                className={`w-full mt-4 ${uiTone.ctaFormSaveWide}`}
              >
                {loading ? surfaceCopy.verifying : surfaceCopy.rutVerifyCta}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                {surfaceCopy.rutPrivacyNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
