'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AuthCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [fallback, setFallback] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const user = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      // Intenta abrir la app nativa primero
      window.location.href = `jobshour://auth?error=${encodeURIComponent(error)}`
      setErrorMsg(decodeURIComponent(error))
      // Si en 1.5s sigue aquí, mostrar fallback web
      setTimeout(() => setFallback(true), 1500)
      return
    }

    if (token && user) {
      // Intenta abrir la app nativa
      window.location.href = `jobshour://auth?token=${token}&user=${user}`

      // Fallback web: guardar el token en localStorage y redirigir a /
      setTimeout(() => {
        try {
          localStorage.setItem('auth_token', token)
          localStorage.setItem('auth_user', user)
        } catch { /* noop */ }
        router.replace(`/?token=${encodeURIComponent(token)}&login=success`)
      }, 1500)
    } else if (!error) {
      // Sin parámetros útiles → home
      setTimeout(() => router.replace('/'), 2000)
      setFallback(true)
    }
  }, [searchParams, router])

  if (errorMsg && fallback) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4 p-6">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold">Error de autenticación</h2>
      <p className="text-gray-400 text-sm text-center">{errorMsg}</p>
      <button onClick={() => router.replace('/')} className="mt-4 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl">
        Volver al inicio
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-3">
      <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-semibold">Autenticando...</p>
      <p className="text-gray-400 text-sm">
        {fallback ? 'Redirigiendo a la app web...' : 'Volviendo a la app'}
      </p>
    </div>
  )
}
