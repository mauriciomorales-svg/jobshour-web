import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_LAT,
  DEFAULT_MAP_LNG,
  escapeRenaicoDeadZone,
  haversineKm,
  normalizeStoredMapCoords,
} from './mapStorage'

describe('mapStorage helpers', () => {
  it('haversineKm calcula distancia razonable', () => {
    const km = haversineKm(-37.798, -72.708, -37.6672, -72.573)
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(30)
  })

  it('normalizeStoredMapCoords aleja ancla Renaico legacy', () => {
    const out = normalizeStoredMapCoords(-37.6672, -72.573)
    expect(out.lat).toBe(DEFAULT_MAP_LAT)
    expect(out.lng).toBe(DEFAULT_MAP_LNG)
  })

  it('escapeRenaicoDeadZone redirige zona Renaico a Angol', () => {
    const out = escapeRenaicoDeadZone(-37.67, -72.57)
    expect(out.lat).toBe(DEFAULT_MAP_LAT)
    expect(out.lng).toBe(DEFAULT_MAP_LNG)
  })

  it('escapeRenaicoDeadZone respeta coords lejanas', () => {
    const out = escapeRenaicoDeadZone(-33.45, -70.66)
    expect(out.lat).toBe(-33.45)
    expect(out.lng).toBe(-70.66)
  })
})
