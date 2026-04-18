'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function MobileSuccessContent() {
  const searchParams = useSearchParams()
  const authKey = searchParams.get('key')

  useEffect(() => {
    if (!authKey) return
    // Guardar key en localStorage para que browserFinished la recupere
    try { localStorage.setItem('pending_auth_key', authKey) } catch(e) {}
    // Intentar deep link para cerrar el Custom Tab automáticamente (app nativa)
    setTimeout(() => {
      window.location.href = 'jobshour://auth-success?key=' + encodeURIComponent(authKey)
    }, 800)
    // Fallback para navegador web: si el deep link no funciona, recuperar token via API
    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/mobile-token?key=' + encodeURIComponent(authKey))
        if (res.ok) {
          const data = await res.json()
          if (data.token) {
            try { localStorage.setItem('auth_token', data.token) } catch(e) {}
            window.location.href = '/?token=' + encodeURIComponent(data.token) + '&login=success'
          }
        }
      } catch(e) {}
    }, 2500)
  }, [authKey])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f0fdf4'
    }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <h1 style={{ color: '#16a34a', marginTop: 16 }}>¡Login exitoso!</h1>
      <p style={{ color: '#6b7280' }}>Volviendo a la app...</p>
    </div>
  )
}

export default function MobileSuccessPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>Cargando...</div>}>
      <MobileSuccessContent />
    </Suspense>
  )
}
