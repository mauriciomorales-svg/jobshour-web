'use client'

import ProductShareView from '@/app/components/ProductShareView'
import { parseProductSlug } from '@/lib/productShare'
import { useParams } from 'next/navigation'

export default function ShortProductSharePage() {
  const params = useParams<{ slug: string }>()
  const parsed = parseProductSlug(String(params?.slug || ''))

  if (!parsed) {
    return <main className="min-h-screen bg-slate-950 text-white p-6">Link de producto invalido.</main>
  }

  return <ProductShareView workerId={parsed.workerId} productId={parsed.productId} />
}
