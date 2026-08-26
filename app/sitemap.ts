import type { MetadataRoute } from 'next'
import { marketingSlugs } from '@/lib/marketing-pages'

const BASE_URL = 'https://mywebsite.in'
const LAST_MODIFIED = new Date('2026-08-26')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: LAST_MODIFIED, priority: 1 },
    ...marketingSlugs.map((slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: LAST_MODIFIED,
      priority: 0.8,
    })),
    { url: `${BASE_URL}/early-access`, lastModified: LAST_MODIFIED, priority: 0.6 },
  ]
}
