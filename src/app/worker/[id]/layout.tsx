import type { Metadata } from 'next'
import { buildExpertShareMetadata } from '@/lib/shareMetadata'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return { title: 'Perfil — JobsHours' }
  }
  return buildExpertShareMetadata(id, { variant: 'profile' })
}

export default function WorkerPublicLayout({ children }: { children: React.ReactNode }) {
  return children
}
