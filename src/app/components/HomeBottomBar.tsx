'use client'

import dynamic from 'next/dynamic'
import BottomTabBar, { TabKey } from './BottomTabBar'
import { MapPoint } from './MapSection'

const WorkerStatusPill = dynamic(() => import('./WorkerStatusPill'), { ssr: false })

type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

interface HomeBottomBarProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  chatBadge: number
  activeChatRequestIds: number[]
  points: MapPoint[]
  workerStatus: WorkerStatus
  statusLoading: boolean
  isLoggedIn: boolean
  workerCategories: number[]
  selectedDetail: unknown | null
  onPublishDemand: () => void
  onWorkerActivate: () => void
  onShowCategoryRequired: () => void
  onWorkerStatusChange: (next: 'active' | 'intermediate' | 'inactive') => void
  onShowLogin: () => void
}

export function HomeBottomBar({
  activeTab,
  onTabChange,
  chatBadge,
  activeChatRequestIds,
  points,
  workerStatus,
  statusLoading,
  isLoggedIn,
  workerCategories,
  selectedDetail,
  onPublishDemand,
  onWorkerActivate,
  onShowCategoryRequired,
  onWorkerStatusChange,
  onShowLogin,
}: HomeBottomBarProps) {
  return (
    <>
      {activeTab === 'map' && !selectedDetail && (
        <div className="fixed bottom-[68px] right-4 z-[91]">
          <button
            onClick={onPublishDemand}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-500/40 active:scale-95 transition"
          >
            <span className="text-lg">💰</span>
            <span>Necesito ayuda</span>
          </button>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="fixed bottom-[68px] left-4 z-[91]">
          <WorkerStatusPill
            status={workerStatus}
            loading={statusLoading}
            isLoggedIn={isLoggedIn}
            onActivate={() => {
              if (workerCategories.length === 0) { onShowCategoryRequired(); return }
              onWorkerActivate()
            }}
            onChangeTo={onWorkerStatusChange}
            onShowLogin={onShowLogin}
          />
        </div>
      )}

      <BottomTabBar
        active={activeTab}
        onChange={onTabChange}
        requestsBadge={chatBadge > 0 ? chatBadge : activeChatRequestIds.length}
        demandsBadge={points.filter((p) => p.pin_type === 'demand').length}
        isWorker={workerStatus !== 'guest' && workerStatus !== 'inactive'}
      />
    </>
  )
}
