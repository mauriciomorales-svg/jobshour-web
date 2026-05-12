import jsPDF from 'jspdf'
import QRCode from 'qrcode'

/** Marca: mismo ecosistema en toda la app */
const BRAND = 'JobsHours'
const BRAND_URL = 'https://jobshours.com'
const BRAND_TAGLINE = 'Servicios, tiendas y lotes listos — todo en un solo ecosistema'

export type BrandedQuotePdfRow = {
  title: string
  quantity: number
  /** Subtotal línea en CLP (entero) */
  amount: number
}

export type BrandedQuotePdfExtra = {
  label: string
  amount: number
}

export type BrandedQuotePdfParams = {
  storeName: string
  workerName: string
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
  rows: BrandedQuotePdfRow[]
  extras?: BrandedQuotePdfExtra[]
  total: number
  expiresAt?: string | null
  publicUrl: string
  quoteId?: number
  statusLabel?: string
  /** Título principal del documento (ej. "Cotización"). Por defecto: Cotización */
  documentTitle?: string
  brandName?: string
  brandTagline?: string
  campaignCta?: string
}

function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function normalizeWhatsApp(phone?: string | null): string | null {
  const raw = (phone ?? '').trim()
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) return digits
  return `+${digits}`
}

async function buildQrDataUrl(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  } catch {
    return null
  }
}

/**
 * PDF listo para compartir; cabecera y pie con marca JobsHours.
 */
export async function downloadBrandedQuotePdf(params: BrandedQuotePdfParams): Promise<void> {
  const {
    storeName,
    workerName,
    buyerName,
    buyerEmail,
    buyerPhone,
    rows,
    extras = [],
    total,
    expiresAt,
    publicUrl,
    quoteId,
    statusLabel,
    documentTitle,
    brandName,
    brandTagline,
    campaignCta,
  } = params

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 14
  const dynamicBrand = brandName?.trim() || BRAND
  const dynamicTagline = brandTagline?.trim() || BRAND_TAGLINE
  const dynamicCta = campaignCta?.trim() || 'Escanea y revisa esta oferta ahora'
  const docTitle = (documentTitle ?? '').trim() || 'Cotización'
  let y = 12

  // Franja marca
  pdf.setFillColor(249, 115, 22)
  pdf.rect(0, 0, pageW, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(dynamicBrand, margin, y)
  pdf.setFontSize(8.5)
  pdf.setFont('helvetica', 'normal')
  const tagLines = pdf.splitTextToSize(dynamicTagline, pageW - margin * 2)
  y = 18
  pdf.text(tagLines, margin, y)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(BRAND_URL.replace('https://', ''), margin, 28)

  y = 40
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(docTitle, margin, y)
  y += 7
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Tienda: ${storeName}`, margin, y)
  y += 5
  pdf.text(`Vendedor: ${workerName}`, margin, y)
  y += 6
  if (quoteId != null) {
    pdf.setFontSize(9)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Referencia #${quoteId}`, margin, y)
    y += 5
  }
  if (statusLabel) {
    pdf.text(`Estado: ${statusLabel}`, margin, y)
    y += 5
  }
  pdf.setTextColor(15, 23, 42)
  y += 3
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Datos del comprador', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Nombre: ${buyerName}`, margin, y)
  y += 4
  pdf.text(`Correo: ${buyerEmail}`, margin, y)
  y += 4
  const wa = normalizeWhatsApp(buyerPhone)
  pdf.text(`WhatsApp: ${wa ?? 'No informado'}`, margin, y)
  if (wa) {
    y += 4
    const waLink = `https://wa.me/${wa.replace(/[^\d]/g, '')}`
    pdf.setTextColor(14, 116, 144)
    pdf.textWithLink('Abrir chat por WhatsApp', margin, y, { url: waLink })
    pdf.setTextColor(15, 23, 42)
  }
  y += 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('Detalle', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)

  const colItem = margin
  const colAmt = pageW - margin

  for (const row of rows) {
    if (y > 248) {
      pdf.addPage()
      y = 16
    }
    const title = `${row.quantity}× ${row.title}`
    const lines = pdf.splitTextToSize(title, colAmt - colItem - 36)
    pdf.text(lines, colItem, y)
    pdf.setFont('helvetica', 'bold')
    pdf.text(formatMoney(row.amount), colAmt, y, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    y += Math.max(5, lines.length * 4.2)
  }

  for (const ex of extras) {
    if (y > 250) {
      pdf.addPage()
      y = 16
    }
    pdf.setFont('helvetica', 'normal')
    pdf.text(ex.label, colItem, y)
    pdf.setFont('helvetica', 'bold')
    pdf.text(formatMoney(ex.amount), colAmt, y, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    y += 5
  }

  y += 4
  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, y, pageW - margin, y)
  y += 8
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(249, 115, 22)
  pdf.text('Total', margin, y)
  pdf.text(formatMoney(total), colAmt, y, { align: 'right' })
  pdf.setTextColor(15, 23, 42)
  y += 10

  const qrDataUrl = await buildQrDataUrl(publicUrl)
  const qrBoxY = y
  const qrSize = 34
  const qrX = pageW - margin - qrSize
  if (qrDataUrl) {
    pdf.setDrawColor(226, 232, 240)
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(qrX - 3, qrBoxY - 3, qrSize + 6, qrSize + 6, 2, 2, 'FD')
    pdf.addImage(qrDataUrl, 'PNG', qrX, qrBoxY, qrSize, qrSize)
  }
  pdf.setFontSize(9)
  pdf.setTextColor(51, 65, 85)
  pdf.setFont('helvetica', 'bold')
  const qrLeadMaxW = pageW - margin * 2 - (qrDataUrl ? qrSize + 10 : 0)
  const qrLead = pdf.splitTextToSize(dynamicCta, qrLeadMaxW)
  pdf.text(qrLead, margin, qrBoxY + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const publicUrlLines = pdf.splitTextToSize(publicUrl, qrLeadMaxW)
  pdf.text(publicUrlLines, margin, qrBoxY + 13)
  y = qrBoxY + Math.max(qrSize + 8, 22)

  if (expiresAt) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Válido hasta: ${new Date(expiresAt).toLocaleString('es-CL')}`, margin, y)
    y += 6
  }

  pdf.setTextColor(51, 65, 85)
  pdf.setFontSize(8)
  const linkLines = pdf.splitTextToSize(`Link para revisar o pagar (compartir): ${publicUrl}`, pageW - margin * 2)
  if (y + linkLines.length * 4 > 235) {
    pdf.addPage()
    y = 16
  }
  pdf.text(linkLines, margin, y)
  y += linkLines.length * 4 + 8

  // Pie en cada página — marca JobsHours (ecosistema unificado)
  const pageCount = pdf.getNumberOfPages()
  const footerStr = `${dynamicBrand} · ${dynamicTagline} · ${BRAND_URL}`
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p)
    pdf.setFontSize(6.5)
    pdf.setTextColor(148, 163, 184)
    pdf.setFont('helvetica', 'normal')
    const footLines = pdf.splitTextToSize(footerStr, pageW - margin * 2)
    let fy = 297 - 5 - footLines.length * 3
    pdf.text(footLines, margin, fy)
  }
  pdf.setPage(pageCount)

  const safeId = quoteId != null ? String(quoteId) : 'lote'
  const safeBrand = dynamicBrand.replace(/[^\w-]+/g, '-')
  const fname = `${safeBrand}-lote-${safeId}-${new Date().toISOString().slice(0, 10)}.pdf`
  pdf.save(fname)
}
