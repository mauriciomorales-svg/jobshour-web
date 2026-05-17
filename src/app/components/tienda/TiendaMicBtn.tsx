'use client'

import { useCallback, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { feedbackCopy } from '@/lib/userFacingCopy'
import { notifyUser } from '@/lib/notifyUser'

function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      notifyUser(feedbackCopy.browserNoSpeech, 'warning')
      return
    }
    const rec = new SR()
    rec.lang = 'es-CL'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      onResult(e.results[0][0].transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop, toggle: () => (listening ? stop() : start()) }
}

export default function TiendaMicBtn({
  onResult,
  className = '',
}: {
  onResult: (t: string) => void
  className?: string
}) {
  const { listening, toggle } = useSpeech(onResult)
  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Detener' : 'Hablar'}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-orange-100 text-gray-400 hover:text-orange-500'} ${className}`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}
