'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '🧹', hammer: '🔨',
  leaf: '🌿', key: '🔑', building: '🏗️', scissors: '✂️', 'paw-print': '🐾',
  truck: '🚚', 'shopping-cart': '🛒', car: '🚗', baby: '👶',
  'heart-handshake': '🤝', dog: '🐕', 'graduation-cap': '🎓', music: '🎵',
  hand: '💆', activity: '🏃', utensils: '🍽️', 'chef-hat': '👨‍🍳',
  camera: '📷', monitor: '💻', flame: '🔥', droplet: '💧',
  'hard-hat': '👷', trees: '🌳', package: '📦', shield: '🛡️',
  book: '📚', laptop: '💻', heart: '❤️', paw: '🐾', ruler: '📐', tree: '🌳',
}
const getIcon = (icon?: string) => ICON_MAP[icon || ''] || '📋'

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

export default function WorkerMultitaskingModal({ isOpen, onClose, onSuccess }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [multitaskMode, setMultitaskMode] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState<string>('Detectando ubicación...')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [catSearch, setCatSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      detectLocation()
    }
  }, [isOpen])

  useEffect(() => {
    if (multitaskMode && categories.length > 0) {
      setSelectedCategories(categories.map(c => c.id))
    }
  }, [multitaskMode, categories])

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/api/v1/categories')
      const data = await res.json()
      const cats = data.data || []
      setCategories(cats)
      if (multitaskMode) {
        setSelectedCategories(cats.map((c: Category) => c.id))
      }
    } catch {
      setError('Error al cargar categorías')
    }
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocation('Ubicación no disponible')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        reverseGeocode(position.coords.latitude, position.coords.longitude)
      },
      () => {
        setLocation('No se pudo obtener ubicación')
      }
    )
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      const city = data.address?.city || data.address?.town || data.address?.village || 'Ubicación actual'
      setLocation(city)
    } catch {
      setLocation('Ubicación actual')
    }
  }

  const toggleCategory = (id: number) => {
    if (multitaskMode) return
    
    setSelectedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  const handleActivate = async () => {
    if (selectedCategories.length === 0) {
      setError('Selecciona al menos una habilidad')
      return
    }

    if (!coords) {
      setError('Esperando ubicación...')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const res = await apiFetch('/api/v1/worker/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          categories: selectedCategories,
          lat: coords.lat,
          lng: coords.lng,
          status: 'active',
          multitask: multitaskMode
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
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-md rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/20"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-gray-900">
                  ¡Actívate y empieza a trabajar hoy! ⚡
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  ¿Qué quieres ofrecer hoy? (Elije una o varias – puedes cambiarlo cuando quieras)
                </p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Toggle Multitarea */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 mb-6 border border-emerald-200/50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-gray-900">Modo Multitarea:</span>
                    <span className={`text-lg font-black ${multitaskMode ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {multitaskMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {multitaskMode 
                      ? 'Disponible para TODAS mis habilidades guardadas (Recomendado para más solicitudes)'
                      : 'Selecciona manualmente las habilidades que quieres activar'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setMultitaskMode(!multitaskMode)}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                    multitaskMode ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: multitaskMode ? 24 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                  />
                </button>
              </div>
            </div>

            {/* Grid de Habilidades */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Tus habilidades:</h3>
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="🔍 Buscar categoría..."
                className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <motion.button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      disabled={multitaskMode}
                      whileTap={{ scale: multitaskMode ? 1 : 0.95 }}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all
                        ${isSelected 
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                          : 'border-gray-200 bg-white'
                        }
                        ${multitaskMode ? 'cursor-default' : 'cursor-pointer hover:border-emerald-300'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getIcon(cat.icon)}</span>
                        <span className={`text-sm font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {cat.name}
                        </span>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Geolocalización */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-blue-900">Ubicación actual:</p>
                    <p className="text-sm font-bold text-blue-700">{location}</p>
                  </div>
                </div>
                <button
                  onClick={detectLocation}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Actualizar
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200"
              >
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </motion.div>
            )}

            {/* Botón Power-On */}
            <motion.button
              onClick={handleActivate}
              disabled={loading || selectedCategories.length === 0}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full py-4 rounded-xl font-black text-lg text-white
                transition-all shadow-lg
                ${loading || selectedCategories.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 animate-pulse'
                }
              `}
            >
              {loading ? 'Activando...' : '¡ACTIVAR AHORA!'}
            </motion.button>

            {/* Nota discreta */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Puedes agregar o cambiar habilidades en cualquier momento:<br />
              <span className="font-semibold">Menú → Mi Perfil → Mis Habilidades</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
