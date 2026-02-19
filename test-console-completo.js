// Script completo para ejecutar 3 veces y capturar TODOS los errores
(async function testConsoleCompleto() {
  console.clear();
  console.log('%c🔍 VERIFICANDO CONSOLA - EJECUCIÓN COMPLETA', 'font-size: 18px; font-weight: bold; color: #6366f1; background: #1e1e2e; padding: 10px;');
  
  const allErrors = [];
  const allWarnings = [];
  let executionCount = 0;
  
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // Interceptar console
  console.error = function(...args) {
    allErrors.push({ 
      execution: executionCount + 1,
      args: args.map(a => {
        if (typeof a === 'object' && a !== null) {
          try {
            return JSON.stringify(a).substring(0, 200);
          } catch {
            return String(a).substring(0, 200);
          }
        }
        return String(a).substring(0, 200);
      }),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    allWarnings.push({ 
      execution: executionCount + 1,
      args: args.map(a => String(a).substring(0, 200)),
      timestamp: new Date().toISOString()
    });
    originalWarn.apply(console, args);
  };
  
  // Ejecutar 3 veces
  for (let i = 1; i <= 3; i++) {
    executionCount = i;
    console.log(`\n%c═══════════════════════════════════════════════════════`, 'color: #6366f1; font-weight: bold;');
    console.log(`%cEJECUCIÓN ${i} de 3`, 'font-size: 16px; font-weight: bold; color: #6366f1;');
    console.log(`%c═══════════════════════════════════════════════════════`, 'color: #6366f1; font-weight: bold;');
    
    // Esperar para capturar errores
    console.log(`%c⏳ Esperando 3 segundos para capturar errores...`, 'color: #f59e0b; font-weight: bold;');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Probar endpoints
    console.log(`%c🌐 Probando endpoints...`, 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    
    try {
      const feedRes = await fetch('/api/v1/dashboard/feed?lat=-37.6672&lng=-72.5730&cursor=0&_t=' + Date.now());
      if (!feedRes.ok) {
        throw new Error(`HTTP ${feedRes.status}: ${feedRes.statusText}`);
      }
      const feedData = await feedRes.json();
      if (feedData.status === 'success' && Array.isArray(feedData.data)) {
        console.log(`%c✅ Feed OK: ${feedData.data.length} items`, 'color: #10b981;');
      } else {
        console.log(`%c❌ Feed estructura inválida:`, 'color: #ef4444;', feedData);
      }
    } catch (e) {
      console.log(`%c❌ Feed ERROR:`, 'color: #ef4444;', e.message);
    }
    
    try {
      const categoriesRes = await fetch('/api/v1/categories?_t=' + Date.now());
      if (!categoriesRes.ok) {
        throw new Error(`HTTP ${categoriesRes.status}`);
      }
      const categoriesData = await categoriesRes.json();
      if (Array.isArray(categoriesData)) {
        console.log(`%c✅ Categories OK: ${categoriesData.length} categorías`, 'color: #10b981;');
      } else {
        console.log(`%c❌ Categories estructura inválida:`, 'color: #ef4444;', categoriesData);
      }
    } catch (e) {
      console.log(`%c❌ Categories ERROR:`, 'color: #ef4444;', e.message);
    }
    
    // Verificar mapRef
    console.log(`%c🗺️ Verificando mapRef...`, 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    if (window.mapRef) {
      if (window.mapRef.current) {
        console.log(`%c✅ mapRef.current existe`, 'color: #10b981;');
        if (typeof window.mapRef.current.flyTo === 'function') {
          console.log(`%c✅ mapRef.current.flyTo existe`, 'color: #10b981;');
        } else {
          console.log(`%c❌ mapRef.current.flyTo NO es función`, 'color: #ef4444;');
        }
      } else {
        console.log(`%c⚠️ mapRef.current es null`, 'color: #f59e0b;');
      }
    } else {
      console.log(`%c❌ window.mapRef NO existe`, 'color: #ef4444;');
    }
    
    // Verificar elementos del DOM
    console.log(`%c🔍 Verificando elementos del DOM...`, 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      console.log(`%c✅ Mapa encontrado en DOM`, 'color: #10b981;');
    } else {
      console.log(`%c⚠️ Mapa NO encontrado en DOM`, 'color: #f59e0b;');
    }
    
    const dashboardFeed = document.querySelector('[class*="Dashboard"]');
    if (dashboardFeed) {
      console.log(`%c✅ Dashboard encontrado`, 'color: #10b981;');
    } else {
      console.log(`%c⚠️ Dashboard NO encontrado`, 'color: #f59e0b;');
    }
  }
  
  // Restaurar console original
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
  
  // Mostrar resultados finales
  console.log('\n\n%c═══════════════════════════════════════════════════════', 'color: #6366f1; font-weight: bold;');
  console.log(`%c📊 RESULTADOS FINALES (3 EJECUCIONES)`, 'font-size: 18px; font-weight: bold; color: #6366f1;');
  console.log(`%c═══════════════════════════════════════════════════════`, 'color: #6366f1; font-weight: bold;');
  
  if (allErrors.length > 0) {
    console.log(`\n%c❌ ERRORES TOTALES: ${allErrors.length}`, 'color: #ef4444; font-weight: bold; font-size: 16px;');
    
    // Agrupar errores por tipo
    const errorGroups = {};
    allErrors.forEach(err => {
      const key = err.args[0] || 'Unknown';
      if (!errorGroups[key]) {
        errorGroups[key] = [];
      }
      errorGroups[key].push(err);
    });
    
    Object.entries(errorGroups).forEach(([key, errors]) => {
      console.log(`\n%c[${errors.length}x] ${key.substring(0, 100)}`, 'color: #ef4444; font-weight: bold;');
      if (errors[0].stack) {
        const stackLines = errors[0].stack.split('\n').slice(0, 3);
        stackLines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line.trim()}`);
          }
        });
      }
    });
  } else {
    console.log(`\n%c✅ No se encontraron errores`, 'color: #10b981; font-weight: bold; font-size: 16px;');
  }
  
  if (allWarnings.length > 0) {
    console.log(`\n%c⚠️ WARNINGS TOTALES: ${allWarnings.length}`, 'color: #f59e0b; font-weight: bold; font-size: 16px;');
    
    const warningGroups = {};
    allWarnings.forEach(warn => {
      const key = warn.args[0] || 'Unknown';
      if (!warningGroups[key]) {
        warningGroups[key] = [];
      }
      warningGroups[key].push(warn);
    });
    
    Object.entries(warningGroups).forEach(([key, warnings]) => {
      console.log(`\n%c[${warnings.length}x] ${key.substring(0, 100)}`, 'color: #f59e0b; font-weight: bold;');
    });
  } else {
    console.log(`\n%c✅ No se encontraron warnings`, 'color: #10b981; font-weight: bold; font-size: 16px;');
  }
  
  // Resumen final
  console.log(`\n%c📋 RESUMEN:`, 'font-size: 16px; font-weight: bold; color: #6366f1;');
  console.log(`   Ejecuciones: 3`);
  console.log(`   Errores: ${allErrors.length}`);
  console.log(`   Warnings: ${allWarnings.length}`);
  
  // Guardar resultados en window para inspección
  window.testResults = {
    errors: allErrors,
    warnings: allWarnings,
    timestamp: new Date().toISOString()
  };
  
  console.log(`\n%c💾 Resultados guardados en window.testResults`, 'color: #3b82f6; font-weight: bold;');
  
  return { errors: allErrors, warnings: allWarnings };
})();
