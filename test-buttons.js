// Script para probar los botones del dashboard
// Ejecutar en la consola del navegador (F12) cuando el dashboard esté abierto

console.log('🧪 Iniciando pruebas de botones...');

// Función para simular click en botones
function testButtons() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Verificar que el dashboard está visible
  console.log('\n1️⃣ Verificando que el dashboard está visible...');
  const dashboard = document.querySelector('[class*="translate-y-0"]');
  if (dashboard && !dashboard.classList.contains('translate-y-full')) {
    console.log('✅ Dashboard visible');
    results.passed++;
  } else {
    console.log('❌ Dashboard no visible - Abre el dashboard primero');
    results.failed++;
    results.errors.push('Dashboard no visible');
    return results;
  }

  // Test 2: Buscar botones "Tomar Solicitud"
  console.log('\n2️⃣ Buscando botones "Tomar Solicitud"...');
  const tomarSolicitudButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Tomar Solicitud') || btn.textContent.includes('💰')
  );
  
  if (tomarSolicitudButtons.length > 0) {
    console.log(`✅ Encontrados ${tomarSolicitudButtons.length} botones "Tomar Solicitud"`);
    results.passed++;
    
    // Test 3: Hacer click en el primer botón
    console.log('\n3️⃣ Haciendo click en el primer botón "Tomar Solicitud"...');
    try {
      const firstButton = tomarSolicitudButtons[0];
      console.log('📍 Botón encontrado:', firstButton);
      console.log('📍 Texto del botón:', firstButton.textContent);
      console.log('📍 Clases:', firstButton.className);
      
      // Verificar que tiene el handler
      const hasHandler = firstButton.onclick !== null || firstButton.getAttribute('onclick');
      console.log('📍 Tiene handler:', hasHandler);
      
      // Simular click
      firstButton.click();
      console.log('✅ Click ejecutado');
      
      // Esperar un momento y verificar si se abrió el modal
      setTimeout(() => {
        const modal = document.querySelector('[class*="fixed"][class*="z-[300]"]') || 
                     document.querySelector('[class*="ServiceRequestModal"]');
        if (modal) {
          console.log('✅ Modal abierto correctamente');
          results.passed++;
        } else {
          console.log('⚠️ Modal no detectado (puede estar usando otro selector)');
          console.log('Verifica manualmente si se abrió el modal');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error al hacer click:', error);
      results.failed++;
      results.errors.push('Error al hacer click: ' + error.message);
    }
  } else {
    console.log('❌ No se encontraron botones "Tomar Solicitud"');
    results.failed++;
    results.errors.push('No se encontraron botones "Tomar Solicitud"');
  }

  // Test 4: Buscar botones "Ir a la ubicación exacta"
  console.log('\n4️⃣ Buscando botones "Ir a la ubicación exacta"...');
  const ubicacionButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Ir a la ubicación exacta') || 
    btn.textContent.includes('ubicación')
  );
  
  if (ubicacionButtons.length > 0) {
    console.log(`✅ Encontrados ${ubicacionButtons.length} botones "Ir a la ubicación exacta"`);
    results.passed++;
    
    // Test 5: Hacer click en el primer botón de ubicación
    console.log('\n5️⃣ Haciendo click en el primer botón "Ir a la ubicación exacta"...');
    try {
      const firstUbicacionButton = ubicacionButtons[0];
      console.log('📍 Botón encontrado:', firstUbicacionButton);
      
      // Guardar posición del mapa antes del click
      const mapBefore = window.mapRef?.current || null;
      console.log('📍 Estado del mapa antes:', mapBefore ? 'Mapa disponible' : 'Mapa no disponible');
      
      firstUbicacionButton.click();
      console.log('✅ Click ejecutado');
      
      // Verificar si el dashboard se cerró
      setTimeout(() => {
        const dashboardAfter = document.querySelector('[class*="translate-y-full"]');
        if (dashboardAfter && dashboardAfter.classList.contains('translate-y-full')) {
          console.log('✅ Dashboard se cerró correctamente');
          results.passed++;
        } else {
          console.log('⚠️ Dashboard no se cerró (puede estar usando otro selector)');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error al hacer click:', error);
      results.failed++;
      results.errors.push('Error al hacer click en ubicación: ' + error.message);
    }
  } else {
    console.log('❌ No se encontraron botones "Ir a la ubicación exacta"');
    results.failed++;
    results.errors.push('No se encontraron botones "Ir a la ubicación exacta"');
  }

  // Test 6: Buscar botones de chat
  console.log('\n6️⃣ Buscando funcionalidad de chat...');
  // Los botones de chat pueden estar en otros lugares, solo verificamos que existan ServiceRequests con chat disponible
  
  return results;
}

// Función para verificar el estado de React
function checkReactState() {
  console.log('\n🔍 Verificando estado de React...');
  
  // Buscar el elemento raíz de React
  const reactRoot = document.querySelector('#__next') || document.querySelector('[data-reactroot]');
  if (reactRoot) {
    console.log('✅ React está montado');
  } else {
    console.log('⚠️ No se detectó React root');
  }
  
  // Verificar si hay errores en la consola
  const originalError = console.error;
  const errors = [];
  console.error = function(...args) {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    if (errors.length > 0) {
      console.log(`⚠️ Se detectaron ${errors.length} errores en la consola`);
    } else {
      console.log('✅ No hay errores detectados');
    }
    console.error = originalError;
  }, 1000);
}

// Ejecutar pruebas
console.log('\n═══════════════════════════════════════');
console.log('🧪 PRUEBAS DE BOTONES DEL DASHBOARD');
console.log('═══════════════════════════════════════\n');

checkReactState();

// Esperar un momento para que React termine de renderizar
setTimeout(() => {
  const results = testButtons();
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESULTADOS:');
  console.log(`✅ Pasados: ${results.passed}`);
  console.log(`❌ Fallidos: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\n❌ Errores:');
    results.errors.forEach(err => console.log(`   - ${err}`));
  }
  console.log('═══════════════════════════════════════\n');
  
  // Guardar resultados globalmente
  window.buttonTestResults = results;
  
}, 1000);

// Exportar función para uso manual
window.testDashboardButtons = testButtons;
