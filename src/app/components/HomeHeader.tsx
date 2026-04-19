'use client'

import { HomeMapCategoryBar, type HomeMapCategoryItem } from './HomeMapPanel'

export interface HomeHeaderUser {
  id: number
  firstName: string
  avatarUrl: string | null
}

export function HomeHeader({
  notifBadge,
  onMenuToggle,
  user,
  onLoginClick,
  onProfileClick,
  searchQuery,
  onSearchChange,
  workerCount,
  categories,
  activeCategory,
  onCategoryClick,
}: {
  notifBadge: number
  onMenuToggle: () => void
  user: HomeHeaderUser | null
  onLoginClick: () => void
  onProfileClick: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  workerCount: { count: number; label: string } | null
  categories: HomeMapCategoryItem[]
  activeCategory: number | null
  onCategoryClick: (catId: number) => void
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 pointer-events-auto">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onMenuToggle}
            className="relative w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition active:scale-95"
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {notifBadge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                {notifBadge > 9 ? '9+' : notifBadge}
              </span>
            )}
          </button>

          <div className="flex items-center font-black tracking-tight text-2xl leading-none gap-1">
            <span className="text-white">Jobs</span>
            <span className="text-teal-400 flex items-center">
              <span>H</span>
              <span className="relative inline-flex items-center justify-center mx-0.5" style={{ width: 28, height: 28 }}>
                <span className="absolute inset-0 rounded-full border-[3px] border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.35)]" />
                <span
                  className="clock-hand-long"
                  style={{
                    position: 'absolute',
                    bottom: '50%',
                    left: '50%',
                    width: '2.5px',
                    height: '42%',
                    background: 'linear-gradient(to top,#5eead4,#fbbf24)',
                    borderRadius: '2px',
                    transformOrigin: 'bottom center',
                  }}
                />
                <span
                  className="clock-hand-short"
                  style={{
                    position: 'absolute',
                    bottom: '50%',
                    left: '50%',
                    width: '2.5px',
                    height: '28%',
                    background: '#f1f5f9',
                    borderRadius: '2px',
                    transformOrigin: 'bottom center',
                  }}
                />
                <span className="rounded-full bg-amber-400 z-10" style={{ position: 'relative', width: 5, height: 5 }} />
              </span>
              <span>urs</span>
            </span>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={onLoginClick}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-[0_0_12px_rgba(45,212,191,0.3)]"
            >
              Ingresar
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onProfileClick}
              className="flex items-center gap-2 pr-3 pl-1 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition active:scale-95"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-7 h-7 rounded-lg object-cover" alt={user.firstName} />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-black text-sm">
                  {user.firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold text-slate-300 max-w-[60px] truncate">{user.firstName}</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-slate-800 rounded-xl px-3.5 py-2 border border-slate-700">
            <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar servicios cercanos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-200 placeholder:text-slate-500 ml-2.5"
            />
            {searchQuery && (
              <button type="button" onClick={() => onSearchChange('')} className="text-slate-500 hover:text-slate-300 ml-2 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {workerCount !== null && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-500/15 border border-teal-500/30 rounded-full text-xs font-bold text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block" />
              {workerCount.label}
            </span>
          )}
        </div>
      </div>

      <HomeMapCategoryBar categories={categories} activeCategory={activeCategory} onCategoryClick={onCategoryClick} />
    </div>
  )
}
