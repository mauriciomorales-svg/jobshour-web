'use client'

import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react'
import { getPublicApiBase } from '@/lib/api'
import { feedbackCopy } from '@/lib/userFacingCopy'

type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

export interface AuthUser {
  id: number
  name: string
  firstName: string
  avatarUrl: string | null
  provider: string
  token: string
}

interface UseUserAuthOptions {
  fetchWorkerData: (token: string) => Promise<void>
  setWorkerStatus: Dispatch<SetStateAction<WorkerStatus>>
}

export function useUserAuth({ fetchWorkerData, setWorkerStatus }: UseUserAuthOptions) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showWelcomeSlides, setShowWelcomeSlides] = useState(false)

  // Onboarding de primera vez
  useEffect(() => {
    const seen = localStorage.getItem('welcome_slides_done')
    if (!seen) setShowWelcomeSlides(true)
  }, [])

  const checkAuthAndProfile = useCallback((): { canInteract: boolean; reason?: 'login' | 'profile' } => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (!token) return { canInteract: false, reason: 'login' }
    if (!user) return { canInteract: false, reason: 'login' }
    if (!user.avatarUrl || !user.name || user.name === 'Usuario') {
      return { canInteract: false, reason: 'profile' }
    }
    return { canInteract: true }
  }, [user])

  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const r = await fetch(`${getPublicApiBase()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) {
        localStorage.removeItem('auth_token')
        setUser(null)
        setWorkerStatus('guest')
        return
      }
      const data = await r.json()
      setUser({
        id: data.id,
        name: data.name || 'Usuario',
        firstName: (data.name || 'Usuario').split(' ')[0],
        avatarUrl: data.avatar || data.worker?.avatar || null,
        provider: data.provider || 'email',
        token,
      })

      const onboardingDoneKey = `onboarding_done_${data.id}`
      const onboardingDone = localStorage.getItem(onboardingDoneKey) === 'true'

      fetchWorkerData(token)

      if (onboardingDone) return

      const workerIntent = localStorage.getItem('worker_intent')

      if (data.worker) {
        const profileCompleted =
          data.worker.profile_completed !== undefined
            ? data.worker.profile_completed
            : data.worker.category_id && data.worker.hourly_rate
        if (!profileCompleted) {
          setTimeout(() => setShowOnboarding(true), 300)
          if (workerIntent) localStorage.removeItem('worker_intent')
        } else {
          localStorage.setItem(onboardingDoneKey, 'true')
        }
      } else if (workerIntent === 'activate' || workerIntent === 'register') {
        setTimeout(() => setShowOnboarding(true), 300)
        localStorage.removeItem('worker_intent')
      }

      setWorkerStatus((prev) => (prev !== 'guest' ? prev : 'inactive'))
    } catch {
      localStorage.removeItem('auth_token')
      setUser(null)
      setWorkerStatus('guest')
    }
  }, [fetchWorkerData, setWorkerStatus])

  // Handle OAuth callback en Capacitor via browserFinished
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cap = (window as any).Capacitor
    if (!cap) return

    let removeBrowserListener: () => void = () => {}
    let removeUrlListener: () => void = () => {}

    import('@capacitor/browser').then(({ Browser }) => {
      Browser.addListener('browserFinished', async () => {
        const authKey = localStorage.getItem('pending_auth_key')
        if (!authKey) return
        localStorage.removeItem('pending_auth_key')
        try {
          const res = await fetch(`https://jobshours.com/api/auth/mobile-token?key=${authKey}`)
          if (res.ok) {
            const data = await res.json()
            if (data.token) {
              localStorage.setItem('auth_token', data.token)
              fetchUserProfile(data.token)
            }
          }
        } catch (e) {
          console.error('Error recuperando token:', e)
        }
      }).then((listener: any) => { removeBrowserListener = listener.remove })
    })

    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async (data: { url: string }) => {
        try {
          const url = new URL(data.url)
          if (data.url.startsWith('jobshour://auth-success')) {
            const authKey = url.searchParams.get('key')
            if (!authKey) return
            const res = await fetch(`https://jobshours.com/api/auth/mobile-token?key=${authKey}`)
            if (res.ok) {
              const d = await res.json()
              if (d.token) { localStorage.setItem('auth_token', d.token); fetchUserProfile(d.token) }
            }
            return
          }
          const token = url.searchParams.get('token')
          if (token) { localStorage.setItem('auth_token', token); fetchUserProfile(token) }
        } catch (e) {
          console.error('Error parsing deep link:', e)
        }
      }).then((listener: any) => { removeUrlListener = listener.remove })
    })

    return () => { removeBrowserListener(); removeUrlListener() }
  }, [fetchUserProfile])

  // Handle social login callback + token existente + auto-login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const loginSuccess = urlParams.get('login')

    if (token && loginSuccess === 'success') {
      localStorage.setItem('auth_token', token)
      window.history.replaceState({}, '', window.location.pathname)
      fetchUserProfile(token)
      localStorage.removeItem('worker_intent')
    } else {
      const existingToken = localStorage.getItem('auth_token')
      if (existingToken) {
        fetchUserProfile(existingToken)
      } else {
        const savedEmail = localStorage.getItem('saved_email')
        const savedPassword = localStorage.getItem('saved_password')
        if (savedEmail && savedPassword) {
          fetch(`${getPublicApiBase()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail, password: savedPassword }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.token) {
                localStorage.setItem('auth_token', data.token)
                fetchUserProfile(data.token)
              }
            })
            .catch(() => {})
        }
      }
    }
  }, [fetchUserProfile])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setWorkerStatus('guest')
    alert(feedbackCopy.sessionClosed)
  }, [setWorkerStatus])

  const handleLoginSuccess = useCallback(
    (_u: unknown, token: string) => {
      localStorage.setItem('auth_token', token)
      fetchUserProfile(token)
      setShowLoginModal(false)
    },
    [fetchUserProfile]
  )

  const handleCompleteOnboarding = useCallback(async (userId?: number) => {
    setShowOnboarding(false)
    if (userId) localStorage.setItem(`onboarding_done_${userId}`, 'true')
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    if (token) await fetchUserProfile(token)
  }, [fetchUserProfile])

  const handleWelcomeSlidesDone = useCallback(() => {
    localStorage.setItem('welcome_slides_done', 'true')
    setShowWelcomeSlides(false)
  }, [])

  return {
    user,
    setUser,
    showLoginModal,
    setShowLoginModal,
    showOnboarding,
    setShowOnboarding,
    showWelcomeSlides,
    checkAuthAndProfile,
    fetchUserProfile,
    handleLogout,
    handleLoginSuccess,
    handleCompleteOnboarding,
    handleWelcomeSlidesDone,
  }
}
