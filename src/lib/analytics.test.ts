import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackEvent } from './analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn(() => true) })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('dispatches jh_analytics with name and payload', () => {
    trackEvent('test_event', { n: 1 })
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1)
    const ev = vi.mocked(window.dispatchEvent).mock.calls[0][0] as CustomEvent
    expect(ev.type).toBe('jh_analytics')
    expect(ev.detail.name).toBe('test_event')
    expect(ev.detail.payload).toEqual({ n: 1 })
    expect(typeof ev.detail.t).toBe('number')
  })

  it('no-op si no hay window', () => {
    vi.stubGlobal('window', undefined)
    expect(() => trackEvent('x')).not.toThrow()
  })
})

describe('sendAnalyticsIngest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('no hace red si no hay URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_INGEST', '')
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { sendBeacon: undefined })
    const { sendAnalyticsIngest } = await import('./analytics')
    sendAnalyticsIngest({ name: 'x', payload: {}, t: 1 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POST con fetch cuando hay URL y sin sendBeacon', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_INGEST', 'https://api.example.com/collect')
    vi.resetModules()
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', { sendBeacon: undefined })
    vi.stubGlobal('window', { location: { href: 'https://jobshours.com' } })
    const { sendAnalyticsIngest } = await import('./analytics')
    sendAnalyticsIngest({ name: 'ev', payload: { k: 1 }, t: 5 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/collect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'ev', payload: { k: 1 }, t: 5 }),
        keepalive: true,
      })
    )
  })
})
