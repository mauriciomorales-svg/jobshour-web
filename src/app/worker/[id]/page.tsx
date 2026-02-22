'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '✨', hammer: '🔨',
  leaf: '🌿', key: '🔑', building: '🏗️', scissors: '✂️', 'paw-print': '🐾',
  truck: '🚚', car: '🚗', baby: '👶', dog: '🐕', music: '🎵',
  utensils: '🍽️', 'chef-hat': '👨‍🍳', camera: '📷', monitor: '💻',
  flame: '🔥', droplet: '💧', home: '🏠', package: '📦', broom: '🧹',
  tree: '🌳', ruler: '📐', heart: '❤️', paw: '🐾', book: '📚',
  laptop: '💻', shield: '🛡️', star: '⭐', briefcase: '💼', tool: '🛠️',
  'graduation-cap': '🎓', 'hard-hat': '👷', motorcycle: '🏍️',
  'shopping-cart': '🛒', 'shopping-bag': '🛍️', stethoscope: '🩺',
}

function getIcon(icon?: string) {
  if (!icon) return '📌'
  return ICON_MAP[icon] || '📌'
}

interface WorkerData {
  id: number
  user_id: number
  bio: string | null
  hourly_rate: string
  availability_status: 'active' | 'intermediate' | 'inactive'
  is_verified: boolean
  rating: string
  rating_count: number
  total_jobs_completed: number
  skills: string[] | null
  created_at: string
  videos: { url: string; thumbnail: string | null; duration: number | null }[]
  user: {
    name: string
    nickname: string | null
    avatar_url: string | null
    avatar: string | null
    is_pioneer?: boolean
  }
  categories: {
    id: number
    name: string
    display_name: string
    icon: string
    color: string
    slug: string
  }[]
}

const STATUS_MAP = {
  active: { label: 'Disponible ahora', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  intermediate: { label: 'Disponibilidad flexible', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  inactive: { label: 'No disponible', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}

export default function WorkerPublicProfile() {
  const params = useParams()
  const router = useRouter()
  const [worker, setWorker] = useState<WorkerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const id = params?.id
    if (!id) return
    fetch(`${API_BASE}/api/workers/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) setWorker(data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params?.id])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jobshours.com/worker/${params?.id}`
  const shareText = worker
    ? `¿Necesitas ayuda? Mira a ${worker.user.name} en JobsHours 👇`
    : '¡Mira este trabajador en JobsHours!'

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'JobsHours', text: shareText, url: shareUrl })
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound || !worker) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
      <p className="text-4xl">🔍</p>
      <p className="text-lg font-bold">Trabajador no encontrado</p>
      <button onClick={() => router.push('/')} className="px-6 py-2 bg-teal-500 rounded-xl text-sm font-bold">
        Ir al mapa
      </button>
    </div>
  )

  const isActive = worker.availability_status === 'active'
  const isIntermediate = worker.availability_status === 'intermediate'
  const avatar = worker.user.avatar_url || worker.user.avatar
  const initials = worker.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const rate = Math.round(parseFloat(worker.hourly_rate)).toLocaleString('es-CL')
  const rating = parseFloat(worker.rating || '0')
  const memberSince = new Date(worker.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
  const freshScore = worker.rating_count + worker.total_jobs_completed
  const showcaseVideo = worker.videos?.[0] ?? null

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden font-sans pb-24 text-gray-800">

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 h-36 relative rounded-b-[2rem]">
        <button onClick={() => router.push('/')} className="absolute top-6 left-4 text-white p-2 rounded-full bg-white/20 backdrop-blur-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            {avatar
              ? <img src={avatar} alt={worker.user.name} className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg bg-white" />
              : <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-3xl font-black text-white">{initials}</div>
            }
            {isActive && <span className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
          </div>
        </div>
      </div>

      {/* Nombre + stats */}
      <div className="pt-16 px-6 text-center">
        <div className="flex items-center justify-center gap-1">
          <h1 className="text-2xl font-bold text-gray-900">{worker.user.name}</h1>
          {worker.is_verified && (
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {worker.user.nickname && <p className="text-gray-500 font-medium text-sm">@{worker.user.nickname}</p>}
        <div className="flex justify-center gap-6 mt-4 pb-4 border-b border-gray-200">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">⭐ {rating > 0 ? rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500">{worker.rating_count} reseñas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">💼 {worker.total_jobs_completed}</p>
            <p className="text-xs text-gray-500">Trabajos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">🔥 {freshScore}</p>
            <p className="text-xs text-gray-500">Fresh Score</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">

        {/* Estado + tarifa */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            {isActive ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            ) : (
              <span className={`w-3 h-3 rounded-full ${isIntermediate ? 'bg-yellow-400' : 'bg-gray-300'}`} />
            )}
            <span className={`text-sm font-bold ${isActive ? 'text-emerald-700' : isIntermediate ? 'text-yellow-700' : 'text-gray-500'}`}>
              {isActive ? 'Disponible ahora' : isIntermediate ? 'Disponibilidad flexible' : 'No disponible'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-gray-900">${rate}</p>
            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Por hora</p>
          </div>
        </div>

        {/* Especialidades */}
        {worker.categories?.length > 0 && (
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Especialidades</h3>
            <div className="flex flex-wrap gap-2">
              {worker.categories.map(cat => (
                <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border"
                  style={{ background: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}40` }}>
                  {getIcon(cat.icon)} {cat.display_name || cat.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pionero */}
        {worker.user.is_pioneer && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 p-3 rounded-xl flex items-center gap-3">
            <div className="text-2xl">🚀</div>
            <div>
              <p className="text-sm font-bold text-purple-900">Usuario Pionero</p>
              <p className="text-xs text-purple-700">De los primeros expertos en JobsHours.</p>
            </div>
          </div>
        )}

        {/* Video */}
        {showcaseVideo && (
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Video de Presentación</h3>
            <div className="relative w-full h-48 bg-gray-900 rounded-2xl overflow-hidden group cursor-pointer shadow-sm"
              onClick={() => window.open(showcaseVideo.url, '_blank')}>
              {showcaseVideo.thumbnail
                ? <img src={showcaseVideo.thumbnail} alt="Video" className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition" />
                : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 group-hover:scale-110 transition">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
                </div>
              </div>
              {showcaseVideo.duration && (
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                  {Math.floor(showcaseVideo.duration / 60)}:{String(showcaseVideo.duration % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {worker.bio && (
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Sobre mí</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{worker.bio}</p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Miembro desde {memberSince}
            </p>
          </div>
        )}

        {/* Habilidades */}
        {worker.skills && worker.skills.length > 0 && (
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">Habilidades</h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Compartir */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2.5 rounded-xl font-semibold text-sm border border-green-200 hover:bg-green-100 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            WhatsApp
          </button>
          <button onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 rounded-xl font-semibold text-sm hover:bg-gray-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
        </div>
      </div>

      {/* CTA fijo abajo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] max-w-md mx-auto z-50">
        <button onClick={() => router.push(`/?worker=${worker.id}`)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-3.5 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Ver en el mapa y solicitar
        </button>
      </div>
    </div>
  )
}
