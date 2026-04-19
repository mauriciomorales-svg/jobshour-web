'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { surfaceCopy } from '@/lib/userFacingCopy'

export type ModalShellVariant = 'bottomSheet' | 'floating'

type Props = {
  onClose: () => void
  titleId: string
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  variant?: ModalShellVariant
  showDragHandle?: boolean
  bodyClassName?: string
  panelClassName?: string
}

/**
 * Overlay + panel con header unificado (JobsHours · slate).
 */
export function ModalShell({
  onClose,
  titleId,
  title,
  subtitle,
  children,
  footer,
  variant = 'bottomSheet',
  showDragHandle,
  bodyClassName = '',
  panelClassName = '',
}: Props) {
  const handle = showDragHandle ?? variant === 'bottomSheet'

  const wrapperClass =
    variant === 'bottomSheet'
      ? 'fixed inset-0 z-[400] flex items-end justify-center'
      : 'fixed inset-0 z-[400] flex items-end justify-center sm:items-center sm:p-4'

  const panelBase =
    variant === 'bottomSheet'
      ? 'relative z-10 w-full max-w-md bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'
      : 'relative z-10 w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800 max-h-[90vh]'

  return (
    <div className={wrapperClass} role="presentation">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label={surfaceCopy.ariaCloseOverlay}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${panelBase} ${panelClassName}`}
      >
        {handle && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-700 rounded-full" aria-hidden />
          </div>
        )}

        <div
          className={`flex items-center justify-between px-5 shrink-0 border-b border-slate-800 ${
            handle ? 'pt-1 pb-3' : 'pt-4 pb-3'
          }`}
        >
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="text-lg font-black text-white">
              {title}
            </h2>
            {subtitle != null && subtitle !== '' && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={surfaceCopy.close}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" aria-hidden />
          </button>
        </div>

        <div className={`overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

        {footer != null && <div className="shrink-0 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}
