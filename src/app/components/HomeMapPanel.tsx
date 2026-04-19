'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

import { ICON_MAP } from '@/lib/iconMap'
import type { MapPoint } from '@/app/components/MapSection'
import { surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

const MapSection = dynamic(() => import('./MapSection'), { ssr: false })

export interface HomeMapCategoryItem {
  id: number
  icon: string
  name: string
  active_count: number
}

export function HomeMapCategoryBar({
  categories,
  activeCategory,
  onCategoryClick,
}: {
  categories: HomeMapCategoryItem[]
  activeCategory: number | null
  onCategoryClick: (catId: number) => void
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 pointer-events-auto border-b border-slate-800/50">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryClick(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === c.id
                ? 'bg-teal-500/25 text-teal-300 border border-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.15)]'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <span className="text-sm">{ICON_MAP[c.icon] || '📌'}</span>
            <span>{c.name}</span>
            {c.active_count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === c.id ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-700 text-slate-500'
                }`}
              >
                {c.active_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export type HomeMapRef = {
  flyTo: (latlng: [number, number], zoom: number) => Promise<boolean>
}

export interface HomeMapAreaProps {
  mapPoints: MapPoint[]
  onPointClick: (p: MapPoint) => void | Promise<void>
  onMapClick: () => void
  highlightedId: number | null
  onLeafletReady: (map: LeafletMap) => void
  onMapMove: (lat: number, lng: number) => void
  showLocationFab: boolean
  onCenterOnMyLocation: () => void
  showEmptyOverlay: boolean
  onDismissEmptyMap: () => void
  onPublishFromEmpty: () => void
}

export const HomeMapArea = forwardRef<HomeMapRef | null, HomeMapAreaProps>(function HomeMapArea(
  {
    mapPoints,
    onPointClick,
    onMapClick,
    highlightedId,
    onLeafletReady,
    onMapMove,
    showLocationFab,
    onCenterOnMyLocation,
    showEmptyOverlay,
    onDismissEmptyMap,
    onPublishFromEmpty,
  },
  ref,
) {
  return (
    <>
      <div className="absolute inset-0 pt-[180px] pb-[68px]">
        <MapSection
          ref={ref}
          points={mapPoints}
          onPointClick={onPointClick}
          onMapClick={onMapClick}
          highlightedId={highlightedId}
          onLeafletReady={onLeafletReady}
          onMapMove={onMapMove}
        />
        {showLocationFab && (
          <button
            type="button"
            onClick={onCenterOnMyLocation}
            className="absolute right-4 bottom-28 z-[200] flex flex-col items-center gap-0.5 rounded-2xl bg-white/95 px-2 py-2 shadow-lg ring-1 ring-slate-200/90 text-teal-600 hover:bg-teal-50 active:scale-95 transition pointer-events-auto"
            title="Ir a mi ubicación (GPS)"
            aria-label="Centrar mapa en mi ubicación"
          >
            <svg className="w-7 h-7 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="max-w-[4.5rem] text-center text-[9px] font-bold leading-tight text-slate-600">Mi ubicación</span>
          </button>
        )}
      </div>

      {showEmptyOverlay && (
        <div className="absolute inset-0 pt-[180px] pb-[68px] flex items-center justify-center pointer-events-none z-[150]">
          <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-2xl px-6 py-5 mx-6 text-center shadow-2xl pointer-events-auto">
            <button
              type="button"
              onClick={onDismissEmptyMap}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition"
              aria-label={surfaceCopy.close}
            >
              ✕
            </button>
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-white font-black text-base mb-1">No hay trabajadores cerca</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Mueve el mapa para buscar en otra zona, o publica lo que necesitas y te contactarán.
            </p>
            <button
              type="button"
              onClick={onPublishFromEmpty}
              className={uiTone.ctaPublishCompact}
            >
              {surfaceCopy.publishFromMapEmpty}
            </button>
          </div>
        </div>
      )}
    </>
  )
})
