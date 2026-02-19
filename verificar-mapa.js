// Script para verificar el estado del mapa desde la consola
// Ejecutar en la consola del navegador después de cargar la página

console.log('=== VERIFICACIÓN DEL MAPA ===\n')

// 1. Verificar mapRef
console.log('1. mapRef.current:', window.mapRef?.current)
console.log('   Tipo:', typeof window.mapRef?.current)
if (window.mapRef?.current) {
  console.log('   flyTo existe:', typeof window.mapRef.current.flyTo)
  console.log('   isReady existe:', typeof window.mapRef.current.isReady)
  if (window.mapRef.current.isReady) {
    console.log('   isReady():', window.mapRef.current.isReady())
  }
}

// 2. Verificar DOM
console.log('\n2. DOM:')
const container = document.querySelector('.leaflet-container')
console.log('   .leaflet-container existe:', !!container)
if (container) {
  console.log('   _leaflet:', !!(container as any)._leaflet)
  console.log('   __leaflet_map:', !!(container as any).__leaflet_map)
  console.log('   _leaflet_id:', (container as any)._leaflet_id)
  
  const map = (container as any)._leaflet || (container as any).__leaflet_map
  if (map) {
    console.log('   Mapa encontrado')
    console.log('   flyTo:', typeof map.flyTo)
    console.log('   setView:', typeof map.setView)
    console.log('   getCenter:', typeof map.getCenter)
  }
}

// 3. Verificar L global
console.log('\n3. Leaflet global:')
console.log('   window.L existe:', !!(window as any).L)
if ((window as any).L) {
  console.log('   L.maps:', !!(window as any).L.maps)
  if ((window as any).L.maps && container) {
    const mapId = (container as any)._leaflet_id
    if (mapId) {
      console.log('   L.maps[' + mapId + ']:', !!(window as any).L.maps[mapId])
    }
  }
}

// 4. Prueba de flyTo
console.log('\n4. PRUEBA DE flyTo:')
const testCoords = [-37.6672, -72.5730]
if (window.mapRef?.current?.flyTo) {
  console.log('   Intentando flyTo con mapRef...')
  try {
    const result = window.mapRef.current.flyTo(testCoords, 18)
    console.log('   Resultado:', result)
  } catch (e) {
    console.error('   Error:', e)
  }
} else {
  console.log('   mapRef.current.flyTo no disponible')
}

// 5. Prueba directa con DOM
if (container) {
  const map = (container as any)._leaflet || (container as any).__leaflet_map
  if (map && typeof map.flyTo === 'function') {
    console.log('\n5. PRUEBA DIRECTA CON DOM:')
    try {
      map.flyTo(testCoords, 18, { duration: 1.5 })
      console.log('   ✅ flyTo ejecutado directamente')
    } catch (e) {
      console.error('   ❌ Error:', e)
    }
  }
}

console.log('\n=== FIN DE VERIFICACIÓN ===')
