'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  onTranscript: (text: string) => void
  className?: string
}

export default function VoiceInput({ onTranscript, className = '' }: Props) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const toggle = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-CL'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening, onTranscript])

  const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  if (!SpeechRecognition) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition ${
        listening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      } ${className}`}
      title={listening ? 'Detener' : 'Hablar'}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
      </svg>
    </button>
  )
}
