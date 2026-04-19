import { describe, expect, it } from 'vitest'
import {
  formatContactsFoundJobsHours,
  formatSaveSkillsLabel,
  labelIntegratedQuoteStatus,
  labelStoreOrderStatus,
  mpPaymentLabel,
  storeOrderStatusCopy,
  surfaceCopy,
} from './userFacingCopy'

describe('userFacingCopy', () => {
  it('labels store order statuses in Spanish', () => {
    expect(labelStoreOrderStatus('paid')).toBe(storeOrderStatusCopy.paid.label)
    expect(labelStoreOrderStatus('unknown_status')).toBe('unknown_status')
  })

  it('labels MP payment status', () => {
    expect(mpPaymentLabel('approved')).toMatch(/aprobado/i)
    expect(mpPaymentLabel(null)).toMatch(/sin información/i)
  })

  it('labels integrated quote statuses', () => {
    expect(labelIntegratedQuoteStatus('quote_sent')).toMatch(/comprador/i)
  })

  it('exposes shared surface copy for nav and modals', () => {
    expect(surfaceCopy.navMyOrders.length).toBeGreaterThan(0)
    expect(surfaceCopy.copyLink).toMatch(/copiar/i)
  })

  it('formats contacts-found string consistently', () => {
    expect(formatContactsFoundJobsHours(3)).toContain('3')
    expect(formatContactsFoundJobsHours(3)).toMatch(/JobsHours/i)
  })

  it('formats save-skills label with singular/plural', () => {
    expect(formatSaveSkillsLabel(1)).toMatch(/habilidad$/)
    expect(formatSaveSkillsLabel(2)).toMatch(/habilidades/)
  })
})
