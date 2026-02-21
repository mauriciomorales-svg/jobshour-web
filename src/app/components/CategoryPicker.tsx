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
  categories, selectedId, onSelect, placeholder = 'Selecciona una categoría',
  multiple = false, selectedIds = [], onSelectMultiple,
}: CategoryPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  const selected = categories.find(c => c.id === selectedId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
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

  const open = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={containerRef} className="relative">

      {/* Trigger */}
      <button
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : open()}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition ${
          isOpen
            ? 'border-amber-500 bg-slate-800 ring-2 ring-amber-500/30'
            : selected
            ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
            : 'border-slate-700 bg-slate-800 hover:border-slate-600'
        }`}
      >
        {selected ? (
          <>
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: (selected.color || '#6b7280') + '25' }}
            >
              {getIcon(selected.icon)}
            </span>
            <span className="flex-1 text-sm font-semibold text-white truncate">{selected.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(0); }}
              className="w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition shrink-0"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </span>
            <span className="flex-1 text-sm text-slate-500">{placeholder}</span>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Selected chips for multiple */}
      {multiple && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedIds.map(id => {
            const cat = categories.find(c => c.id === id)
            if (!cat) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: (cat.color || '#6b7280') + '20',
                  borderColor: (cat.color || '#6b7280') + '40',
                  color: cat.color || '#9ca3af',
                }}
              >
                {getIcon(cat.icon)} {cat.name}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelect(id) }}
                  className="ml-0.5 opacity-70 hover:opacity-100"
                >×</button>
              </span>
            )
          })}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[200] mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          {/* Search */}
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-amber-500 transition">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                autoFocus
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Grid de categorías */}
          <div className="overflow-y-auto max-h-56 p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-slate-500 text-sm">Sin resultados para "{search}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filtered.map(cat => {
                  const isSelected = multiple ? selectedIds.includes(cat.id) : cat.id === selectedId
                  const color = cat.color || '#6b7280'
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition active:scale-95 ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-offset-slate-900'
                          : 'hover:bg-slate-800'
                      }`}
                      style={isSelected ? {
                        backgroundColor: color + '20',
                        outline: `2px solid ${color}60`,
                      } : {}}
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 transition"
                        style={{ backgroundColor: color + (isSelected ? '30' : '18') }}
                      >
                        {getIcon(cat.icon)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {cat.name}
                        </p>
                        {isSelected && (
                          <p className="text-[10px] font-bold mt-0.5" style={{ color }}>✓ Seleccionada</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer con conteo */}
          <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-600">
              {filtered.length} categoría{filtered.length !== 1 ? 's' : ''}
              {search ? ` para "${search}"` : ' disponibles'}
            </p>
            {selected && !multiple && (
              <p className="text-[10px] font-bold" style={{ color: selected.color || '#f59e0b' }}>
                {getIcon(selected.icon)} {selected.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
