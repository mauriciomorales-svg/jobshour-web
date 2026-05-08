'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Store, Loader2, MapPin, Star } from 'lucide-react'
import { emptyStateCopy } from '@/lib/userFacingCopy'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://jobshours.com/api').replace(/\/api$/, '')
interface Tienda {
  id: number
  name: string
  store_name: string
  avatar: string | null
  fresh_score: number
  distance_km?: number
}

export default function StoreBrowserInline({ userLat, userLng }: { userLat: number; userLng: number }) {
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loadingTiendas, setLoadingTiendas] = useState(true)
  const [buscar, setBuscar] = useState('')
  const searchParam = useMemo(() => buscar.trim(), [buscar])

  // Cargar tiendas con búsqueda dedicada (texto + distancia + radio progresivo)
  useEffect(() => {
    const controller = new AbortController()
    setLoadingTiendas(true)
    const params = new URLSearchParams({
      lat: String(userLat),
      lng: String(userLng),
      limit: '20',
    })
    if (searchParam) params.set('q', searchParam)

    fetch(`${API_BASE}/api/v1/store/search?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setTiendas(Array.isArray(data.data) ? data.data : [])
      })
      .catch(() => {
        if (!controller.signal.aborted) setTiendas([])
      })
      .finally(() => setLoadingTiendas(false))
    return () => controller.abort()
  }, [userLat, userLng, searchParam])

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar tiendas cercanas..."
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
        />
      </div>

      <div>
        {loadingTiendas ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>
        ) : tiendas.length === 0 ? (
          <div className="text-center py-4">
            <Store className="w-8 h-8 text-slate-600 mx-auto mb-1" />
            {searchParam
              ? <p className="text-slate-500 text-xs">{`${emptyStateCopy.searchNoResultsPrefix} "${searchParam}"`}</p>
              : <p className="text-slate-500 text-xs">No hay tiendas cercanas aún</p>
            }
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {tiendas.map(t => (
              <a key={t.id} href={`/tienda/${t.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl p-2.5 transition">
                {t.avatar
                  ? <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border-2 border-orange-400 shrink-0" />
                  : <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 text-base">🛒</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-black truncate">{t.store_name || t.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{t.fresh_score?.toFixed(1)}</span>
                    {typeof t.distance_km === 'number' && (
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{t.distance_km.toFixed(1)} km</span>
                    )}
                  </div>
                </div>
                <span className="text-orange-400 text-xs font-bold shrink-0">Ver →</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
