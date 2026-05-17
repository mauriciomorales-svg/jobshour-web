import { describe, expect, it } from 'vitest'
import {
  formatRecentLocationChip,
  suggestNextDepartureLocal,
  suggestScheduledLocal,
  toDatetimeLocalValue,
} from './formAssist'

describe('formAssist', () => {
  it('suggestNextDepartureLocal returns future datetime-local string', () => {
    const v = suggestNextDepartureLocal(30)
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    const d = new Date(v)
    expect(d.getTime()).toBeGreaterThan(Date.now())
  })

  it('suggestScheduledLocal rounds to next hour', () => {
    const v = suggestScheduledLocal()
    const d = new Date(v)
    expect(d.getMinutes()).toBe(0)
  })

  it('toDatetimeLocalValue is reversible format', () => {
    const d = new Date('2026-05-15T14:37:00')
    expect(toDatetimeLocalValue(d)).toMatch(/T\d{2}:\d{2}$/)
  })

  it('truncates long location chips', () => {
    const long = 'A'.repeat(40)
    expect(formatRecentLocationChip(long, 20).length).toBeLessThanOrEqual(20)
  })
})
