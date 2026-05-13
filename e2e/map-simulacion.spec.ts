import { test, expect, type Page } from '@playwright/test'

/** Centro dentro de la zona típica de demo (sur de Chile). */
const GEO = { latitude: -37.6672, longitude: -72.573 }

function apiV1Root(): string {
  if (process.env.PLAYWRIGHT_API_ROOT) {
    return process.env.PLAYWRIGHT_API_ROOT.replace(/\/$/, '')
  }
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3002'
  const origin = new URL(base).origin
  return `${origin}/api/v1`
}

/** Onboarding full-screen bloquea el mapa hasta Saltar / Empezar. */
async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  try {
    await page.getByRole('button', { name: 'Saltar' }).click({ timeout: 5000 })
  } catch {
    // Sin onboarding o ya cerrado
  }
}

/** Mapa listo cuando hay contenedor y al menos un tile OSM (sin depender de APIs internas de Leaflet). */
async function waitForMapTiles(page: Page): Promise<void> {
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 90_000 })
  await page
    .locator('.leaflet-container .leaflet-tile-pane img')
    .first()
    .waitFor({ state: 'visible', timeout: 90_000 })
}

async function wheelZoomIn(page: Page): Promise<void> {
  const leaflet = page.locator('.leaflet-container').first()
  await leaflet.hover()
  await page.mouse.wheel(0, -400)
  await page.mouse.wheel(0, -400)
}

test.describe('Simulación checklist — solo mapa', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('M1–M4 + G1 + I1–I4: carga mapa, geo simulada, zoom, pan, recarga', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3002').origin
    await context.grantPermissions(['geolocation'], { origin })
    await context.setGeolocation(GEO)

    const goto = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 90_000 })
    expect(goto?.ok()).toBeTruthy()

    await dismissOnboardingIfPresent(page)
    await waitForMapTiles(page)

    await wheelZoomIn(page)

    const leaflet = page.locator('.leaflet-container').first()
    const box = await leaflet.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      await page.mouse.move(cx, cy)
      await page.mouse.down()
      await page.mouse.move(cx + 100, cy + 50)
      await page.mouse.up()
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
    await dismissOnboardingIfPresent(page)
    await waitForMapTiles(page)
  })

  test('G2 aproximado: sin permiso explícito de geolocalización el mapa monta', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000)
    await context.clearPermissions()
    await context.setGeolocation(GEO)

    const goto = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 90_000 })
    expect(goto?.ok()).toBeTruthy()
    await dismissOnboardingIfPresent(page)
    await waitForMapTiles(page)
  })

  test('L2 API: experts/nearby responde para coordenadas demo', async ({ request }) => {
    const root = apiV1Root()
    const res = await request.get(
      `${root}/experts/nearby?lat=${GEO.latitude}&lng=${GEO.longitude}&radius=50`
    )
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })
})
