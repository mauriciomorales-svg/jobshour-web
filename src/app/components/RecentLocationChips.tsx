'use client'

import { useEffect, useState } from 'react'
import { formatRecentLocationChip, getRecentLocations, type RecentLocation } from '@/lib/formAssist'

interface Props {
  onPick: (entry: RecentLocation) => void
  className?: string
}

export default function RecentLocationChips({ onPick, className = '' }: Props) {
  const [items, setItems] = useState<RecentLocation[]>([])

  useEffect(() => {
    setItems(getRecentLocations(5))
  }, [])

  if (items.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <span className="text-[10px] text-slate-500 w-full">Recientes:</span>
      {items.map((entry) => (
        <button
          key={`${entry.label}-${entry.usedAt}`}
          type="button"
          onClick={() => onPick(entry)}
          className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:border-teal-500/50 hover:text-teal-200 transition"
          title={entry.label}
        >
          📍 {formatRecentLocationChip(entry.label)}
        </button>
      ))}
    </div>
  )
}
