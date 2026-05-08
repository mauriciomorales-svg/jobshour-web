'use client'

import ProductShareView from '@/app/components/ProductShareView'
import { parseProductSlug } from '@/lib/productShare'
import { useParams } from 'next/navigation'

export default function ShortProductSharePage() {
  const params = useParams<{ slug: string }>()
  const parsed = parseProductSlug(String(params?.slug || ''))

  if (!parsed) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/90 p-6 text-center shadow-2xl">
          <p className="text-5xl mb-3">🔗</p>
          <h1 className="text-xl font-black mb-2">Link no válido</h1>
          <p className="text-sm text-slate-400 mb-5">La publicación ya no existe o el enlace está incompleto.</p>
          <a href="https://jobshours.com" className="inline-block w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 rounded-xl transition">
            Ir a JobsHours
          </a>
        </div>
      </main>
    )
  }

  return <ProductShareView workerId={parsed.workerId} productId={parsed.productId} />
}
