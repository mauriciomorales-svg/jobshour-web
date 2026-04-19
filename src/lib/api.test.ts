import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublicApiBase } from './api'

describe('getPublicApiBase', () => {
  const origEnv = process.env.NEXT_PUBLIC_API_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = origEnv
    vi.unstubAllGlobals()
  })

  it('en cliente usa el origen real cuando NEXT_PUBLIC_* apunta a localhost', () => {
    vi.stubGlobal('window', { location: { origin: 'https://jobshours.com' } })
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8095/api'
    expect(getPublicApiBase()).toBe('https://jobshours.com')
  })

  it('en cliente usa la URL pública cuando no es localhost', () => {
    vi.stubGlobal('window', { location: { origin: 'https://jobshours.com' } })
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api'
    expect(getPublicApiBase()).toBe('https://api.example.com')
  })

  it('sin window (SSR) con localhost cae al fallback conocido', () => {
    vi.stubGlobal('window', undefined)
    process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8095/api'
    expect(getPublicApiBase()).toBe('https://jobshour.dondemorales.cl')
  })

  it('sin window y URL vacía usa fallback', () => {
    vi.stubGlobal('window', undefined)
    process.env.NEXT_PUBLIC_API_URL = ''
    expect(getPublicApiBase()).toBe('https://jobshour.dondemorales.cl')
  })
})
