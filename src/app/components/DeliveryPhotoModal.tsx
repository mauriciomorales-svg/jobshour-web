'use client'
import { emptyStateCopy, feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState, useRef } from 'react'
import { apiFetch } from '@/lib/api'

interface DeliveryPhotoModalProps {
  isOpen: boolean
  onClose: () => void
  serviceRequestId: number
  onPhotoUploaded: () => void
}

export default function DeliveryPhotoModal({
  isOpen,
  onClose,
  serviceRequestId,
  onPhotoUploaded,
}: DeliveryPhotoModalProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setError(feedbackCopy.imageMax5mb)
        return
      }
      setPhoto(file)
      setError(null)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCapture = () => {
    cameraInputRef.current?.click()
  }

  const handleUpload = async () => {
    if (!photo) {
      setError('Por favor selecciona o captura una foto')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        setError(feedbackCopy.mustLoginFirst)
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('photo', photo)
      formData.append('type', 'delivery')

      const response = await apiFetch(`/api/v1/requests/${serviceRequestId}/delivery-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.status === 'success') {
        onPhotoUploaded()
        onClose()
        setPhoto(null)
        setPreview(null)
      } else {
        setError(data.message || 'Error al subir la foto')
      }
    } catch (err) {
      setError(feedbackCopy.networkErrorPleaseRetry)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={uiTone.travelModeHeader}>
          <div className="relative z-10">
            <h3 className="text-white font-bold text-lg">Foto de entrega</h3>
            <p className="text-white/90 text-sm mt-1">Toma o selecciona una foto del servicio completado</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl border-2 border-teal-500"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null)
                  setPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                  if (cameraInputRef.current) cameraInputRef.current.value = ''
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-teal-200 rounded-xl p-12 text-center bg-teal-50/30">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 font-semibold mb-2">{emptyStateCopy.noPhotoSelected}</p>
              <p className="text-gray-400 text-sm">Toma una foto o selecciona una desde tu galería</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleCapture}
              className="flex-1 px-4 py-3 bg-amber-100 text-amber-950 rounded-xl font-bold hover:bg-amber-200 transition flex items-center justify-center gap-2"
            >
              <span>📷</span>
              <span>Tomar foto</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <span>🖼️</span>
              <span>Galería</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className={uiTone.modalCancelLight}
          >
            {surfaceCopy.cancel}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !photo}
            className={uiTone.ctaRating}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{surfaceCopy.sending}</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Subir foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
