import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildDemandShareMetadata } from '@/lib/shareMetadata'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return { title: 'Demanda — JobsHours' }
  }
  return buildDemandShareMetadata(id)
}

export default function DemandShareLayout({ children }: { children: ReactNode }) {
  return children
}
