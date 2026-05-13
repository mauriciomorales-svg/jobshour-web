'use client'

import { useParams } from 'next/navigation'
import DemandShareView from '@/app/components/DemandShareView'

export default function DemandSharePage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  if (!Number.isFinite(id) || id <= 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-slate-400 text-sm">Enlace no válido</p>
      </main>
    )
  }
  return <DemandShareView demandId={id} />
}
