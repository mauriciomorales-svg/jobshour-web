import { describe, expect, it } from 'vitest'
import { demandNearbyToMapPoint, expertNearbyToMapPoint } from './mapTypes'

describe('mapTypes', () => {
  it('expertNearbyToMapPoint conserva user_id y pin', () => {
    const p = expertNearbyToMapPoint({
      id: 5,
      user_id: 99,
      pos: { lat: -37.6, lng: -72.5 },
      name: 'Ana',
      store_plan: 'premium',
      store_url: 'https://tienda.cl',
    })
    expect(p.id).toBe(5)
    expect(p.user_id).toBe(99)
    expect(p.pin_type).toBe('premium_store')
  })

  it('demandNearbyToMapPoint marca status demand', () => {
    const p = demandNearbyToMapPoint({
      id: 12,
      pos: { lat: -37.6, lng: -72.5 },
      client_name: 'Cliente',
      offered_price: 5000,
    })
    expect(p.status).toBe('demand')
    expect(p.pin_type).toBe('demand')
    expect(p.name).toBe('Cliente')
  })
})
