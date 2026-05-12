'use client'

import { useZoneInfo } from '@/hooks/useZoneInfo'

/**
 * Badge informativo que se muestra sobre el mapa cuando el geofencing
 * está activo, para que el founder (o un usuario avanzado) sepa que
 * la app está operando en modo "zona piloto".
 *
 * Solo visible cuando GEOFENCE_ENABLED=true en el servidor.
 */
export default function ZoneBadge() {
  const zone = useZoneInfo()

  if (!zone?.enabled) return null

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
      aria-label={`Zona piloto activa: ${zone.zone_name}`}
    >
      <div className="flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-sm border border-amber-500/60 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span>Zona piloto: {zone.zone_name}</span>
        <span className="text-gray-500">· {zone.radius_km} km</span>
      </div>
    </div>
  )
}
