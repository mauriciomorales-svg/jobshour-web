/**
 * Persistencia de vista del mapa (localStorage) y migración desde versiones antiguas.
 * Angol por defecto — no Renaico.
 */

/** Mapa y búsqueda por defecto: Angol (no Renaico). `user_lat`/`user_lng` guardan GPS del perfil — no deben pisar solos el mapa. */
export const DEFAULT_MAP_LAT = -37.798
export const DEFAULT_MAP_LNG = -72.708

/** v4: nueva capa de claves; migración desde v3. */
export const LS_MAP_VIEW_LAT = 'jobs_map_view_lat_v4'
export const LS_MAP_VIEW_LNG = 'jobs_map_view_lng_v4'

const LS_MAP_VIEW_LAT_V3 = 'jobs_map_view_lat_v3'
const LS_MAP_VIEW_LNG_V3 = 'jobs_map_view_lng_v3'
const LS_MAP_VIEW_LAT_V2 = 'jobs_map_view_lat_v2'
const LS_MAP_VIEW_LNG_V2 = 'jobs_map_view_lng_v2'
const LS_MAP_VIEW_LAT_LEGACY = 'jobs_map_view_lat'
const LS_MAP_VIEW_LNG_LEGACY = 'jobs_map_view_lng'

/** Antiguo ancla de la app (plaza Renaico). Si la vista guardada sigue cerca, abrimos en Angol para poder ir a otra ciudad. */
const LEGACY_RENAICO_LAT = -37.6672
const LEGACY_RENAICO_LNG = -72.573
/** Coincidencia numérica con el pixel viejo en LS. */
const LEGACY_MATCH_EPS = 0.025
/**
 * Todo el corredor antiguo Renaico ↔ Angol (~19 km). Por debajo = guardamos/abrimos Angol centro.
 * Con 10 km seguían quedando puntos “al medio” y al recargar parecía que volvías a Renaico.
 */
const RENAICO_DEAD_ZONE_KM = 22

/** Subir en cada migración agresiva; si no coincide → nukeStaleMapLS borra datos viejos. */
const LS_MAP_LS_VER_KEY = 'jobs_map_ls_ver'
const LS_MAP_LS_VER = '7'

/** Toda clave que pueda fijar el mapa en Renaico o en coords viejas. */
const MAP_LS_KEYS_ALL = [
  LS_MAP_VIEW_LAT,
  LS_MAP_VIEW_LNG,
  LS_MAP_VIEW_LAT_V3,
  LS_MAP_VIEW_LNG_V3,
  LS_MAP_VIEW_LAT_V2,
  LS_MAP_VIEW_LNG_V2,
  LS_MAP_VIEW_LAT_LEGACY,
  LS_MAP_VIEW_LNG_LEGACY,
  'jobs_map_view_lat_v1',
  'jobs_map_view_lng_v1',
  LS_MAP_LS_VER_KEY,
  'user_lat',
  'user_lng',
] as const

