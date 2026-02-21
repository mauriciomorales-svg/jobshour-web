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

    fetch(`/api/v1/payments/flow/confirm?token=${token}`)
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
          <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-white">Procesando pago</h1>
          <p className="text-slate-400">{message}</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-emerald-400">¡Pago Exitoso!</h1>
          <p className="text-slate-300 mb-6">{message}</p>
          <p className="text-sm text-slate-500 mb-6">Serás redirigido al inicio en unos segundos...</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-lg"
          >
            Volver al inicio
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 text-red-400">Pago no completado</h1>
          <p className="text-slate-300 mb-6">{message}</p>
          <Link
            href="/"
            className="block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition"
          >
            Volver al inicio
          </Link>
        </>
      )}
    </>
  )
}

export default function PagoResultadoPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Suspense fallback={<Loader2 className="h-16 w-16 text-emerald-500 animate-spin mx-auto" />}>
          <PagoResultadoContent />
        </Suspense>
      </div>
    </div>
  )
}
