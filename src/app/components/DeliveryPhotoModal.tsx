'use client'

import { useState, useRef } from 'react'

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
        setError('La imagen debe ser menor a 5MB')
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
        setError('Debes iniciar sesión')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('photo', photo)
      formData.append('type', 'delivery')

      const response = await fetch(`/api/v1/requests/${serviceRequestId}/delivery-photo`, {
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
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
          <h3 className="text-white font-bold text-lg">Foto de Entrega</h3>
          <p className="text-white/90 text-sm mt-1">Toma o selecciona una foto del servicio completado</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-xl border-2 border-green-500"
              />
              <button
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
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 font-semibold mb-2">Sin foto seleccionada</p>
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
              onClick={handleCapture}
              className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition flex items-center justify-center gap-2"
            >
              <span>📷</span>
              <span>Tomar Foto</span>
            </button>
            <button
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
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !photo}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Subir Foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
