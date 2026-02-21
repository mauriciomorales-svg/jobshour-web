'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  body?: string
  duration?: number
}

interface Props {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

const icons: Record<ToastType, JSX.Element> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const styles: Record<ToastType, { bg: string; icon: string; bar: string; shadow: string }> = {
  success: { bg: 'bg-white border-l-4 border-green-500', icon: 'text-green-600 bg-green-100', bar: 'bg-green-500', shadow: 'shadow-green-500/20' },
  error:   { bg: 'bg-red-950 border-l-4 border-red-500 text-white', icon: 'text-red-400 bg-red-900', bar: 'bg-red-400', shadow: 'shadow-red-500/40' },
  warning: { bg: 'bg-amber-950 border-l-4 border-amber-400 text-white', icon: 'text-amber-400 bg-amber-900', bar: 'bg-amber-400', shadow: 'shadow-amber-500/30' },
  info:    { bg: 'bg-white border-l-4 border-blue-500', icon: 'text-blue-600 bg-blue-100', bar: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3500,
  error: 6000,
  warning: 5000,
  info: 3500,
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type]
  const s = styles[toast.type]
  const isError = toast.type === 'error'
  const isWarning = toast.type === 'warning'
  const darkBg = isError || isWarning

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`relative flex items-start gap-3 ${s.bg} rounded-2xl shadow-xl ${s.shadow} px-4 py-3.5 min-w-[300px] max-w-[360px] overflow-hidden transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}>
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-sm font-black leading-tight ${darkBg ? 'text-white' : 'text-gray-900'}`}>{toast.title}</p>
        {toast.body && <p className={`text-xs mt-0.5 leading-snug ${darkBg ? 'text-white/70' : 'text-gray-500'}`}>{toast.body}</p>}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition mt-0.5 ${darkBg ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className={`absolute bottom-0 left-0 h-1 ${s.bar} rounded-full opacity-60`}
        style={{ animation: `shrink ${duration}ms linear forwards` }}
      />
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
