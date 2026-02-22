'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '🧹', hammer: '🔨',
  leaf: '🌿', key: '🔑', building: '🏗️', scissors: '✂️', 'paw-print': '🐾',
  truck: '🚚', 'shopping-cart': '🛒', car: '🚗', baby: '👶',
  'heart-handshake': '🤝', dog: '🐕', 'graduation-cap': '🎓', music: '🎵',
  hand: '💆', activity: '🏃', utensils: '🍽️', 'chef-hat': '👨‍🍳',
  camera: '📷', monitor: '💻', flame: '🔥', droplet: '💧',
  'hard-hat': '👷', trees: '🌳', package: '📦', shield: '🛡️',
  book: '📚', laptop: '💻', heart: '❤️', paw: '🐾', ruler: '📐', tree: '🌳',
}
const getIcon = (icon?: string) => ICON_MAP[icon || ''] || '📋'

interface CardData {
  id: number
  name: string
  avatar: string | null
  bio_tarjeta: string | null
  city: string
  categories: Array<{
    id: number
    name: string
    icon: string
    color: string
  }>
  experiences: Array<{
    id: number
    title: string
    description: string | null
    years: number | null
  }>
  total_jobs: number
  rating: number
  rating_count: number
  is_verified: boolean
  profile_url: string
}

interface Props {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    token: string
  }
  onClose: () => void
}

