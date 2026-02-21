'use client'

import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const handleOffline = () => { setOffline(true); setWasOffline(true) }
    const handleOnline = () => {
      setOffline(false)
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    if (!navigator.onLine) setOffline(true)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline && !showBack) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[1000] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold transition-all duration-300 ${
      offline
        ? 'bg-red-600 text-white'
        : 'bg-green-500 text-white'
    }`}>
      {offline ? (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M3 3l18 18" />
          </svg>
          Sin conexión — algunas funciones no estarán disponibles
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Conexión restaurada
        </>
      )}
    </div>
  )
}
