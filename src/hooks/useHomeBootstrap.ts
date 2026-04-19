'use client'

import { useEffect, useState, Dispatch, SetStateAction } from 'react'
import { getPublicApiBase } from '@/lib/api'

interface ApiCategory {
  id: number
  slug: string
  name: string
  icon: string
  color: string
  active_count: number
}

export function useHomeBootstrap(setShowPublishDemand: Dispatch<SetStateAction<boolean>>) {
  const [categories, setCategories] = useState<ApiCategory[]>([])

  useEffect(() => {
    fetch(`${getPublicApiBase()}/api/v1/categories`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => setShowPublishDemand(true)
    window.addEventListener('open-publish-demand', handler)
    return () => window.removeEventListener('open-publish-demand', handler)
  }, [setShowPublishDemand])

  return { categories, setCategories }
}

export type { ApiCategory }
