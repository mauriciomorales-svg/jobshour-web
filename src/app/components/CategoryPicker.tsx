'use client'

import { useState, useRef, useEffect } from 'react'

interface Category {
  id: number
  name: string
  icon?: string
  color?: string
}

interface CategoryPickerProps {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number) => void
  placeholder?: string
  multiple?: boolean
  selectedIds?: number[]
  onSelectMultiple?: (ids: number[]) => void
}

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '✨', hammer: '🔨',
  leaf: '🌿', key: '🔑', building: '🏗️', scissors: '✂️', 'paw-print': '🐾',
  truck: '🚚', 'shopping-cart': '🛒', car: '🚗', baby: '👶',
  'heart-handshake': '🤝', dog: '🐕', 'graduation-cap': '🎓', music: '🎵',
  hand: '💆', activity: '🏃', utensils: '🍽️', 'chef-hat': '👨‍🍳',
  disc: '🎧', camera: '📷', monitor: '💻', wifi: '📶',
  flame: '🔥', rabbit: '🐇', droplet: '💧', droplets: '💧',
  'key-round': '🔑', 'hard-hat': '👷', trees: '🌳', home: '🏠',
  package: '📦',
}

function getIcon(icon?: string): string {
  if (!icon) return '📋'
  return ICON_MAP[icon] || '📋'
}

export default function CategoryPicker({
  categories, selectedId, onSelect, placeholder = 'Buscar categoría...',
  multiple = false, selectedIds = [], onSelectMultiple,
}: CategoryPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const selected = categories.find(c => c.id === selectedId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(id: number) {
    if (multiple && onSelectMultiple) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
      onSelectMultiple(next)
    } else {
      onSelect(id)
      setIsOpen(false)
      setSearch('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between bg-white hover:border-gray-400 transition"
      >
        {multiple ? (
          <span className="text-sm truncate">
            {selectedIds.length > 0
              ? `${selectedIds.length} categoría${selectedIds.length > 1 ? 's' : ''} seleccionada${selectedIds.length > 1 ? 's' : ''}`
              : <span className="text-gray-400">{placeholder}</span>
            }
          </span>
        ) : (
          <span className="text-sm truncate">
            {selected
              ? <span>{getIcon(selected.icon)} {selected.name}</span>
              : <span className="text-gray-400">{placeholder}</span>
            }
          </span>
        )}
        <svg className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Selected chips for multiple */}
      {multiple && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedIds.map(id => {
            const cat = categories.find(c => c.id === id)
            if (!cat) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: (cat.color || '#6b7280') + '20', color: cat.color || '#6b7280' }}
              >
                {getIcon(cat.icon)} {cat.name}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(id) }}
                  className="ml-0.5 hover:opacity-70"
                >×</button>
              </span>
            )
          })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-xl max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-sm">No se encontraron categorías</div>
            ) : (
              filtered.map(cat => {
                const isSelected = multiple ? selectedIds.includes(cat.id) : cat.id === selectedId
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition ${
                      isSelected ? 'bg-blue-50 font-bold' : ''
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: (cat.color || '#6b7280') + '20' }}
                    >
                      {getIcon(cat.icon)}
                    </span>
                    <span className="truncate">{cat.name}</span>
                    {isSelected && (
                      <span className="ml-auto text-blue-500 font-bold">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
