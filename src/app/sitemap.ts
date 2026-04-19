import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://jobshours.com',
      lastModified: '2026-04-19',
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