export function clearMapLocalStorageFull() {
  if (typeof window === 'undefined') return
  try {
    MAP_LS_KEYS_ALL.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Abre la app con `?reset_map=1` para volver a Angol sin consola (antes de leer el mapa). */
function applyResetMapQueryParamOnce() {
  if (typeof window === 'undefined') return
  try {
    const u = new URL(window.location.href)
    if (u.searchParams.get('reset_map') !== '1') return
    clearMapLocalStorageFull()
    u.searchParams.delete('reset_map')
    const q = u.searchParams.toString()
    window.history.replaceState({}, '', u.pathname + (q ? `?${q}` : '') + u.hash)
  } catch {
    /* ignore */
  }
}

applyResetMapQueryParamOnce()

/**
 * Si el LS no tiene la marca de versión actual → borra TODAS las claves viejas de mapa.
 * Garantiza reset aunque el browser esté sirviendo JS viejo (SW caché).
 */
function nukeStaleMapLS() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_LS_VER_KEY) === LS_MAP_LS_VER) return
    ;[
      'jobs_map_view_lat_v4',
      'jobs_map_view_lng_v4',
      'jobs_map_view_lat_v3',
      'jobs_map_view_lng_v3',
      'jobs_map_view_lat_v2',
      'jobs_map_view_lng_v2',
      'jobs_map_view_lat',
      'jobs_map_view_lng',
      'jobs_map_view_lat_v1',
      'jobs_map_view_lng_v1',
    ].forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(LS_MAP_LS_VER_KEY, LS_MAP_LS_VER)
  } catch {
    /* ignore */
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/** Vista guardada demasiado pegada al antiguo centro Renaico → Angol (resto de ciudades no toca). */
function escapeRenaicoDeadZone(lat: number, lng: number): { lat: number; lng: number } {
  const d = haversineKm(lat, lng, LEGACY_RENAICO_LAT, LEGACY_RENAICO_LNG)
  if (d <= RENAICO_DEAD_ZONE_KM) {
    return { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  }
  return { lat, lng }
}

function normalizeStoredMapCoords(lat: number, lng: number): { lat: number; lng: number } {
  if (
    Math.abs(lat - LEGACY_RENAICO_LAT) < LEGACY_MATCH_EPS &&
    Math.abs(lng - LEGACY_RENAICO_LNG) < LEGACY_MATCH_EPS
  ) {
    return { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  }
  return { lat, lng }
}

function persistMapViewStorage(lat: number, lng: number) {
  try {
    localStorage.setItem(LS_MAP_VIEW_LAT, String(lat))
    localStorage.setItem(LS_MAP_VIEW_LNG, String(lng))
    localStorage.removeItem(LS_MAP_VIEW_LAT_V3)
    localStorage.removeItem(LS_MAP_VIEW_LNG_V3)
    localStorage.removeItem(LS_MAP_VIEW_LAT_V2)
    localStorage.removeItem(LS_MAP_VIEW_LNG_V2)
    localStorage.removeItem(LS_MAP_VIEW_LAT_LEGACY)
    localStorage.removeItem(LS_MAP_VIEW_LNG_LEGACY)
  } catch {
    /* ignore */
  }
}

function migrateMapViewV3ToV4() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_VIEW_LAT)) return
    const lat = localStorage.getItem(LS_MAP_VIEW_LAT_V3)
    const lng = localStorage.getItem(LS_MAP_VIEW_LNG_V3)
    if (lat && lng) {
      localStorage.setItem(LS_MAP_VIEW_LAT, lat)
      localStorage.setItem(LS_MAP_VIEW_LNG, lng)
    }
  } catch {
    /* ignore */
  }
}

/** Copia v2 → v3 si aún existe (cadena antigua). */
function migrateMapViewV2ToV3() {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(LS_MAP_VIEW_LAT_V3)) return
    const lat = localStorage.getItem(LS_MAP_VIEW_LAT_V2)
    const lng = localStorage.getItem(LS_MAP_VIEW_LNG_V2)
    if (lat && lng) {
      localStorage.setItem(LS_MAP_VIEW_LAT_V3, lat)
      localStorage.setItem(LS_MAP_VIEW_LNG_V3, lng)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Centro inicial del mapa.
 * - nukeStaleMapLS borra datos de versiones anteriores (primera carga → Angol por defecto).
 * - Si el usuario guardó v4 explícitamente (paneando), se respeta sin escape (puede ser Renaico).
 * - Datos legacy (pre-nukeStaleMapLS) pasan por escapeRenaicoDeadZone como último recurso.
 */
export function readInitialMapCoords(): { lat: number; lng: number } {
  const fallback = { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
  if (typeof window === 'undefined') return fallback
  nukeStaleMapLS() // borra datos viejos de versiones anteriores; primera carga abre en Angol
  migrateMapViewV2ToV3()
  migrateMapViewV3ToV4()
  try {
    const readRaw = (latKey: string, lngKey: string): { lat: number; lng: number } | null => {
      const ml = localStorage.getItem(latKey)
      const mg = localStorage.getItem(lngKey)
      if (!ml || !mg) return null
      const lat = parseFloat(ml)
      const lng = parseFloat(mg)
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null
      if (Math.abs(lat) < 1 || Math.abs(lat) > 90) return null
      return { lat, lng }
    }

    // v4 = guardado por el usuario en esta versión: respetar sin escape (incluso Renaico),
    // EXCEPTO si es exactamente el ancla hardcodeada (-37.6672,-72.573) que guardó código viejo.
    const v4 = readRaw(LS_MAP_VIEW_LAT, LS_MAP_VIEW_LNG)
    if (v4) return normalizeStoredMapCoords(v4.lat, v4.lng)

    // Legacy (pre-nukeStaleMapLS): aplicar escape por si acaso queda algún dato viejo de Renaico
    const legacy = readRaw(LS_MAP_VIEW_LAT_LEGACY, LS_MAP_VIEW_LNG_LEGACY)
    if (!legacy) return fallback
    const norm = normalizeStoredMapCoords(legacy.lat, legacy.lng)
    const escaped = escapeRenaicoDeadZone(norm.lat, norm.lng)
    persistMapViewStorage(escaped.lat, escaped.lng)
    return escaped
  } catch {
    /* ignore */
  }
  return fallback
}
