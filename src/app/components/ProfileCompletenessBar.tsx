'use client'

import { useState } from 'react'
import type { ProfileCompleteness } from '@/hooks/useProfileCompleteness'

interface Props {
  completeness: ProfileCompleteness
  /** Si true, muestra solo la barra sin expandir los pasos */
  compact?: boolean
}

export default function ProfileCompletenessBar({ completeness, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { score, pending, isComplete } = completeness

  const barColor =
    score >= 80 ? 'bg-emerald-500' :
    score >= 50 ? 'bg-amber-500' :
    'bg-red-500'

  const label =
    score >= 80 ? '¡Casi listo!' :
    score >= 50 ? 'Buen comienzo' :
    'Perfil incompleto'

  if (isComplete) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
        <span>✅</span>
        <span className="font-medium">Perfil completo — máxima visibilidad</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      {/* Cabecera siempre visible */}
      <button
        type="button"
        onClick={() => !compact && setExpanded((v) => !v)}
        className={`w-full px-3 py-2.5 flex items-center gap-3 ${compact ? '' : 'hover:bg-gray-100 active:bg-gray-200 transition-colors'}`}
      >
        {/* Barra de progreso */}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <span className="text-xs font-semibold text-gray-700 shrink-0 w-10 text-right">
          {score}%
        </span>

        {!compact && (
          <span className="text-gray-400 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {/* Label */}
      <div className="px-3 pb-1.5 -mt-1">
        <span className={`text-xs font-medium ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
          {label}
        </span>
        {!compact && !expanded && pending.length > 0 && (
          <span className="text-xs text-gray-400 ml-1.5">
            · Falta: {pending[0].label}
            {pending.length > 1 && ` y ${pending.length - 1} más`}
          </span>
        )}
      </div>

      {/* Pasos expandidos */}
      {!compact && expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-gray-100 pt-2 mt-1">
          <p className="text-xs text-gray-500 mb-1">
            Completa estos pasos para aumentar tu visibilidad:
          </p>
          {pending.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              <span className="text-gray-300 text-base leading-none mt-0.5">○</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{step.label}</p>
                <p className="text-xs text-gray-400">{step.hint}</p>
              </div>
            </div>
          ))}
          {completeness.steps.filter((s) => s.done).map((step) => (
            <div key={step.id} className="flex items-start gap-2 opacity-50">
              <span className="text-emerald-500 text-base leading-none mt-0.5">✓</span>
              <p className="text-sm text-gray-500 line-through">{step.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
