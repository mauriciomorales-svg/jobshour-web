'use client'

import { ICON_MAP } from '@/lib/iconMap'

function formatCLP(val: number) {
  return '$' + val.toLocaleString('es-CL')
}

export interface ExpertDetail {
  id: number
  user_id?: number | null
  nickname?: string | null
  name: string
  avatar: string | null
  phone: string | null
  title: string
  bio: string
  skills: string[]
  hourly_rate: number
  fresh_score: number
  fresh_score_count: number
  rating_count: number
  total_jobs: number
  is_verified: boolean
  status: 'active' | 'intermediate' | 'inactive' | 'demand'
  category: { slug: string; name: string; display_name?: string; color: string; icon: string } | null
  categories?: { slug: string; name: string; display_name?: string; color: string; icon: string }[]
  videos_count: number
  showcase_video?: { url: string; thumbnail: string | null; duration: number | null } | null
  pos: { lat: number; lng: number }
  client_id?: number
  microcopy?: string
  is_seller?: boolean
  store_name?: string | null
  travel_role?: 'driver' | 'passenger' | null
  payload?: Record<string, unknown> | null
  active_route?: {
    available_seats?: number
    destination?: { address: string; lat?: number; lng?: number }
    origin?: { address: string; lat?: number; lng?: number }
    departure_time?: string
    arrival_time?: string
    distance_km?: number
  }
}

interface SheetUser {
  id: number
  name: string
  firstName: string
  avatarUrl: string | null
  token: string
}

