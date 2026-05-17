export const INVENTARIO_API = '/inventario'

export function formatPrice(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export function buildPublicProductUrl(workerId: number, productId: number, productName?: string | null): string {
  const safeName = (productName || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'producto'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jobshours.com'
  return `${origin}/p/${workerId}-${productId}-${safeName}`
}
