import jsPDF from 'jspdf'

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
}

function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

/**
 * PDF listo para compartir; cabecera y pie con marca JobsHours.
 */
export function downloadBrandedQuotePdf(params: BrandedQuotePdfParams): void {
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
  } = params

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 14
  let y = 12

  // Franja marca
  pdf.setFillColor(249, 115, 22)
  pdf.rect(0, 0, pageW, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(BRAND, margin, y)
  pdf.setFontSize(8.5)
  pdf.setFont('helvetica', 'normal')
  const tagLines = pdf.splitTextToSize(BRAND_TAGLINE, pageW - margin * 2)
  y = 18
  pdf.text(tagLines, margin, y)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(BRAND_URL.replace('https://', ''), margin, 28)

  y = 40
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Lote listo', margin, y)
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
  pdf.text(`${buyerName}`, margin, y)
  y += 4
  pdf.text(buyerEmail, margin, y)
  if (buyerPhone?.trim()) {
    y += 4
    pdf.text(buyerPhone.trim(), margin, y)
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
  const footerStr = `${BRAND} · ${BRAND_TAGLINE} · ${BRAND_URL}`
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
  const fname = `${BRAND}-lote-${safeId}-${new Date().toISOString().slice(0, 10)}.pdf`
  pdf.save(fname)
}
