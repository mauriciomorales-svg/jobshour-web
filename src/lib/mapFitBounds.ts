/** Utilidades para centrar el mapa en pines (workers / demandas). */

export function mapPointsToCoords(
  points: { pos?: { lat: number; lng: number } }[],
): [number, number][] {
  const out: [number, number][] = []
  for (const p of points) {
    const lat = p.pos?.lat
    const lng = p.pos?.lng
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) > 0.01
    ) {
      out.push([lat, lng])
    }
  }
  return out
}

export function centroidOfCoords(coords: [number, number][]): [number, number] | null {
  if (coords.length === 0) return null
  let slat = 0
  let slng = 0
  for (const [lat, lng] of coords) {
    slat += lat
    slng += lng
  }
  return [slat / coords.length, slng / coords.length]
}
