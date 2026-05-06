import jsPDF from 'jspdf'
import QRCode from 'qrcode'

const BRAND = 'JobsHours'
const BRAND_URL = 'https://jobshours.com'
const BRAND_TAGLINE = 'Compra y vende productos nuevos o usados con confianza'

export type BrandedProductPdfParams = {
  storeName: string
  sellerName: string
  productName: string
  conditionLabel: string
  price: number
  description?: string | null
  stock?: number | null
  productCode?: string | null
  publicUrl: string
  productImageUrl?: string | null
  template?: 'premium' | 'minimal' | 'oferta'
}

function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

async function buildQrDataUrl(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 260,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  } catch {
    return null
  }
}

export async function downloadBrandedProductPdf(params: BrandedProductPdfParams): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 14
  const template = params.template || 'premium'
  const headerColor = template === 'minimal' ? [51, 65, 85] : template === 'oferta' ? [5, 150, 105] : [249, 115, 22]

  pdf.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  pdf.rect(0, 0, pageW, 36, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.text(BRAND, margin, 14)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const tag = pdf.splitTextToSize(BRAND_TAGLINE, pageW - margin * 2)
  pdf.text(tag, margin, 21)
  pdf.setFont('helvetica', 'bold')
  pdf.text(BRAND_URL.replace('https://', ''), margin, 31)

  let y = 48
  if (params.productImageUrl) {
    try {
      const imageDataUrl = await (async () => {
        const r = await fetch(params.productImageUrl as string)
        const b = await r.blob()
        return await new Promise<string>((resolve, reject) => {
          const fr = new FileReader()
          fr.onloadend = () => resolve(String(fr.result || ''))
          fr.onerror = () => reject(new Error('image read failed'))
          fr.readAsDataURL(b)
        })
      })()
      pdf.addImage(imageDataUrl, 'JPEG', margin, y, pageW - margin * 2, 70)
      y += 78
    } catch {
      // ignore image failures
    }
  }

  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  const title = pdf.splitTextToSize(params.productName, pageW - margin * 2)
  pdf.text(title, margin, y)
  y += Math.max(12, title.length * 7)

  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(margin, y, pageW - margin * 2, 44, 2, 2, 'S')
  y += 8
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Tienda: ${params.storeName}`, margin + 3, y)
  y += 6
  pdf.text(`Vendedor: ${params.sellerName}`, margin + 3, y)
  y += 6
  pdf.text(`Estado: ${params.conditionLabel}`, margin + 3, y)
  y += 6
  pdf.text(`Precio: ${formatMoney(params.price)}`, margin + 3, y)
  y += 6
  if (params.stock != null) {
    pdf.text(`Stock disponible: ${params.stock}`, margin + 3, y)
    y += 6
  }
  if (params.productCode) {
    pdf.text(`Codigo: ${params.productCode}`, margin + 3, y)
  }

  y += 14
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('Descripcion comercial', margin, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const desc = (params.description?.trim() || 'Producto publicado desde JobsHours para venta directa por redes y contacto rapido.')
  const descLines = pdf.splitTextToSize(desc, pageW - margin * 2)
  pdf.text(descLines, margin, y)
  y += descLines.length * 4.5 + 10

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(249, 115, 22)
  pdf.setFontSize(12)
  pdf.text('Escanea y abre la ficha del producto', margin, y)
  pdf.setTextColor(15, 23, 42)

  const qr = await buildQrDataUrl(params.publicUrl)
  if (qr) {
    const qrSize = 36
    const qrX = pageW - margin - qrSize
    const qrY = y - 6
    pdf.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize)
  }
  y += 8
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const linkLines = pdf.splitTextToSize(params.publicUrl, pageW - margin * 2 - 45)
  pdf.text(linkLines, margin, y)

  const footer = `${BRAND} · ${BRAND_TAGLINE} · ${BRAND_URL}`
  pdf.setFontSize(7)
  pdf.setTextColor(148, 163, 184)
  const footLines = pdf.splitTextToSize(footer, pageW - margin * 2)
  pdf.text(footLines, margin, 287)

  const safeName = params.productName.replace(/[^\w-]+/g, '-').slice(0, 40)
  pdf.save(`ficha-${safeName || 'producto'}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
