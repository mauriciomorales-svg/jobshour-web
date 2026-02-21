'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  request: {
    id: number
    description: string
    offered_price: number
    client?: { name: string; avatar?: string }
    urgency?: 'normal' | 'urgent'
  }
  onClose: () => void
  onAccepted: () => void
}

export default function TakeRequestModal({ request, onClose, onAccepted }: Props) {
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [finalPrice, setFinalPrice] = useState(request.offered_price.toString())

  const handleAccept = async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) {
      setError('Debes iniciar sesión para aceptar solicitudes')
      return
    }

    setAccepting(true)
    setError('')
    
    try {
      const r = await apiFetch(`/api/v1/requests/${request.id}/respond`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'accept',
          final_price: parseFloat(finalPrice)
        }),
      })
      
      const data = await r.json()
      
      if (r.ok) {
        onAccepted()
        onClose()
      } else {
        setError(data.error || data.message || 'Error al aceptar solicitud')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">💰 Tomar Solicitud</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            {request.client?.avatar && (
              <img src={request.client.avatar} className="w-12 h-12 rounded-full" alt={request.client.name} />
            )}
            <div>
              <p className="font-semibold text-slate-800">{request.client?.name || 'Cliente'}</p>
              <p className="text-sm text-slate-500">{request.description}</p>
            </div>
          </div>

          {request.urgency === 'urgent' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
              <p className="text-xs text-red-600 font-semibold">⚡ Solicitud Urgente</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Precio Final</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">$</span>
              <input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                placeholder="Precio final"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Precio sugerido: ${request.offered_price.toLocaleString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition disabled:opacity-50"
          >
            {accepting ? 'Aceptando...' : '✓ Aceptar Solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}
