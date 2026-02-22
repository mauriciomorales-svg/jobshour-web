'use client'

import ReviewsList from './ReviewsList'

const ICON_MAP: Record<string, string> = {
  wrench: '🔧', zap: '⚡', paintbrush: '🎨', sparkles: '✨', hammer: '🔨',
  leaf: '🌿', key: '🔑', building: '🏗️', scissors: '✂️', 'paw-print': '🐾',
  truck: '🚚', car: '🚗', baby: '👶', dog: '🐕', music: '🎵',
  utensils: '🍽️', 'chef-hat': '👨‍🍳', camera: '📷', monitor: '💻',
  flame: '🔥', droplet: '💧', home: '🏠', package: '📦', broom: '🧹',
  tree: '🌳', ruler: '📐', heart: '❤️', paw: '🐾', book: '📚',
  laptop: '💻', shield: '🛡️', star: '⭐', briefcase: '💼', tool: '🛠️',
  motorcycle: '🏍️', 'graduation-cap': '🎓', 'hard-hat': '👷',
}

function getIcon(icon?: string) {
  return ICON_MAP[icon || ''] || '📌'
}

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

interface Category { id?: number; name: string; display_name?: string; slug?: string; icon: string; color: string }

interface Props {
  detail: {
    id: number
    user_id?: number | null
    name: string
    nickname?: string | null
    avatar?: string | null
    is_verified?: boolean
    status: string
    hourly_rate: number
    fresh_score?: number
    rating_count?: number
    total_jobs?: number
    bio?: string
    microcopy?: string
    skills?: string[]
    categories?: Category[]
    category?: Category | null
    showcase_video?: string | { url: string; thumbnail: string | null; duration: number | null } | null
  }
  onClose: () => void
}

export default function WorkerDetailModal({ detail, onClose }: Props) {
  const isActive = detail.status === 'active'
  const isIntermediate = detail.status === 'intermediate'
  const cats = detail.categories?.length ? detail.categories : detail.category ? [detail.category] : []
  const freshScore = (detail.fresh_score ?? 0) + (detail.rating_count ?? 0)
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/worker/${detail.id}` : ''
  const shareText = `¿Necesitas ayuda? Mira a ${detail.name} en JobsHours 👇`

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: 'JobsHours', text: shareText, url: shareUrl })
    else window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-gray-50 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto pb-6 text-gray-800">

        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-800 h-28 relative rounded-t-3xl sm:rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 left-4 text-white p-2 rounded-full bg-white/20 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="relative">
              {detail.avatar
                ? <img src={detail.avatar} alt={detail.name} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg bg-white" />
                : <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl font-black text-white">
                    {detail.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
              }
              {isActive && <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
            </div>
          </div>
        </div>

        {/* Nombre + stats */}
        <div className="pt-14 px-6 text-center">
          <div className="flex items-center justify-center gap-1">
            <h2 className="text-xl font-bold text-gray-900">{detail.name}</h2>
            {detail.is_verified && (
              <svg className="w-5 h-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          {detail.nickname && <p className="text-gray-500 text-sm">@{detail.nickname}</p>}
          <div className="flex justify-center gap-6 mt-3 pb-3 border-b border-gray-200">
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">⭐ {detail.rating_count && detail.rating_count > 0 ? '—' : '—'}</p>
              <p className="text-xs text-gray-500">{detail.rating_count ?? 0} reseñas</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">💼 {detail.total_jobs ?? 0}</p>
              <p className="text-xs text-gray-500">Trabajos</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-emerald-600">🔥 {freshScore}</p>
              <p className="text-xs text-gray-500">Fresh Score</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">

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
              <p className="text-lg font-extrabold text-gray-900">{formatCLP(detail.hourly_rate)}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Por hora</p>
            </div>
          </div>

          {/* Especialidades */}
          {cats.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Especialidades</h3>
              <div className="flex flex-wrap gap-2">
                {cats.map((cat, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border"
                    style={{ background: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}40` }}>
                    {getIcon(cat.icon)} {cat.display_name || cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio / microcopy */}
          {(detail.bio || detail.microcopy) && (
            <div>
              <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Sobre mí</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{detail.bio || detail.microcopy}</p>
            </div>
          )}

          {/* Habilidades */}
          {detail.skills && detail.skills.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Habilidades</h3>
              <div className="flex flex-wrap gap-2">
                {detail.skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reseñas */}
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-400 mb-2 tracking-wider">Reseñas</h3>
            <ReviewsList workerId={detail.id} showAverage={true} canRespond={false} />
          </div>

          {/* Compartir */}
          <div className="flex gap-3 pt-2 border-t border-gray-200">
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
      </div>
    </div>
  )
}
