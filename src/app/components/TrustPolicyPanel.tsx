'use client'

import { useState } from 'react'
import { TRUST_POLICY_SECTIONS } from '@/lib/trustPolicy'
import LegalSupportLinks from './LegalSupportLinks'

/** Políticas breves de cancelación, pago e incidencias. */
export default function TrustPolicyPanel({ className = '' }: { className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className={`rounded-2xl border border-slate-700 bg-slate-800/60 p-3 space-y-2 ${className}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Confianza y reglas</p>
      {TRUST_POLICY_SECTIONS.map((section) => {
        const isOpen = openId === section.id
        return (
          <div key={section.id} className="rounded-xl border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-slate-800 hover:bg-slate-750 transition"
            >
              <span className="text-sm font-bold text-slate-200">{section.title}</span>
              <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <ul className="px-3 pb-3 pt-0 space-y-1.5 text-xs text-slate-400 leading-relaxed list-disc list-inside">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <LegalSupportLinks variant="dark" className="text-[11px] pt-1" />
    </div>
  )
}
