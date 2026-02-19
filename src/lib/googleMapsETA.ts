/**
 * Calcula ETA usando Google Maps Directions API si está disponible,
 * o fallback a cálculo simple basado en distancia
 */

interface ETAResult {
  duration: number // en minutos
  distance: number // en km
  method: 'google' | 'simple'
}

export async function calculateETA(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<ETAResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Si hay API key de Google Maps, usar Directions API
  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${originLat},${originLng}&` +
        `destination=${destLat},${destLng}&` +
        `key=${apiKey}&` +
        `mode=driving&` +
        `language=es&` +
        `units=metric`
      )

      const data = await response.json()

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]
        
        return {
          duration: Math.round(leg.duration.value / 60), // convertir segundos a minutos
          distance: leg.distance.value / 1000, // convertir metros a km
          method: 'google',
        }
      }
    } catch (error) {
      console.warn('Error usando Google Maps Directions API, usando cálculo simple:', error)
    }
  }

  // Fallback: cálculo simple basado en distancia
  const distance = calculateHaversineDistance(originLat, originLng, destLat, destLng)
  // Asumir velocidad promedio de 30 km/h en ciudad
  const duration = Math.round(distance * 2) // 2 minutos por km

  return {
    duration,
    distance,
    method: 'simple',
  }
}

function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
