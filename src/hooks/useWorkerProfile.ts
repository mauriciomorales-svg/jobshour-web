'use client'

import { useState, useCallback } from 'react'
import { getPublicApiBase } from '@/lib/api'

export function useWorkerProfile() {
  const [workerProfile, setWorkerProfile] = useState<any>(null)
  const [isSeller, setIsSeller] = useState(false)
  const [workerCategories, setWorkerCategories] = useState<number[]>([])

  const fetchWorkerData = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${getPublicApiBase()}/api/v1/worker/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.categories) {
          setWorkerCategories(data.data.categories.map((c: any) => c.id))
        }
        if (data.data?.id) {
          setWorkerProfile(data.data)
          setIsSeller(!!data.data.is_seller)
        }
      }
    } catch (err) {
      console.error('Error fetching worker data:', err)
    }
  }, [])

  return {
    workerProfile,
    setWorkerProfile,
    isSeller,
    setIsSeller,
    workerCategories,
    setWorkerCategories,
    fetchWorkerData,
  }
}
