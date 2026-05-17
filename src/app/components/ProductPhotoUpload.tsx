'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import {
  buildCompositePreview,
  emptyPhotoSlots,
  type ProductPhotoMode,
} from '@/lib/productPhotoComposite'

type Props = {
  mode: ProductPhotoMode
  onModeChange: (mode: ProductPhotoMode) => void
  slots: (File | null)[]
  onSlotsChange: (slots: (File | null)[]) => void
  existingUrl?: string | null
}

const slotClass =
  'relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-pointer hover:border-orange-400 transition flex items-center justify-center'

export function ProductPhotoUpload({
  mode,
  onModeChange,
  slots,
  onSlotsChange,
  existingUrl,
}: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [preview, setPreview] = useState<string>(existingUrl || '')

  useEffect(() => {
    const filled = slots.filter(Boolean) as File[]
    if (filled.length !== mode) {
      if (existingUrl && filled.length === 0) setPreview(existingUrl)
      else if (filled.length === 0) setPreview('')
      return
    }
    let cancelled = false
    buildCompositePreview(filled).then((url) => {
      if (!cancelled) setPreview(url)
    })
    return () => {
      cancelled = true
    }
  }, [slots, mode, existingUrl])

  const setMode = (m: ProductPhotoMode) => {
    onModeChange(m)
    onSlotsChange(emptyPhotoSlots(m))
    setPreview(m === 1 && existingUrl ? existingUrl : '')
  }

  const setSlot = (index: number, file: File | null) => {
    const next = [...slots]
    while (next.length < mode) next.push(null)
    next[index] = file
    onSlotsChange(next.slice(0, mode))
  }

  const modeBtn = (m: ProductPhotoMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition ${
        mode === m
          ? 'bg-orange-500 text-white border-orange-500'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
      }`}
    >
      {label}
    </button>
  )

  const slotBox = (index: number, extraClass: string) => {
    const file = slots[index]
    const thumb = file ? URL.createObjectURL(file) : null

    return (
      <PhotoSlot
        key={`photo-slot-${index}-${file?.name ?? 'e'}`}
        className={`${slotClass} ${extraClass}`}
        onClick={() => inputRefs.current[index]?.click()}
      >
        {thumb ? (
          <>
            <img src={thumb} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                setSlot(index, null)
              }}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400 p-2">
            <Camera className="w-6 h-6 mx-auto mb-0.5" />
            <p className="text-[10px] font-semibold">Foto {index + 1}</p>
          </div>
        )}
        <input
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setSlot(index, f)
            e.target.value = ''
          }}
        />
      </PhotoSlot>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500">Fotos del producto</p>
      <div className="flex gap-2">
        {modeBtn(1, '1 foto')}
        {modeBtn(2, '2 fotos')}
        {modeBtn(4, '4 fotos')}
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        En la tienda se muestra <strong>una sola imagen</strong>. Con 2 o 4 fotos, el sistema las une
        automáticamente.
      </p>

      {mode === 1 && <div className="w-full h-36">{slotBox(0, 'w-full h-full')}</div>}

      {mode === 2 && (
        <div className="grid grid-cols-2 gap-2 h-36">
          {slotBox(0, 'h-full min-h-[120px]')}
          {slotBox(1, 'h-full min-h-[120px]')}
        </div>
      )}

      {mode === 4 && (
        <div className="grid grid-cols-2 gap-2">
          {slotBox(0, 'aspect-square min-h-[80px]')}
          {slotBox(1, 'aspect-square min-h-[80px]')}
          {slotBox(2, 'aspect-square min-h-[80px]')}
          {slotBox(3, 'aspect-square min-h-[80px]')}
        </div>
      )}

      {preview && slots.filter(Boolean).length === mode && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
            Vista previa en tienda
          </p>
          <div className="w-full max-w-[200px] mx-auto aspect-square rounded-lg overflow-hidden border border-gray-200">
            <img src={preview} alt="Vista previa combinada" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoSlot({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div className={className} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  )
}
