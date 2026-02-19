'use client'

export type TabKey = 'map' | 'feed' | 'requests' | 'profile'

interface Tab {
  key: TabKey
  label: string
  icon: (active: boolean) => JSX.Element
  badge?: number
}

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
  requestsBadge?: number
  isWorker?: boolean
}

const MapIcon = (active: boolean) => (
  <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)

const FeedIcon = (active: boolean) => (
  <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const RequestsIcon = (active: boolean) => (
  <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const ProfileIcon = (active: boolean) => (
  <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

export default function BottomTabBar({ active, onChange, requestsBadge = 0, isWorker = false }: Props) {
  const tabs: Tab[] = [
    { key: 'map',      label: 'Mapa',       icon: MapIcon },
    { key: 'feed',     label: isWorker ? 'Oportunidades' : 'Demandas', icon: FeedIcon },
    { key: 'requests', label: 'Solicitudes', icon: RequestsIcon, badge: requestsBadge },
    { key: 'profile',  label: 'Perfil',      icon: ProfileIcon },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      {/* Safe area padding for iOS */}
      <div className="flex items-stretch pb-safe">
        {tabs.map(tab => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-all duration-150 active:scale-95 ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}

              {/* Icon with badge */}
              <div className="relative">
                {tab.icon(isActive)}
                {(tab.badge ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow">
                    {tab.badge! > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
