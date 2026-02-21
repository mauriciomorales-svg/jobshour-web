'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function MobileSuccessContent() {
  const searchParams = useSearchParams()
  const authKey = searchParams.get('key')

  useEffect(() => {
    if (!authKey) return
    // Pasar la key directamente en el deep link - no usar localStorage (contextos distintos)
    setTimeout(() => {
      window.location.href = 'jobshour://auth-success?key=' + encodeURIComponent(authKey)
    }, 800)
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
