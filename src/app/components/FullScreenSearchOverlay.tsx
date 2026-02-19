'use client'

import { useState, useRef } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => void
  cityName?: string
}

export default function FullScreenSearchOverlay({ isOpen, onClose, onSearch, cityName }: Props) {
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const handleSearch = (value: string) => {
    setQuery(value)
    onSearch(value)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-CL'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      handleSearch(transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-3 left-3 right-3 z-[200] animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-3">
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center shrink-0 hover:bg-slate-100 rounded-xl transition"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 flex items-center bg-slate-100 rounded-xl px-3 h-11">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={`Filtrar por nombre, categoría...`}
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 ml-2"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
            />
            {query && (
              <button 
                onClick={handleClear} 
                className="text-slate-400 hover:text-slate-600 mr-1 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={listening ? stopListening : startListening}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
                listening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        {!query && (
          <div className="px-4 pb-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-semibold mb-2 mt-2">Filtros rápidos</p>
            <div className="flex flex-wrap gap-2">
              {['Gasfíter', 'Electricista', 'Pintor', 'Limpieza', 'Jardinero', 'Cerrajero'].map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        {query && (
          <div className="px-4 pb-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mt-2">
              🔍 Filtrando pines en el mapa por: <span className="font-bold text-blue-600">&quot;{query}&quot;</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
