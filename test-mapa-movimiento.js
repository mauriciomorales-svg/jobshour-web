// Script para probar el movimiento del mapa desde la consola del navegador
// Ejecutar en la consola del navegador después de cargar la página

console.clear()
console.log('🧪 Iniciando prueba de movimiento del mapa...\n')

// Coordenadas de prueba (Renaico)
const testCoords = {
  lat: -37.6672,
  lng: -72.5730,
  zoom: 18
}

// Función para verificar el estado del mapa
function verificarMapa() {
  console.log('📊 Estado del mapa:')
  
  // Verificar mapRef
  if (window.mapRef) {
    console.log('  ✅ window.mapRef existe')
    if (window.mapRef.current) {
      console.log('  ✅ window.mapRef.current existe')
      if (typeof window.mapRef.current.flyTo === 'function') {
        console.log('  ✅ window.mapRef.current.flyTo es función')
      } else {
        console.log('  ❌ window.mapRef.current.flyTo NO es función')
      }
      if (window.mapRef.current.isReady) {
        const ready = window.mapRef.current.isReady()
        console.log(`  📍 isReady(): ${ready}`)
      }
    } else {
      console.log('  ❌ window.mapRef.current es null')
    }
  } else {
    console.log('  ❌ window.mapRef NO existe')
  }
  
  // Verificar DOM
  const container = document.querySelector('.leaflet-container')
  if (container) {
    console.log('  ✅ .leaflet-container existe en DOM')
    const map = container._leaflet || container.__leaflet_map
    if (map) {
      console.log('  ✅ Instancia de Leaflet encontrada en DOM')
      console.log(`  📍 Métodos disponibles: flyTo=${typeof map.flyTo}, setView=${typeof map.setView}, panTo=${typeof map.panTo}`)
    } else {
      console.log('  ⚠️ Instancia de Leaflet NO encontrada en DOM')
    }
  } else {
    console.log('  ❌ .leaflet-container NO existe en DOM')
  }
  
  console.log('')
}

// Función para intentar mover el mapa
function moverMapa(lat, lng, zoom = 18) {
  console.log(`🗺️ Intentando mover mapa a: [${lat}, ${lng}], zoom: ${zoom}\n`)
  
  let exito = false
  
  // Método 1: mapRef.current
  if (window.mapRef?.current) {
    if (typeof window.mapRef.current.flyTo === 'function') {
      try {
        console.log('  🔄 Método 1: Usando window.mapRef.current.flyTo...')
        const result = window.mapRef.current.flyTo([lat, lng], zoom)
        if (result !== false) {
          console.log('  ✅ Método 1 exitoso')
          exito = true
        } else {
          console.log('  ⚠️ Método 1 retornó false')
        }
      } catch (error) {
        console.error('  ❌ Método 1 falló:', error)
      }
    }
  }
  
  // Método 2: DOM directo
  if (!exito) {
    const container = document.querySelector('.leaflet-container')
    if (container) {
      const map = container._leaflet || container.__leaflet_map ||
                  (container._leaflet_id && window.L?.maps?.[container._leaflet_id])
      
      if (map) {
        try {
          if (typeof map.flyTo === 'function') {
            console.log('  🔄 Método 2: Usando mapa desde DOM (flyTo)...')
            map.flyTo([lat, lng], zoom, { duration: 1.5 })
            console.log('  ✅ Método 2 exitoso')
            exito = true
          } else if (typeof map.setView === 'function') {
            console.log('  🔄 Método 2: Usando mapa desde DOM (setView)...')
            map.setView([lat, lng], zoom, { animate: true, duration: 1.5 })
            console.log('  ✅ Método 2 exitoso (setView)')
            exito = true
          }
        } catch (error) {
          console.error('  ❌ Método 2 falló:', error)
        }
      }
    }
  }
  
  if (!exito) {
    console.error('  ❌ Todos los métodos fallaron')
  }
  
  console.log('')
  return exito
}

// Ejecutar pruebas
console.log('='.repeat(60))
console.log('PRUEBA 1: Verificar estado del mapa')
console.log('='.repeat(60))
verificarMapa()

console.log('='.repeat(60))
console.log('PRUEBA 2: Intentar mover el mapa')
console.log('='.repeat(60))
const resultado = moverMapa(testCoords.lat, testCoords.lng, testCoords.zoom)

if (resultado) {
  console.log('✅ PRUEBA EXITOSA: El mapa debería haberse movido')
} else {
  console.log('❌ PRUEBA FALLIDA: El mapa no se movió')
  console.log('\n💡 SUGERENCIAS:')
  console.log('  1. Espera unos segundos y vuelve a ejecutar moverMapa()')
  console.log('  2. Verifica que el mapa esté completamente cargado')
  console.log('  3. Revisa la consola para errores de Leaflet')
}

console.log('\n' + '='.repeat(60))
console.log('Para probar manualmente, ejecuta:')
console.log(`  moverMapa(${testCoords.lat}, ${testCoords.lng}, ${testCoords.zoom})`)
console.log('='.repeat(60))
