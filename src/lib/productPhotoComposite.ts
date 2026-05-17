/** Vista previa cliente: 1, 2 (lado a lado) o 4 (2x2) en un solo data URL. */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen'))
    }
    img.src = url
  })
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const sw = img.naturalWidth
  const sh = img.naturalHeight
  const scale = Math.max(dw / sw, dh / sh)
  const rw = sw * scale
  const rh = sh * scale
  const sx = (rw - dw) / 2
  const sy = (rh - dh) / 2
  ctx.drawImage(img, -sx, -sy, rw, rh, dx, dy, dw, dh)
}

export async function buildCompositePreview(files: File[]): Promise<string> {
  const list = files.filter(Boolean)
  const n = list.length
  if (n === 0) return ''
  if (n === 1) return URL.createObjectURL(list[0])

  const size = 480
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return URL.createObjectURL(list[0])

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  const imgs = await Promise.all(list.map(loadImage))

  if (n === 2) {
    const half = size / 2
    drawCover(ctx, imgs[0], 0, 0, half, size)
    drawCover(ctx, imgs[1], half, 0, half, size)
  } else if (n === 4) {
    const half = size / 2
    drawCover(ctx, imgs[0], 0, 0, half, half)
    drawCover(ctx, imgs[1], half, 0, half, half)
    drawCover(ctx, imgs[2], 0, half, half, half)
    drawCover(ctx, imgs[3], half, half, half, half)
  }

  return canvas.toDataURL('image/jpeg', 0.88)
}

export type ProductPhotoMode = 1 | 2 | 4

export function emptyPhotoSlots(mode: ProductPhotoMode): (File | null)[] {
  return Array.from({ length: mode }, () => null)
}

export function validatePhotoSlots(mode: ProductPhotoMode, slots: (File | null)[]): string | null {
  const filled = slots.filter(Boolean).length
  if (filled !== mode) {
    return `Debes subir exactamente ${mode} foto${mode > 1 ? 's' : ''}.`
  }
  return null
}

export async function uploadProductPhotos(
  inventarioApi: string,
  codigo: string,
  slots: (File | null)[],
  token?: string | null
): Promise<void> {
  const files = slots.filter((f): f is File => f != null)
  if (files.length === 0) return

  const fd = new FormData()
  if (files.length === 1) {
    fd.append('foto', files[0])
  } else {
    files.forEach((f) => fd.append('fotos[]', f))
  }

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const r = await fetch(
    `${inventarioApi}/productos/${encodeURIComponent(codigo)}/foto`,
    { method: 'POST', headers, body: fd }
  )
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    throw new Error(data?.message || 'Error al subir imagen')
  }
}
