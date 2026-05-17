import { describe, expect, it } from 'vitest'
import {
  classifyMisSolicitudesTab,
  getChatNextStep,
  getMisSolicitudesEmptyState,
  getWorkerRequestsEmptyState,
  isPendingExpired,
  matchesMisSolicitudesTab,
} from './requestFlow'

describe('requestFlow', () => {
  it('classifies pending as active when fresh', () => {
    const created = new Date(Date.now() - 60_000).toISOString()
    const expires = new Date(Date.now() + 3600_000).toISOString()
    expect(classifyMisSolicitudesTab('pending', created, expires)).toBe('active')
    expect(matchesMisSolicitudesTab('active', 'pending', created, expires)).toBe(true)
  })

  it('archives expired pending', () => {
    const expires = new Date(Date.now() - 1000).toISOString()
    expect(isPendingExpired('pending', expires)).toBe(true)
    expect(classifyMisSolicitudesTab('pending', new Date().toISOString(), expires)).toBe('archived')
  })

  it('returns guided empty states', () => {
    expect(getMisSolicitudesEmptyState('in_progress').title).toContain('curso')
    expect(getWorkerRequestsEmptyState('pending').hint).toMatch(/disponibilidad/i)
  })

  it('suggests chat next step for worker pending', () => {
    const step = getChatNextStep({ status: 'pending', myRole: 'trabajador' })
    expect(step?.title).toMatch(/Responde/)
  })

  it('suggests payment for completed client', () => {
    const step = getChatNextStep({
      status: 'completed',
      myRole: 'cliente',
      paymentStatus: 'pending',
    })
    expect(step?.title).toMatch(/Pago/)
  })
})
