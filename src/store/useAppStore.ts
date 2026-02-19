import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MapPoint } from '@/app/components/MapSection'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerStatus = 'guest' | 'inactive' | 'intermediate' | 'active'

export interface AuthUser {
  id: number
  name: string
  firstName: string
  avatarUrl: string | null
  provider: string
  token: string
}

// ─── Auth Slice ───────────────────────────────────────────────────────────────

interface AuthSlice {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
}

// ─── Worker Slice ─────────────────────────────────────────────────────────────

interface WorkerSlice {
  workerStatus: WorkerStatus
  setWorkerStatus: (status: WorkerStatus) => void
  workerCategories: number[]
  setWorkerCategories: (cats: number[]) => void
}

// ─── Map Slice ────────────────────────────────────────────────────────────────

interface MapSlice {
  points: MapPoint[]
  setPoints: (points: MapPoint[]) => void
  updatePoint: (workerId: number, patch: Partial<MapPoint>) => void
  removePoint: (id: number) => void
  userLat: number
  userLng: number
  setUserLocation: (lat: number, lng: number) => void
}

// ─── UI Slice ─────────────────────────────────────────────────────────────────

interface UiSlice {
  demandAlert: string | null
  setDemandAlert: (msg: string | null) => void
}

// ─── Combined Store ───────────────────────────────────────────────────────────

type AppStore = AuthSlice & WorkerSlice & MapSlice & UiSlice

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),
      token: null,
      setToken: (token) => set({ token }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
        set({ user: null, token: null, workerStatus: 'guest', workerCategories: [] })
      },

      // Worker
      workerStatus: 'guest',
      setWorkerStatus: (workerStatus) => set({ workerStatus }),
      workerCategories: [],
      setWorkerCategories: (workerCategories) => set({ workerCategories }),

      // Map
      points: [],
      setPoints: (points) => set({ points }),
      updatePoint: (workerId, patch) =>
        set((state) => ({
          points: state.points.map((p) =>
            p.id === workerId && p.pin_type !== 'demand' ? { ...p, ...patch } : p
          ),
        })),
      removePoint: (id) =>
        set((state) => ({ points: state.points.filter((p) => p.id !== id) })),
      userLat: -37.6672,
      userLng: -72.573,
      setUserLocation: (userLat, userLng) => set({ userLat, userLng }),

      // UI
      demandAlert: null,
      setDemandAlert: (demandAlert) => set({ demandAlert }),
    }),
    {
      name: 'jobshour-app-store',
      partialize: (state) => ({
        // Solo persistir datos de auth y ubicación (no UI ni puntos del mapa)
        user: state.user,
        token: state.token,
        workerStatus: state.workerStatus,
        workerCategories: state.workerCategories,
        userLat: state.userLat,
        userLng: state.userLng,
      }),
    }
  )
)

// ─── Selectores reutilizables ─────────────────────────────────────────────────

export const selectUser = (s: AppStore) => s.user
export const selectToken = (s: AppStore) => s.token
export const selectWorkerStatus = (s: AppStore) => s.workerStatus
export const selectWorkerCategories = (s: AppStore) => s.workerCategories
export const selectPoints = (s: AppStore) => s.points
export const selectUserLocation = (s: AppStore) => ({ lat: s.userLat, lng: s.userLng })
export const selectDemandAlert = (s: AppStore) => s.demandAlert
