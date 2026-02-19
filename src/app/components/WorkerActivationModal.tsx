'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function WorkerActivationModal({ isOpen, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/categories')
      const data = await res.json()
      setCategories(data.data || [])
      if (data.data && data.data.length > 0) {
        setSelectedCategory(data.data[0].id)
      }
    } catch {
      setError('Error al cargar categorías')
    }
  }

  const handleActivate = async () => {
    if (!selectedCategory) {
      setError('Selecciona una categoría')
      return
    }

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }

    setLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
          const res = await fetch('/api/v1/worker/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              category_id: selectedCategory,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              status: 'active'
            })
          })

          const data = await res.json()

          if (res.ok) {
            onSuccess()
            onClose()
          } else {
            setError(data.message || 'Error al activar modo Worker')
          }
        } catch {
          setError('Error de conexión')
        }
        setLoading(false)
      },
      () => {
        setError('Necesitamos tu ubicación para activar el modo Worker')
        setLoading(false)
      }
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Empieza a trabajar ahora</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">¿Qué ofreces hoy?</label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              📍 Usando ubicación actual
            </p>
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {loading ? 'Activando...' : '¡ACTIVAR AHORA!'}
          </button>
        </div>
      </div>
    </div>
  )
}
