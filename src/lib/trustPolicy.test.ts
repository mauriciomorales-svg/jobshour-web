import { describe, expect, it } from 'vitest'
import {
  CLIENT_DISPUTE_REASONS,
  disputeReasonLabel,
  TRUST_POLICY_SECTIONS,
} from './trustPolicy'

describe('trustPolicy', () => {
  it('expone secciones de política', () => {
    expect(TRUST_POLICY_SECTIONS.length).toBeGreaterThanOrEqual(3)
    expect(TRUST_POLICY_SECTIONS[0].bullets.length).toBeGreaterThan(0)
  })

  it('mapea etiquetas de motivo de disputa', () => {
    expect(disputeReasonLabel('no_show')).toBe(CLIENT_DISPUTE_REASONS[0].label)
  })
})
