'use client'

import {
  integratedQuoteBadgeClass,
  labelIntegratedQuoteStatus,
  labelStoreOrderStatus,
  storeOrderBadgeClass,
} from '@/lib/userFacingCopy'

export type StatusBadgeKind = 'store_order' | 'integrated_quote'

type Props = {
  kind: StatusBadgeKind
  status: string
  className?: string
}

/**
 * Badge de estado con copy y colores desde `userFacingCopy` (un solo criterio visual).
 */
export function StatusBadge({ kind, status, className = '' }: Props) {
  const label =
    kind === 'store_order' ? labelStoreOrderStatus(status) : labelIntegratedQuoteStatus(status)
  const color =
    kind === 'store_order'
      ? storeOrderBadgeClass[status] ?? 'bg-slate-600 text-slate-300'
      : integratedQuoteBadgeClass[status] ?? 'bg-slate-700 text-slate-300 border-slate-600'

  if (kind === 'integrated_quote') {
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${color} ${className}`}>
        {label}
      </span>
    )
  }

  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${color} ${className}`}>{label}</span>
  )
}
