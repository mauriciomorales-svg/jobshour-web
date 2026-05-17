'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useParams, useRouter } from 'next/navigation'
import WorkerSocialLinks, { type SocialLink } from '@/app/components/WorkerSocialLinks'
import {
  openWhatsAppWithText,
  profileNativeShareText,
  publicWorkerProfileUrl,
  whatsAppWorkerProfileShareText,
  withShareUtm,
} from '@/lib/marketingShare'

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
  availability_status: string
  is_verified: boolean
  rating: string
  rating_count: number
  total_jobs_completed: number
  skills: string[] | null
  created_at: string
  videos: { url: string; thumbnail: string | null; duration: number | null }[]
  social_links?: SocialLink[]
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

function WorkerProfileSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-xl px-4 py-6 space-y-4 animate-pulse">
        <div className="h-4 w-28 rounded bg-slate-800" />
        <div className="rounded-2xl border border-orange-500/20 bg-slate-900/60 p-4 space-y-4">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-5 w-44 rounded bg-slate-800" />
              <div className="h-3 w-28 rounded bg-slate-800/70" />
              <div className="flex gap-3 pt-2">
                <div className="h-4 w-14 rounded bg-slate-800/60" />
                <div className="h-4 w-14 rounded bg-slate-800/60" />
                <div className="h-4 w-14 rounded bg-slate-800/60" />
              </div>
            </div>
          </div>
        </div>
        <div className="h-20 rounded-2xl border border-slate-800 bg-slate-900/50" />
        <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900/40" />
      </div>
    </main>
  )
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

  useEffect(() => {
    if (!worker) return
    trackEvent('worker_public_profile_view', { worker_id: worker.id })
  }, [worker])

  const profileBaseUrl = worker ? publicWorkerProfileUrl(worker.id) : ''
  const shareUrlUtm = worker ? withShareUtm(profileBaseUrl, 'worker_profile_share') : ''
  const shareTextNative = worker
    ? profileNativeShareText(profileBaseUrl, worker.user.name)
    : 'Perfil en JobsHours'

  const handleShare = () => {
    if (!worker) return
    trackEvent('worker_profile_share_click', { worker_id: worker.id, channel: 'native' })
    if (navigator.share) {
      void navigator
        .share({
          title: `${worker.user.name} · JobsHours`,
          text: shareTextNative,
          url: shareUrlUtm,
        })
        .catch(() => {})
    } else {
      trackEvent('worker_profile_share_click', { worker_id: worker.id, channel: 'whatsapp' })
      openWhatsAppWithText(
        whatsAppWorkerProfileShareText({ workerName: worker.user.name, profileUrl: profileBaseUrl }),
      )
    }
  }

  const openProfileWhatsApp = () => {
    if (!worker) return
    trackEvent('worker_profile_share_click', { worker_id: worker.id, channel: 'whatsapp' })
    openWhatsAppWithText(
      whatsAppWorkerProfileShareText({ workerName: worker.user.name, profileUrl: profileBaseUrl }),
    )
  }

  if (loading) return <WorkerProfileSkeleton />

  if (notFound || !worker) return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center px-6 gap-4">
      <p className="text-4xl">🔍</p>
      <p className="text-lg font-bold text-center">Trabajador no encontrado</p>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="w-full max-w-xs bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 min-h-[44px] rounded-xl transition"
      >
        Ir al mapa
      </button>
    </main>
  )

  const avail = String(worker.availability_status ?? '').toLowerCase()
  const isOnlineNow = avail === 'active' || avail === 'available'
  const isBusy = avail === 'busy'
  const isIntermediate = avail === 'intermediate'
  const avatar = worker.user.avatar_url || worker.user.avatar
  const initials = worker.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const rate = Math.round(parseFloat(worker.hourly_rate)).toLocaleString('es-CL')
  const rating = parseFloat(worker.rating || '0')
  const memberSince = new Date(worker.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
  const freshScore = worker.rating_count + worker.total_jobs_completed
  const showcaseVideo = worker.videos?.[0] ?? null

  const sectionTitle = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
  const card = 'rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-28">
      <div className="mx-auto w-full max-w-xl px-4 py-5 space-y-4">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-slate-300 text-sm hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Ir al mapa
        </button>

        <section className="rounded-2xl border border-orange-500/35 bg-gradient-to-br from-orange-500/15 to-slate-900/90 p-4 shadow-lg shadow-orange-950/20 space-y-3">
          <p className="text-[11px] font-bold tracking-wide text-orange-200/90 uppercase">Tarjeta pública · JobsHours</p>
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {avatar ? (
                <img src={avatar} alt={worker.user.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/25" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-lg font-black border border-white/20">
                  {initials}
                </div>
              )}
              {isOnlineNow && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-400 border-2 border-slate-900 rounded-full" aria-hidden />
              )}
              {!isOnlineNow && isBusy && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <h1 className="text-lg font-black text-white leading-tight">{worker.user.name}</h1>
                {worker.is_verified && (
                  <svg className="w-5 h-5 text-teal-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verificado">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {worker.user.nickname && (
                <p className="text-sm text-white/55 mt-0.5">@{worker.user.nickname}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-semibold text-white/70">
                <span>⭐ {rating > 0 ? rating.toFixed(1) : '—'} <span className="text-white/45 font-normal">({worker.rating_count})</span></span>
                <span>💼 {worker.total_jobs_completed}</span>
                <span className="text-orange-200/90">🔥 {freshScore}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-black text-orange-300">${rate}</p>
              <p className="text-[10px] text-white/45 uppercase font-semibold tracking-wide">por hora</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            {isOnlineNow ? (
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400" />
              </span>
            ) : isBusy ? (
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
            ) : (
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isIntermediate ? 'bg-amber-400' : 'bg-slate-500'}`} />
            )}
            <span className={`text-xs font-bold ${isOnlineNow ? 'text-teal-300' : isBusy ? 'text-amber-200' : isIntermediate ? 'text-amber-200' : 'text-slate-400'}`}>
              {isOnlineNow ? 'Disponible ahora' : isBusy ? 'En servicio' : isIntermediate ? 'Disponibilidad flexible' : 'No disponible'}
            </span>
          </div>
        </section>

        {worker.categories?.length > 0 && (
          <section className={card}>
            <h2 className={sectionTitle}>Especialidades</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {worker.categories.map(cat => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/10"
                  style={{ background: `${cat.color}22`, color: cat.color }}
                >
                  {getIcon(cat.icon)} {cat.display_name || cat.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {worker.user.is_pioneer && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-3 flex items-center gap-3">
            <div className="text-2xl">🚀</div>
            <div>
              <p className="text-sm font-bold text-amber-100">Usuario pionero</p>
              <p className="text-xs text-amber-100/75">Entre los primeros expertos en JobsHours.</p>
            </div>
          </div>
        )}

        <section className={card}>
          <h2 className={sectionTitle}>Video</h2>
          <div
            className={`relative w-full h-48 mt-3 bg-slate-950 rounded-xl overflow-hidden border border-slate-700/80 ${showcaseVideo ? 'cursor-pointer group' : ''}`}
            onClick={() => showcaseVideo && window.open(showcaseVideo.url, '_blank')}
            onKeyDown={(e) => {
              if (showcaseVideo && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                window.open(showcaseVideo.url, '_blank')
              }
            }}
            role={showcaseVideo ? 'button' : undefined}
            tabIndex={showcaseVideo ? 0 : undefined}
            aria-label={showcaseVideo ? 'Reproducir video de presentación' : undefined}
          >
            {showcaseVideo?.thumbnail ? (
              <img src={showcaseVideo.thumbnail} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition" />
            ) : (
              <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=80" alt="" className="w-full h-full object-cover opacity-35" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className={`w-14 h-14 bg-white/15 backdrop-blur rounded-full flex items-center justify-center border border-white/20 ${showcaseVideo ? 'group-hover:scale-105 transition' : 'opacity-50'}`}>
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
              </div>
              {!showcaseVideo && <p className="text-white/55 text-xs font-semibold">Sin video aún</p>}
            </div>
            {showcaseVideo?.duration != null && (
              <span className="absolute bottom-2 right-2 bg-black/55 text-white text-xs px-2 py-1 rounded-md">
                {Math.floor(showcaseVideo.duration / 60)}:{String(showcaseVideo.duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </section>

        {worker.bio && (
          <section className={card}>
            <h2 className={sectionTitle}>Sobre mí</h2>
            <p className="text-sm text-slate-200 leading-relaxed mt-3 whitespace-pre-wrap">{worker.bio}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Miembro desde {memberSince}
            </p>
          </section>
        )}

        {worker.skills && worker.skills.length > 0 && (
          <section className={card}>
            <h2 className={sectionTitle}>Habilidades</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {worker.skills.map((skill: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-white/10 text-slate-200 rounded-full text-xs font-medium border border-white/10">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {(worker.social_links?.length ?? 0) > 0 && (
          <section className={card}>
            <h2 className={sectionTitle}>Links y trabajos</h2>
            <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/50 p-2">
              <WorkerSocialLinks initialLinks={worker.social_links ?? []} readonly />
            </div>
          </section>
        )}

        <p className="text-[11px] text-slate-500 text-center leading-snug px-1">
          Misma lógica que la tienda: compartís el enlace y quien entra te ve en el mapa con sesión.
        </p>

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openProfileWhatsApp}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition touch-manipulation"
          >
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-3 text-sm font-bold text-white hover:bg-slate-600 transition touch-manipulation"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Compartir
          </button>
        </section>

        <p className="text-[11px] text-slate-600 text-center leading-snug">
          Ubicación fina y contacto directo en la app con sesión iniciada.
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3 max-w-xl mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push(`/?worker=${worker.id}`)}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-base font-black text-white shadow-lg shadow-orange-900/30 hover:bg-orange-400 transition touch-manipulation"
        >
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Abrir en JobsHours
          <span className="text-xs font-semibold text-white/90 hidden sm:inline">· mapa y solicitar</span>
        </button>
      </div>
    </main>
  )
}
