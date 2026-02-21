'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Suggestion {
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    state?: string
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string, lat: number, lng: number) => void
  placeholder?: string
  className?: string
  useCurrentLocation?: boolean
  searchType?: 'address' | 'amenity'
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = 'Buscar dirección...', className = '', useCurrentLocation = true, searchType = 'address' }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }
    setLoading(true)
    try {
      const extraParams = searchType === 'amenity' ? '&featuretype=settlement&featuretype=amenity' : ''
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=cl&limit=6&addressdetails=1${extraParams}`, {
        headers: { 'Accept-Language': 'es' }
      })
      const data = await res.json()
      setSuggestions(data)
      setOpen(true)
    } catch {}
    setLoading(false)
  }, [searchType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 400)
  }

  const handleSelect = (s: Suggestion) => {
    const label = searchType === 'amenity'
      ? s.display_name.split(',')[0].trim()
      : s.display_name.split(',').slice(0, 3).join(',').trim()
    onChange(label)
    onSelect?.(label, parseFloat(s.lat), parseFloat(s.lon))
    setSuggestions([])
    setOpen(false)
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`, {
          headers: { 'Accept-Language': 'es' }
        })
        const data = await res.json()
        const label = data.display_name?.split(',').slice(0, 3).join(',').trim() || 'Mi ubicación'
        onChange(label)
        onSelect?.(label, pos.coords.latitude, pos.coords.longitude)
      } catch {
        onChange('Mi ubicación actual')
        onSelect?.('Mi ubicación actual', pos.coords.latitude, pos.coords.longitude)
      }
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000 })
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${className}`}
          />
          {loading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {useCurrentLocation && searchType !== 'amenity' && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={locating}
            className="px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition disabled:opacity-50"
            title="Usar mi ubicación"
          >
            {locating ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 border-b border-gray-100 last:border-0 transition"
            >
              <span className="font-medium text-gray-800">{s.display_name.split(',')[0]}</span>
              <span className="text-gray-400 text-xs block truncate">{s.display_name.split(',').slice(1, 3).join(',')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