export function HomeWorkerDetailSheet({
  loading,
  detail,
  onClose,
  user,
  workerProfile,
  activeRequestId,
  onTravelJoin,
  onOpenProfileSection,
  onVerWorkerProfile,
  onChatClick,
  onRequestClick,
  onCallPhoneClick,
}: {
  loading: boolean
  detail: ExpertDetail | null
  onClose: () => void
  user: SheetUser | null
  workerProfile: { id?: number } | null
  activeRequestId: number | null
  onTravelJoin: () => void | Promise<void>
  onOpenProfileSection: () => void
  onVerWorkerProfile: () => void
  onChatClick: () => void
  onRequestClick: () => void
  onCallPhoneClick: () => void
}) {
  if (!loading && !detail) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[108] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed left-0 right-0 z-[109] bottom-[68px] animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.22)] max-h-[72vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {loading && !detail ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-400">Cargando perfil...</p>
            </div>
          ) : detail ? (
            (() => {
              const selectedDetail = detail
              const _catColor = selectedDetail.category?.color || '#6b7280'
              const _isDemand = selectedDetail.status === 'demand'
              const payload = selectedDetail.payload as Record<string, unknown> | null | undefined

              return (
                <div className="pb-6">
                  <div className="px-5 pt-4 pb-5 relative" style={{ background: `linear-gradient(135deg, ${_catColor}15 0%, ${_catColor}05 100%)` }}>
                    <div className="absolute top-3 right-4 flex flex-wrap justify-end gap-1 max-w-[55%]">
                      {(selectedDetail.categories && selectedDetail.categories.length > 0
                        ? selectedDetail.categories
                        : selectedDetail.category
                          ? [selectedDetail.category]
                          : []
                      ).map((cat, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: `${cat.color || _catColor}25`, color: cat.color || _catColor }}
                        >
                          <span>{ICON_MAP[cat.icon] || '⚙️'}</span>
                          <span>{cat.display_name || cat.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                      <div className="relative shrink-0">
                        <div
                          className="w-20 h-20 rounded-2xl overflow-hidden"
                          style={{ border: `3px solid ${_catColor}60`, boxShadow: `0 8px 24px ${_catColor}30` }}
                        >
                          <img
                            src={selectedDetail.avatar || `https://i.pravatar.cc/150?u=${selectedDetail.id}`}
                            alt={selectedDetail.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full shadow-md ${
                            selectedDetail.status === 'active'
                              ? 'bg-teal-500 animate-pulse'
                              : selectedDetail.status === 'intermediate'
                                ? 'bg-amber-400 animate-pulse'
                                : _isDemand
                                  ? 'bg-amber-400'
                                  : 'bg-gray-300'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-gray-900 text-lg leading-tight">{selectedDetail.name}</h3>
                          {user && selectedDetail.user_id && user.id === selectedDetail.user_id && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">Tú</span>
                          )}
                          {_isDemand && selectedDetail.client_id && user?.id === selectedDetail.client_id && (
                            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">(yo)</span>
                          )}
                          {selectedDetail.is_verified && (
                            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        {selectedDetail.nickname && (
                          <p className="text-xs text-gray-400 font-medium mt-0.5">@{selectedDetail.nickname}</p>
                        )}
                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          <span className="font-black text-xl" style={{ color: _catColor }}>
                            {formatCLP(selectedDetail.hourly_rate)}
                            <span className="text-xs font-semibold text-gray-400">/hr</span>
                          </span>
                          {selectedDetail.fresh_score > 0 && (
                            <span className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3 fill-orange-400" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-bold text-orange-700">{selectedDetail.fresh_score}</span>
                            </span>
                          )}
                          {selectedDetail.total_jobs > 0 && (
                            <span className="text-xs text-gray-400 font-semibold">{selectedDetail.total_jobs} trabajos</span>
                          )}
                          {selectedDetail.showcase_video && (
                            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">📹 Video</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                          selectedDetail.status === 'active'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/25'
                            : selectedDetail.status === 'intermediate'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                              : _isDemand
                                ? 'bg-amber-400 text-white'
                                : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedDetail.status === 'active'
                              ? 'bg-white animate-pulse'
                              : selectedDetail.status === 'intermediate'
                                ? 'bg-white animate-pulse'
                                : _isDemand
                                  ? 'bg-white'
                                  : 'bg-gray-400'
                          }`}
                        />
                        {selectedDetail.status === 'active'
                          ? 'Disp. Inmediata'
                          : selectedDetail.status === 'intermediate'
                            ? 'Disp. Flexible'
                            : _isDemand
                              ? 'Demanda activa'
                              : 'No disponible'}
                      </span>
                    </div>
                  </div>

                  {selectedDetail.microcopy && (
                    <div className="px-5 py-3 border-t border-gray-50">
                      <p className="text-sm text-gray-500 italic leading-relaxed">&ldquo;{selectedDetail.microcopy}&rdquo;</p>
                    </div>
                  )}

                  {selectedDetail.travel_role && (
                    <div
                      className={`mx-5 mt-3 rounded-2xl p-3.5 border ${
                        selectedDetail.travel_role === 'driver' ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{selectedDetail.travel_role === 'driver' ? '🚗' : '🙋'}</span>
                        <span
                          className={`text-sm font-bold ${selectedDetail.travel_role === 'driver' ? 'text-teal-900' : 'text-amber-950'}`}
                        >
                          {selectedDetail.travel_role === 'driver' ? 'Ofrece transporte' : 'Busca transporte'}
                        </span>
                        {payload?.seats != null && (
                          <span
                            className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                              selectedDetail.travel_role === 'driver' ? 'bg-teal-200 text-teal-900' : 'bg-amber-200 text-amber-950'
                            }`}
                          >
                            {String(payload.seats)}{' '}
                            {selectedDetail.travel_role === 'driver' ? 'asientos libres' : 'asientos necesarios'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        {payload?.origin_address != null && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-teal-800' : 'text-amber-900'}>
                            📍 Desde: <span className="font-semibold">{String(payload.origin_address)}</span>
                          </p>
                        )}
                        {(payload?.destination_address != null || payload?.destination_name != null) && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-teal-800' : 'text-amber-900'}>
                            🏁 Hacia:{' '}
                            <span className="font-semibold">
                              {String(payload.destination_address ?? payload.destination_name ?? '')}
                            </span>
                          </p>
                        )}
                        {payload?.departure_time != null && (
                          <p className={selectedDetail.travel_role === 'driver' ? 'text-teal-800' : 'text-amber-900'}>
                            🕐 Salida:{' '}
                            <span className="font-semibold">
                              {new Date(String(payload.departure_time)).toLocaleString('es-CL', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!selectedDetail.travel_role &&
                    selectedDetail.active_route?.available_seats &&
                    selectedDetail.active_route.available_seats > 0 && (
                      <div className="mx-5 mt-3 bg-teal-50 border border-teal-200 rounded-2xl p-3.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🚗</span>
                          <span className="text-sm font-bold text-teal-900">Modo viaje activo</span>
                          <span className="ml-auto text-xs bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-bold">
                            {selectedDetail.active_route.available_seats} asientos
                          </span>
                        </div>
                        {selectedDetail.active_route.destination && (
                          <p className="text-xs text-teal-800">
                            Hacia: <span className="font-semibold">{selectedDetail.active_route.destination.address}</span>
                          </p>
                        )}
                      </div>
                    )}

                  {(() => {
                    const isSelf =
                      !!(user && selectedDetail.user_id && user.id === selectedDetail.user_id) ||
                      !!(workerProfile?.id && selectedDetail.id && Number(workerProfile.id) === Number(selectedDetail.id))
                    const isDemand = selectedDetail.status === 'demand'
                    const isTravelPin = isDemand && !!selectedDetail.travel_role
                    const isOwnDemand = isDemand && selectedDetail.client_id === user?.id

                    return (
                      <div className="px-5 mt-4">
                        {isSelf || isOwnDemand ? (
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              onClick={onOpenProfileSection}
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              Mi perfil
                            </button>
                            {!isDemand && selectedDetail.is_seller && (
                              <a
                                href={`/tienda/${selectedDetail.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95"
                              >
                                🛒 Ver mi tienda
                              </a>
                            )}
                          </div>
                        ) : isTravelPin ? (
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              onClick={() => void onTravelJoin()}
                              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition active:scale-95 ${
                                selectedDetail.travel_role === 'driver'
                                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-500/25'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20'
                              }`}
                            >
                              {selectedDetail.travel_role === 'driver' ? '🙋 Solicitar unirse al viaje' : '🚗 Ofrecerme como chofer'}
                            </button>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.pos.lat},${selectedDetail.pos.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-semibold transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Ver en mapa
                            </a>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            {isDemand ? (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetail.pos.lat},${selectedDetail.pos.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Cómo llegar
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={onVerWorkerProfile}
                                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                Ver perfil
                              </button>
                            )}
                            {selectedDetail.status === 'inactive' ? (
                              <button
                                type="button"
                                disabled
                                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-2xl text-sm font-bold cursor-not-allowed"
                              >
                                No disponible
                              </button>
                            ) : activeRequestId ? (
                              <button
                                type="button"
                                onClick={onChatClick}
                                className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold transition active:scale-95 shadow-md shadow-teal-500/20"
                              >
                                💬 Chat activo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={onRequestClick}
                                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition active:scale-95 ${
                                  selectedDetail.status === 'active'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20'
                                    : 'bg-amber-400 hover:bg-amber-500 text-white'
                                }`}
                              >
                                {selectedDetail.status === 'active' ? '⚡ Solicitar ahora' : '💬 Consultar'}
                              </button>
                            )}
                            {!isDemand && selectedDetail.is_seller && (
                              <a
                                href={`/tienda/${selectedDetail.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="col-span-2 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                              >
                                🛒 Ver tienda
                              </a>
                            )}
                            {selectedDetail.phone && (
                              <button
                                type="button"
                                onClick={onCallPhoneClick}
                                className="col-span-2 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                Llamar ahora
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })()
          ) : null}
        </div>
      </div>
    </>
  )
}
