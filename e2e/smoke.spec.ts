import { test, expect } from '@playwright/test'

test.describe('smoke (requiere servidor Next en baseURL)', () => {
  test('GET / responde OK', async ({ request }) => {
    const res = await request.get('/')
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/health devuelve JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('ok', true)
  })
})
