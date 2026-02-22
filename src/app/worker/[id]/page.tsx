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
  user: {
    name: string
    nickname: string | null
    avatar_url: string | null
    avatar: string | null
  }
  categories: {
    id: number
    name: string
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

  const status = STATUS_MAP[worker.availability_status] ?? STATUS_MAP.inactive
  const avatar = worker.user.avatar_url || worker.user.avatar
  const initials = worker.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const rate = Math.round(parseFloat(worker.hourly_rate)).toLocaleString('es-CL')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-teal-950 px-5 pt-12 pb-8">
        <div className="max-w-md mx-auto">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-teal-400 text-sm font-bold mb-6 hover:text-teal-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            JobsHours
          </button>

          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt={worker.user.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-2xl font-black">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black leading-tight">{worker.user.name}</h1>
              {worker.user.nickname && (
                <p className="text-teal-400 text-sm font-semibold">@{worker.user.nickname}</p>
              )}
              <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-md mx-auto px-5 py-6 space-y-5">

        {/* Tarifa */}
        <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Tarifa por hora</p>
            <p className="text-2xl font-black text-teal-400">${rate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Trabajos</p>
            <p className="text-2xl font-black">{worker.total_jobs_completed}</p>
          </div>
        </div>

        {/* Categorías */}
        {worker.categories && worker.categories.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {worker.categories.map(cat => (
                <span
                  key={cat.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                  style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}
                >
                  <span>{getIcon(cat.icon)}</span>
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {worker.bio && (
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Sobre mí</p>
            <p className="text-sm text-slate-300 leading-relaxed">{worker.bio}</p>
          </div>
        )}

        {/* Skills */}
        {worker.skills && worker.skills.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Habilidades</p>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Verificado */}
        {worker.is_verified && (
          <div className="flex items-center gap-2 px-4 py-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
            <span className="text-teal-400 text-lg">✅</span>
            <p className="text-sm text-teal-300 font-semibold">Trabajador verificado en JobsHours</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push(`/?worker=${worker.id}`)}
            className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-2xl text-sm transition active:scale-95"
          >
            Ver en el mapa y solicitar servicio
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-sm transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartir
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl text-sm transition"
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 pb-4">
          jobshours.com · Conecta con tu comunidad
        </p>
      </div>
    </div>
  )
}
