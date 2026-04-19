'use client'
import { feedbackCopy } from '@/lib/userFacingCopy'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import CategoryPicker from './CategoryPicker'

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
      const res = await apiFetch('/api/v1/categories')
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
          const res = await apiFetch('/api/v1/worker/status', {
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
          setError(feedbackCopy.networkError)
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
            <CategoryPicker
              categories={categories}
              selectedId={selectedCategory}
              onSelect={(id) => setSelectedCategory(id)}
              placeholder="Buscar tu oficio..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-sm text-amber-950">
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
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 shadow-md shadow-teal-500/20'
            }`}
          >
            {loading ? 'Activando...' : '¡ACTIVAR AHORA!'}
          </button>
        </div>
      </div>
    </div>
  )
}
