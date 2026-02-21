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
    <div className="fixed inset-0 z-[400] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white">Tomar solicitud</h3>
            <p className="text-xs text-slate-400 mt-0.5">Confirma el precio y acepta</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 pb-8">
          {/* Cliente info */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-800 rounded-2xl border border-slate-700">
            {request.client?.avatar ? (
              <img src={request.client.avatar} className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700" alt={request.client.name} />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-black text-lg">{(request.client?.name || 'C').charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-white">{request.client?.name || 'Cliente'}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{request.description}</p>
            </div>
          </div>

          {/* Urgente */}
          {request.urgency === 'urgent' && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-lg">⚡</span>
              <p className="text-red-400 text-sm font-bold">Solicitud urgente — responde rápido</p>
            </div>
          )}

          {/* Precio */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Precio final (CLP)</label>
            <div className="flex items-center gap-3">
              <span className="text-teal-400 font-black text-xl">$</span>
              <input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-xl px-3.5 py-2.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Precio sugerido por el cliente: <span className="text-slate-300 font-semibold">${request.offered_price.toLocaleString('es-CL')}</span>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={onClose}
              className="py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition active:scale-95">
              Cancelar
            </button>
            <button onClick={handleAccept} disabled={accepting}
              className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black text-sm transition active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/25">
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Aceptando...
                </span>
              ) : '✓ Aceptar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
