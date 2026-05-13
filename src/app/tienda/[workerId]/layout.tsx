import type { Metadata } from 'next'
import { buildExpertShareMetadata } from '@/lib/shareMetadata'

type Props = { params: Promise<{ workerId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workerId } = await params
  if (!/^\d+$/.test(workerId)) {
    return { title: 'Tienda — JobsHours' }
  }
  return buildExpertShareMetadata(workerId, { variant: 'tienda' })
}

export default function TiendaWorkerLayout({ children }: { children: React.ReactNode }) {
  return children
}
