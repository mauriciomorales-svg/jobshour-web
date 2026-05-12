import type { MetadataRoute } from 'next'

const BASE = 'https://jobshours.com'
const TODAY = new Date().toISOString().split('T')[0]

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: TODAY,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE}/landing`,
      lastModified: TODAY,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/terminos`,
      lastModified: '2026-01-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/privacidad`,
      lastModified: '2026-01-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
