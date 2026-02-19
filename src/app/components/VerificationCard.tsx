'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api'

interface VerificationCardProps {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    token: string
  }
  onClose: () => void
}

export default function VerificationCard({ user, onClose }: VerificationCardProps) {
  const [worker, setWorker] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkerData()
  }, [user.token])

  const loadWorkerData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/worker/profile`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setWorker(data.worker)
      }
    } catch (error) {
      console.error('Error loading worker:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-yellow-500 z-[300] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-yellow-500 z-[300] flex flex-col items-center justify-center p-6">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Verification Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Header Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full px-6 py-2 flex items-center gap-2 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-black text-white">Trabajador Verificado</span>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full blur-lg opacity-50"></div>
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                className="relative w-32 h-32 rounded-full border-4 border-white object-cover shadow-xl" 
                alt={user.firstName} 
              />
            ) : (
              <div className="relative w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-black text-5xl shadow-xl">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Verified Badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Name */}
        <h1 className="text-3xl font-black text-center text-gray-900 mb-2">
          {user.name}
        </h1>

        {/* Category */}
        {worker?.category && (
          <p className="text-center text-sm font-bold text-gray-600 mb-6">
            {worker.category.name}
          </p>
        )}

        {/* Rating */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 mb-6 border border-orange-200">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                  {worker?.rating || '5.0'}
                </span>
                <span className="text-2xl text-orange-500">★</span>
              </div>
              <p className="text-xs font-bold text-gray-600">Calificación</p>
            </div>
            
            <div className="w-px h-12 bg-gray-300"></div>
            
            <div className="text-center">
              <p className="text-4xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                {worker?.completed_jobs || 0}
              </p>
              <p className="text-xs font-bold text-gray-600">Trabajos</p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-200">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">Identidad Verificada</p>
              <p className="text-xs text-green-700">Perfil validado por Jobshour</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-200">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">Conexión Segura</p>
              <p className="text-xs text-blue-700">Datos protegidos con SSL</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Muestra esta tarjeta al cliente para confirmar tu identidad
          </p>
        </div>
      </div>

      {/* Jobshour Logo */}
      <div className="mt-6">
        <p className="text-white text-sm font-bold">Powered by Jobshour</p>
      </div>
    </div>
  )
}
