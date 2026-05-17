'use client'

import { surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

interface Props {
  open: boolean
  onClose: () => void
  onGoProfile: () => void
}

/** Perfil mínimo (foto + nombre) antes de chatear o publicar. */
export default function ProfileRequiredModal({ open, onClose, onGoProfile }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[550] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 text-center text-4xl">👤</div>
        <h2 className="text-center text-lg font-black text-white">Completá tu perfil</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-400">
          Para contactar trabajadores o publicar necesitamos tu <strong className="text-white">nombre</strong> y una{' '}
          <strong className="text-white">foto</strong>. Solo toma un minuto.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onGoProfile} className={uiTone.ctaFormSaveWide}>
            Ir a mi perfil
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            {surfaceCopy.close}
          </button>
        </div>
      </div>
    </div>
  )
}
