'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'

const LoginModal = dynamic(() => import('./LoginModal'), { ssr: false })
const PublishDemandModal = dynamic(() => import('./PublishDemandModal'), { ssr: false })
const RatingModal = dynamic(() => import('./RatingModal'), { ssr: false })
const OnboardingWizard = dynamic(() => import('./OnboardingWizard'), { ssr: false })
const OnboardingSlides = dynamic(() => import('./OnboardingSlides'), { ssr: false })

interface PublishCategory {
  id: number
  name: string
  icon: string
  color: string
}

export interface HomeModalsUser {
  id: number
  name: string
  token: string
  avatarUrl: string | null
}

export function HomeModals({
  showLoginModal,
  user,
  onCloseLogin,
  onLoginSuccess,
  onSwitchRegister,
  onForgotPassword,
  showPublishDemand,
  userLat,
  userLng,
  publishCategories,
  onClosePublishDemand,
  onPublishDemandSuccess,
  showRatingModal,
  ratingRequestId,
  ratingWorkerInfo,
  onCloseRating,
  onRated,
  showCategoryRequiredModal,
  onCategoryRequiredGoProfile,
  onCategoryRequiredCancel,
  showOnboarding,
  onCloseOnboarding,
  onCompleteOnboarding,
  showWelcomeSlides,
  onWelcomeSlidesDone,
  showPublishSuccess,
}: {
  showLoginModal: boolean
  user: HomeModalsUser | null
  onCloseLogin: () => void
  onLoginSuccess: (u: unknown, token: string) => void
  onSwitchRegister: () => void
  onForgotPassword: () => void
  showPublishDemand: boolean
  userLat: number
  userLng: number
  publishCategories: PublishCategory[]
  onClosePublishDemand: () => void
  onPublishDemandSuccess: () => void
  showRatingModal: boolean
  ratingRequestId: number | null
  ratingWorkerInfo: { name: string; avatar: string | null } | null
  onCloseRating: () => void
  onRated: () => void
  showCategoryRequiredModal: boolean
  onCategoryRequiredGoProfile: () => void
  onCategoryRequiredCancel: () => void
  showOnboarding: boolean
  onCloseOnboarding: () => void
  onCompleteOnboarding: () => void | Promise<void>
  showWelcomeSlides: boolean
  onWelcomeSlidesDone: () => void
  showPublishSuccess: boolean
}) {
  return (
    <>
      {showLoginModal && !user && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={onCloseLogin}
          onSuccess={onLoginSuccess}
          onSwitchToRegister={onSwitchRegister}
          onForgotPassword={onForgotPassword}
        />
      )}

      {showPublishDemand && (
        <PublishDemandModal
          userLat={userLat}
          userLng={userLng}
          categories={publishCategories}
          onClose={onClosePublishDemand}
          onPublished={onPublishDemandSuccess}
        />
      )}

      {showRatingModal && ratingRequestId && ratingWorkerInfo && (
        <RatingModal
          isOpen
          onClose={onCloseRating}
          serviceRequestId={ratingRequestId}
          workerName={ratingWorkerInfo.name}
          workerAvatar={ratingWorkerInfo.avatar}
          onRated={onRated}
        />
      )}

      {showCategoryRequiredModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚙️</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Configura tu perfil</h3>
              <p className="text-sm text-gray-600">
                Necesitas seleccionar al menos una habilidad para poder activar el modo trabajo y aparecer en el mapa.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={onCategoryRequiredGoProfile}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-xl font-black text-base shadow-lg hover:from-yellow-500 hover:to-orange-600 transition"
              >
                Ir a Mi Perfil →
              </button>

              <button
                type="button"
                onClick={onCategoryRequiredCancel}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showOnboarding && user && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={onCloseOnboarding}
          onComplete={onCompleteOnboarding}
          userToken={user.token}
          userName={user.name}
          userAvatar={user.avatarUrl}
        />
      )}

      {showWelcomeSlides && (
        <OnboardingSlides
          onDone={onWelcomeSlidesDone}
        />
      )}

      {showPublishSuccess && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50">
              <span className="text-5xl">✨</span>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl drop-shadow-lg">¡Demanda publicada!</p>
              <p className="text-white/70 text-sm mt-1">Los trabajadores cercanos la verán ahora</p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
