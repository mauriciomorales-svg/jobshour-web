'use client'

import { useParams } from 'next/navigation'
import ProductShareView from '@/app/components/ProductShareView'

export default function ProductSharePage() {
  const params = useParams<{ workerId: string; productId: string }>()
  const workerId = Number(params?.workerId)
  const productId = Number(params?.productId)
  return <ProductShareView workerId={workerId} productId={productId} />
}
