'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { HomeMapArea, type HomeMapRef } from './HomeMapPanel'
import { HomeHeader } from './HomeHeader'
import { HomeWorkerDetailSheet, type ExpertDetail } from './HomeWorkerDetailSheet'
import { HomeDashboardPanel } from './HomeDashboardPanel'
import { HomeLocationPrompt } from './HomeLocationPrompt'
import { MapPoint } from './MapSection'
import type { ApiCategory } from '@/hooks/useHomeBootstrap'
import type { AuthUser } from '@/hooks/useUserAuth'

interface MapScreenProps {
  mapRef: RefObject<HomeMapRef | null>
  filtered: MapPoint[]
  onPointClick: (p: MapPoint) => void
  onMapClick: () => void
  highlightedRequestId: number | null
  onLeafletReady: (map: LeafletMap) => void
  onMapMove: (lat: number, lng: number) => void
  showLocationFab: boolean
  onCenterOnMyLocation: () => void
  showEmptyOverlay: boolean
  onDismissEmptyMap: () => void
  onPublishFromEmpty: () => void
  notifBadge: number
  onMenuToggle: () => void
  headerUser: { id: number; firstName: string; avatarUrl: string | null } | null
  onLoginClick: () => void
  onProfileClick: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  workerCount: { count: number; label: string } | null
  categories: ApiCategory[]
  activeCategory: number | null
  onCategoryClick: (id: number) => void
  selectedDetail: ExpertDetail | null
  loadingDetail: boolean
  onCloseDetail: () => void
  user: AuthUser | null
  workerProfile: { id?: number } | null
  activeRequestId: number | null
  onTravelJoin: () => void
  onOpenProfileSection: () => void
  onVerWorkerProfile: () => void
  onDetailChat: () => void
  onDetailRequest: () => void
  onCallPhone: () => void
  dashHidden: boolean
  userLat: number
  userLng: number
  currentUserId: number | undefined
  onDashboardClose: () => void
  onDashboardRefresh: () => void
  setHighlightedRequestId: (id: number | null) => void
  setSelectedDetail: (d: ExpertDetail | null) => void
  setShowRequestModal: (v: boolean) => void
  setDashHidden: (v: boolean) => void
  setShowLoginModal: (v: boolean) => void
  setShowOnboarding: (v: boolean) => void
  setActiveRequestId: (id: number | null) => void
  setChatContext: Dispatch<SetStateAction<{
    description?: string; name?: string; avatar?: string | null
    myRole?: 'cliente' | 'trabajador'; isSelf?: boolean
  }>>
  setShowChat: (v: boolean) => void
  setPoints: React.Dispatch<React.SetStateAction<MapPoint[]>>
  fetchNearby: (categoryId?: number | null) => void
  checkAuthAndProfile: () => { canInteract: boolean; reason?: 'login' | 'profile' }
  toast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning', subtitle?: string) => void
  showLocationPrompt: boolean
  onDismissLocationPrompt: () => void
}

export function MapScreen(props: MapScreenProps) {
  const {
    mapRef, filtered, onPointClick, onMapClick, highlightedRequestId,
    onLeafletReady, onMapMove, showLocationFab, onCenterOnMyLocation,
    showEmptyOverlay, onDismissEmptyMap, onPublishFromEmpty,
    notifBadge, onMenuToggle, headerUser, onLoginClick, onProfileClick,
    searchQuery, onSearchChange, workerCount, categories, activeCategory, onCategoryClick,
    selectedDetail, loadingDetail, onCloseDetail, user, workerProfile, activeRequestId,
    onTravelJoin, onOpenProfileSection, onVerWorkerProfile, onDetailChat, onDetailRequest, onCallPhone,
    dashHidden, userLat, userLng, currentUserId, onDashboardClose, onDashboardRefresh,
    setHighlightedRequestId, setSelectedDetail, setShowRequestModal, setDashHidden,
    setShowLoginModal, setShowOnboarding, setActiveRequestId, setChatContext, setShowChat,
    setPoints, fetchNearby, checkAuthAndProfile, toast,
    showLocationPrompt, onDismissLocationPrompt,
  } = props

  return (
    <>
      <HomeMapArea
        ref={mapRef}
        mapPoints={filtered}
        onPointClick={onPointClick}
        onMapClick={onMapClick}
        highlightedId={highlightedRequestId}
        onLeafletReady={onLeafletReady}
        onMapMove={onMapMove}
        showLocationFab={showLocationFab}
        onCenterOnMyLocation={onCenterOnMyLocation}
        showEmptyOverlay={showEmptyOverlay}
        onDismissEmptyMap={onDismissEmptyMap}
        onPublishFromEmpty={onPublishFromEmpty}
      />

      <HomeHeader
        notifBadge={notifBadge}
        onMenuToggle={onMenuToggle}
        user={headerUser}
        onLoginClick={onLoginClick}
        onProfileClick={onProfileClick}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        workerCount={workerCount}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={onCategoryClick}
      />

      {(selectedDetail || loadingDetail) && (
        <HomeWorkerDetailSheet
          loading={loadingDetail && !selectedDetail}
          detail={selectedDetail}
          onClose={onCloseDetail}
          user={user}
          workerProfile={workerProfile}
          activeRequestId={activeRequestId}
          onTravelJoin={onTravelJoin}
          onOpenProfileSection={onOpenProfileSection}
          onVerWorkerProfile={onVerWorkerProfile}
          onChatClick={onDetailChat}
          onRequestClick={onDetailRequest}
          onCallPhoneClick={onCallPhone}
        />
      )}

      <HomeDashboardPanel
        hidden={dashHidden}
        userLat={userLat}
        userLng={userLng}
        currentUserId={currentUserId}
        highlightedRequestId={highlightedRequestId}
        onClose={onDashboardClose}
        onRefreshMapAndFeed={onDashboardRefresh}
        setHighlightedRequestId={setHighlightedRequestId}
        setSelectedDetail={setSelectedDetail}
        setShowRequestModal={setShowRequestModal}
        setDashHidden={setDashHidden}
        setShowLoginModal={setShowLoginModal}
        setShowOnboarding={setShowOnboarding}
        setActiveRequestId={setActiveRequestId}
        setChatContext={setChatContext}
        setShowChat={setShowChat}
        setPoints={setPoints}
        fetchNearby={fetchNearby}
        checkAuthAndProfile={checkAuthAndProfile}
        toast={toast}
      />

      <HomeLocationPrompt
        open={showLocationPrompt}
        user={user}
        onDismiss={onDismissLocationPrompt}
      />
    </>
  )
}
