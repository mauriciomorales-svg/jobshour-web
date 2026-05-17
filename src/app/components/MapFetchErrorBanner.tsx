'use client'

import type { NearbyFetchError } from '@/hooks/useNearbyFetch'

interface Props {
  error: NearbyFetchError
  onRetry: () => void
}

export function MapFetchErrorBanner({ error, onRetry }: Props) {
  if (error === 'none') return null

  const copy =
    error === 'timeout'
      ? {
          title: 'La búsqueda tardó demasiado',
          body: 'Revisa tu conexión e intenta de nuevo.',
        }
      : error === 'server'
        ? {
            title: 'No pudimos cargar el mapa',
            body: 'El servidor no respondió bien. Probá en unos segundos.',
          }
        : {
            title: 'Sin conexión',
            body: 'No se pudieron cargar trabajadores ni demandas.',
          }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-36 z-[160] flex justify-center">
      <div className="pointer-events-auto mx-4 mb-2 max-w-md rounded-2xl border border-red-500/40 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-sm">
        <p className="text-sm font-bold text-white">{copy.title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{copy.body}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 w-full rounded-xl bg-red-500/90 py-2 text-xs font-bold text-white transition hover:bg-red-400"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
