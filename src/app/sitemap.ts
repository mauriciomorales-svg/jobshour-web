import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://jobshours.com'
  const now = new Date()
  return [{ url: base, lastModified: now, changeFrequency: 'daily', priority: 1 }]
}
