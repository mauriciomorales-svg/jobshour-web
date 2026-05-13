'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BrowserCodeReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { X, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  /** Se llama con el texto leído (EAN, Code128, etc.) */
  onDetected: (code: string) => void
}

const BARCODE_HINTS = new Map<DecodeHintType, BarcodeFormat[]>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ],
  ],
])

export default function BarcodeScanModal({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onDetectedRef = useRef(onDetected)
  const onCloseRef = useRef(onClose)
  const [camError, setCamError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setCamError('')
      setStarting(false)
      return
    }

    const video = videoRef.current
    if (!video) return

    setCamError('')
    setStarting(true)

    const reader = new BrowserMultiFormatReader(BARCODE_HINTS)
    const controlsRef = { current: null as { stop: () => void } | null }
    let cancelled = false

    reader
      .decodeFromVideoDevice(undefined, video, (result, err, ctrls) => {
        if (cancelled) return
        if (result) {
          const text = result.getText().trim()
          if (text) {
            try {
              ctrls.stop()
            } catch {
              /* ignore */
            }
            onDetectedRef.current(text)
            onCloseRef.current()
          }
          return
        }
        if (err && !(err instanceof NotFoundException)) {
          setCamError(typeof err.message === 'string' ? err.message : 'No se pudo leer desde la cámara')
        }
      })
      .then((c) => {
        if (!cancelled) {
          controlsRef.current = c
          setStarting(false)
        } else {
          try {
            c.stop()
          } catch {
            /* ignore */
          }
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setStarting(false)
          const msg = e instanceof Error ? e.message : 'Permiso de cámara denegado o no disponible'
          setCamError(msg)
        }
      })

    return () => {
      cancelled = true
      setStarting(false)
      try {
        controlsRef.current?.stop()
      } catch {
        /* ignore */
      }
      controlsRef.current = null
      try {
        BrowserCodeReader.releaseAllStreams()
      } catch {
        /* ignore */
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[350] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white shrink-0">
        <div>
          <p className="font-black text-sm">Escanear código</p>
          <p className="text-[11px] text-white/70">Apuntá al código de barras del producto</p>
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
          aria-label="Cerrar escáner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        {starting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-semibold">Iniciando cámara…</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-28 border-2 border-orange-400/90 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>

      {camError && (
        <div className="shrink-0 mx-4 mb-3 rounded-xl bg-red-950/90 border border-red-500/50 px-3 py-2 text-xs text-red-100">
          {camError}
        </div>
      )}

      <div className="shrink-0 p-4 bg-black/80">
        <button
          type="button"
          onClick={() => onClose()}
          className="w-full py-3 rounded-xl bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition"
        >
          Escribir manualmente
        </button>
      </div>
    </div>
  )
}
