'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const user = searchParams.get('user')
    const error = searchParams.get('error')

    if (error) {
      window.location.href = `jobshour://auth?error=${encodeURIComponent(error)}`
      return
    }

    if (token && user) {
      window.location.href = `jobshour://auth?token=${token}&user=${user}`
    }
  }, [searchParams])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <p style={{ fontSize: 18, color: '#333' }}>Autenticando...</p>
        <p style={{ fontSize: 14, color: '#666' }}>Volviendo a la app</p>
      </div>
    </div>
  )
}
