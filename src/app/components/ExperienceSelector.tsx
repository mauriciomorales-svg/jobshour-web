'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Experience {
  id: number
  title: string
  description?: string
  years?: number
}

interface Suggestion {
  id: number
  title: string
  category: string
  icon: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (experience: { title: string; description?: string; years?: number }) => void
  existingExperiences: Experience[]
}

export default function ExperienceSelector({ isOpen, onClose, onAdd, existingExperiences }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customYears, setCustomYears] = useState<number | ''>('')

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchSuggestions()
    } else {
      loadAllSuggestions()
    }
  }, [searchQuery])

  const searchSuggestions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/v1/worker/experiences/suggestions?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.data || [])
      }
    } catch (err) {
      console.error('Error searching suggestions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAllSuggestions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/experiences/suggestions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.data || [])
      }
    } catch (err) {
      console.error('Error loading suggestions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onAdd({ title: suggestion.title })
    setSearchQuery('')
    onClose()
  }

  const handleAddCustom = () => {
    if (!customTitle.trim()) return
    
    onAdd({
      title: customTitle,
      description: customDescription || undefined,
      years: customYears ? Number(customYears) : undefined
    })
    
    setCustomTitle('')
    setCustomDescription('')
    setCustomYears('')
    setCustomMode(false)
    onClose()
  }

  const filteredSuggestions = suggestions.filter(s => 
    !existingExperiences.some(e => e.title.toLowerCase() === s.title.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💼</span>
              <h2 className="text-lg font-black text-white">Agregar Experiencia</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setCustomMode(false)}
              className={`flex-1 py-3 text-sm font-bold transition ${
                !customMode 
                  ? 'text-yellow-600 border-b-2 border-yellow-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Buscar en catálogo
            </button>
            <button
              onClick={() => setCustomMode(true)}
              className={`flex-1 py-3 text-sm font-bold transition ${
                customMode 
                  ? 'text-yellow-600 border-b-2 border-yellow-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Agregar personalizada
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!customMode ? (
              <>
                {/* Search Input */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar experiencia (ej: electricista, carpintero...)"
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:outline-none text-sm"
                      autoFocus
                    />
                    <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Suggestions Grid */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                  </div>
                ) : filteredSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredSuggestions.map((suggestion) => (
                      <motion.button
                        key={suggestion.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-400 rounded-xl transition text-left"
                      >
                        <span className="text-2xl">{suggestion.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{suggestion.title}</p>
                          <p className="text-xs text-gray-500">{suggestion.category}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🔍</span>
                    <p className="text-sm text-gray-500">No se encontraron resultados</p>
                    <button
                      onClick={() => setCustomMode(true)}
                      className="mt-3 text-sm text-yellow-600 font-bold hover:underline"
                    >
                      Agregar experiencia personalizada
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Título de la experiencia *</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej: Electricista residencial"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:outline-none text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción (opcional)</label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Describe brevemente tu experiencia..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:outline-none text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">{customDescription.length}/500 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Años de experiencia (opcional)</label>
                  <input
                    type="number"
                    value={customYears}
                    onChange={(e) => setCustomYears(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Ej: 5"
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleAddCustom}
                  disabled={!customTitle.trim()}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-yellow-500 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar Experiencia
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
