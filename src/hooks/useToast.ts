import { useState, useCallback } from 'react'
import type { ToastMessage, ToastType } from '../app/components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((title: string, type: ToastType = 'info', body?: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, title, type, body, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, removeToast }
}