export default function VerificationCardNew({ user, onClose }: Props) {
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState<'available' | 'negotiable'>('available')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCardData()
  }, [])

  const loadCardData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/card-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCardData(data.data)
      }
    } catch (err) {
      console.error('Error loading card data:', err)
    } finally {
      setLoading(false)
    }
  }

  const shareWhatsApp = () => {
    if (!cardData) return
    
    const message = `¡Hola! 👋 Soy ${cardData.name}, trabajador en JobsHours.

${cardData.categories.map(c => c.icon + ' ' + c.name).join(' | ')}

📍 ${cardData.city}
${cardData.total_jobs > 0 ? `⭐ ${cardData.rating}/5 · ${cardData.total_jobs} trabajos completados` : '✨ Perfil verificado en JobsHours'}
${availability === 'available' ? '🟢 Disponibilidad inmediata' : '🟡 A convenir'}

${cardData.bio_tarjeta || 'Trabajador profesional y confiable'}

Revisa mi perfil completo:
👉 ${cardData.profile_url}

#JobsHours #TrabajoLocal #${cardData.city.replace(/\s/g, '')}`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const shareFacebook = () => {
    if (!cardData) return
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardData.profile_url)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const copyLink = () => {
    if (!cardData) return
    navigator.clipboard.writeText(cardData.profile_url)
    alert('¡Link copiado! Compártelo en Instagram o donde quieras.')
  }

  const downloadPDF = async () => {
    if (!cardRef.current || !cardData) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2
      const y = 10

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
      pdf.save(`JobsHours-${cardData.name.replace(/\s/g, '_')}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Error al generar PDF. Intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4">Cargando tarjeta...</p>
        </div>
      </div>
    )
  }

  if (!cardData) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <p className="text-center text-gray-600">No se pudo cargar la tarjeta</p>
          <button onClick={onClose} className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const statusColor = availability === 'available' ? 'bg-green-500' : 'bg-yellow-500'
  const statusText = availability === 'available' ? 'Disponible Ya' : 'A Convenir'

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-100 to-slate-200 z-[300] overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition z-10"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full max-w-md">
          {/* Availability Selector */}
          <div className="mb-4 bg-white rounded-2xl p-4 shadow-lg">
            <p className="text-xs font-bold text-gray-600 mb-3 text-center">Selecciona tu disponibilidad antes de compartir:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAvailability('available')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition ${
                  availability === 'available'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🟢 Disponible Ya
              </button>
              <button
                onClick={() => setAvailability('negotiable')}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition ${
                  availability === 'negotiable'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🟡 A Convenir
              </button>
            </div>
          </div>

          {/* Card Preview */}
          <div ref={cardRef} className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-yellow-400/80 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_40px_100px_-15px_rgba(0,0,0,0.25)]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-5 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <span className="text-slate-900 font-black text-2xl tracking-tight italic">JobsHours</span>
              </div>
              <div className={`flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-yellow-600/30 shadow-inner`}>
                <span className={`w-3 h-3 ${statusColor} rounded-full animate-pulse ring-2 ring-green-300`}></span>
                <span className="text-slate-900 text-xs font-black uppercase tracking-wider italic">{statusText}</span>
              </div>
            </div>

            {/* Profile */}
            <div className="pt-10 px-6 pb-8 bg-gradient-to-b from-yellow-50/50 to-white text-center relative">
              <div className="relative inline-block mb-6">
                {user.avatarUrl ? (
                  <img 
                    className="w-40 h-40 rounded-3xl border-8 border-white shadow-2xl object-cover mx-auto transform transition-transform duration-300 hover:scale-105"
                    src={user.avatarUrl} 
                    alt={cardData.name}
                  />
                ) : (
                  <div className="w-40 h-40 rounded-3xl border-8 border-white shadow-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto text-white text-6xl font-black">
                    {cardData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {cardData.is_verified && (
                  <div className="absolute -bottom-4 -right-4 bg-blue-600 p-3 rounded-2xl border-4 border-white shadow-xl">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </div>

              <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none drop-shadow-sm">{cardData.name}</h2>
              <p className="text-yellow-700 font-extrabold text-sm uppercase tracking-[0.3em] mt-2 mb-6">
                {cardData.city}
              </p>

              {/* Bio */}
              {cardData.bio_tarjeta && (
                <p className="text-sm text-gray-700 leading-relaxed mb-6 px-4 italic">
                  "{cardData.bio_tarjeta}"
                </p>
              )}

              {/* Categories/Skills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {cardData.categories.slice(0, 4).map((cat) => (
                  <div key={cat.id} className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-yellow-400 transition-all duration-300 cursor-pointer relative">
                    <span className="text-4xl mb-2 block">{getIcon(cat.icon)}</span>
                    <span className="text-sm font-black text-slate-800 uppercase italic block">{cat.name}</span>
                    <div className="absolute inset-0 rounded-2xl bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              {cardData.total_jobs > 0 ? (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-200">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <span className="text-3xl font-black text-yellow-600">{cardData.rating.toFixed(1)}</span>
                        <span className="text-2xl text-yellow-500">★</span>
                      </div>
                      <p className="text-xs text-gray-600 font-bold mt-1">{cardData.rating_count} reviews</p>
                    </div>
                    <div className="w-px h-12 bg-gray-300"></div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-yellow-600">{cardData.total_jobs}</p>
                      <p className="text-xs text-gray-600 font-bold mt-1">Trabajos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-200">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-black text-blue-900">Perfil Verificado en JobsHours</span>
                  </div>
                </div>
              )}
            </div>

            {/* QR Section */}
            <div className="px-6 pb-10 bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
              <div className="relative z-10 text-center">
                <p className="text-yellow-400 text-xs font-black uppercase tracking-[0.3em] mb-5 italic">
                  Escanea mi Perfil · JobsHours
                </p>
                
                <div className="bg-white/95 p-4 rounded-3xl inline-block shadow-2xl mb-6 ring-4 ring-yellow-400/30">
                  <QRCodeSVG 
                    value={cardData.profile_url}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <a 
                  href={cardData.profile_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black py-5 rounded-2xl shadow-[0_8px_0_0_rgba(202,138,4,0.8)] active:shadow-none active:translate-y-2 transition-all duration-150 flex justify-center items-center gap-3 text-base uppercase italic tracking-widest"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Ver Perfil Completo
                </a>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-lg">
            <p className="text-xs font-bold text-gray-600 mb-3 text-center">Compartir mi tarjeta:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>

              <button
                onClick={shareFacebook}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>

              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar Link
              </button>

              <button
                onClick={downloadPDF}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
