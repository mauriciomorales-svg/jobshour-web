export type ProductCondition = 'nuevo' | 'seminuevo' | 'usado'
export type ProductShareTemplate = 'premium' | 'minimal' | 'oferta'

export function inferProductCondition(input?: string | null): ProductCondition {
  const text = (input || '').toLowerCase()
  if (text.includes('semi') || text.includes('casi nuevo')) return 'seminuevo'
  if (text.includes('usado') || text.includes('2da') || text.includes('segunda')) return 'usado'
  return 'nuevo'
}

export function conditionLabel(cond: ProductCondition): string {
  if (cond === 'seminuevo') return 'Seminuevo'
  if (cond === 'usado') return 'Usado'
  return 'Nuevo'
}

export function buildProductSlug(workerId: number, productId: number, name?: string | null): string {
  const safeName = (name || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'producto'
  return `${workerId}-${productId}-${safeName}`
}

export function parseProductSlug(slug: string): { workerId: number; productId: number } | null {
  const m = slug.match(/^(\d+)-(\d+)-?.*$/)
  if (!m) return null
  return { workerId: Number(m[1]), productId: Number(m[2]) }
}

/** Misma lógica que la tienda: el vendedor marca en la descripción si hace delivery. */
export function extractDeliveryBadgeFromDescription(descripcion?: string | null): { enabled: boolean; fee: number } {
  const raw = (descripcion || '').toLowerCase()
  if (!raw.includes('delivery por vendedor: si')) return { enabled: false, fee: 0 }
  const feeMatch = raw.match(/\(\+\$?([0-9.,]+)/)
  const fee = feeMatch ? Number(String(feeMatch[1]).replace(/[^\d]/g, '')) || 0 : 0
  return { enabled: true, fee }
}

export function marketingCopyByCategory(name: string, description?: string | null): string {
  const text = `${name} ${description || ''}`.toLowerCase()
  if (/(zapat|polera|chaqueta|jean|ropa)/.test(text)) {
    return 'Ideal para renovar tu look con una compra segura y rapida.'
  }
  if (/(repuesto|motor|auto|filtro|bateria|llanta)/.test(text)) {
    return 'Repuesto listo para instalar y mover tu proyecto sin demoras.'
  }
  if (/(sillon|mesa|hogar|cocina|lampara|decor)/.test(text)) {
    return 'Perfecto para mejorar tu hogar con estilo y ahorro.'
  }
  return 'Publicacion optimizada para vender mas rapido desde JobsHours.'
}
