'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function PagoResultadoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verificando pago...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token no válido')
      return
    }

    fetch(`https://jobshour.dondemorales.cl/api/v1/payments/flow/confirm?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage('¡Pago completado exitosamente!')
          
          // Redirigir después de 3 segundos
          setTimeout(() => {
            router.push('/')
          }, 3000)
        } else {
          setStatus('error')
          setMessage('El pago no pudo ser procesado')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Error al verificar el pago')
      })
  }, [token, router])

  return (
    <>
      {status === 'loading' && (
        <>
          <Loader2 className="h-16 w-16 text-green-500 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-gray-900">Procesando pago</h1>
          <p className="text-gray-600">{message}</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-green-600">¡Pago Exitoso!</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <p className="text-sm text-gray-500 mb-6">Serás redirigido al inicio en unos segundos...</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors shadow-lg"
          >
            Volver al inicio
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-red-600">Pago no completado</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="space-y-2">
            <Link 
              href="/" 
              className="block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </>
      )}
    </>
  )
}

export default function PagoResultadoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8 max-w-md w-full text-center">
        <Suspense fallback={<Loader2 className="h-16 w-16 text-green-500 animate-spin mx-auto" />}>
          <PagoResultadoContent />
        </Suspense>
      </div>
    </div>
  )
}
