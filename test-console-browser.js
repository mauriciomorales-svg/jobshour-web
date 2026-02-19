// Script para ejecutar en la consola del navegador
// Copia y pega este código en la consola (F12) y ejecuta: testConsole()

async function testConsole() {
  console.clear();
  console.log('%c🔍 VERIFICANDO CONSOLA DEL NAVEGADOR', 'font-size: 18px; font-weight: bold; color: #6366f1; background: #1e1e2e; padding: 10px;');
  
  const errors = [];
  const warnings = [];
  const logs = [];
  
  // Interceptar console.error temporalmente
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  console.error = function(...args) {
    errors.push({ type: 'error', args, timestamp: new Date().toISOString() });
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    warnings.push({ type: 'warn', args, timestamp: new Date().toISOString() });
    originalWarn.apply(console, args);
  };
  
  console.log = function(...args) {
    logs.push({ type: 'log', args, timestamp: new Date().toISOString() });
    originalLog.apply(console, args);
  };
  
  console.log('%c⏳ Esperando 5 segundos para capturar errores...', 'color: #f59e0b; font-weight: bold');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Restaurar console original
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
  
  console.log('\n%c📊 RESULTADOS DE LA CONSOLA', 'font-size: 16px; font-weight: bold; color: #10b981;');
  console.log('─'.repeat(80));
  
  // Mostrar errores
  if (errors.length > 0) {
    console.log(`%c❌ ERRORES ENCONTRADOS: ${errors.length}`, 'color: #ef4444; font-weight: bold; font-size: 14px;');
    errors.forEach((err, i) => {
      console.log(`%c[${i + 1}] ERROR:`, 'color: #ef4444; font-weight: bold;', ...err.args);
    });
  } else {
    console.log('%c✅ No se encontraron errores', 'color: #10b981; font-weight: bold;');
  }
  
  console.log('\n');
  
  // Mostrar warnings
  if (warnings.length > 0) {
    console.log(`%c⚠️ WARNINGS ENCONTRADOS: ${warnings.length}`, 'color: #f59e0b; font-weight: bold; font-size: 14px;');
    warnings.forEach((warn, i) => {
      console.log(`%c[${i + 1}] WARNING:`, 'color: #f59e0b; font-weight: bold;', ...warn.args);
    });
  } else {
    console.log('%c✅ No se encontraron warnings', 'color: #10b981; font-weight: bold;');
  }
  
  console.log('\n');
  
  // Probar endpoints
  console.log('%c🌐 PROBANDO ENDPOINTS...', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  
  try {
    const feedRes = await fetch('/api/v1/dashboard/feed?lat=-37.6672&lng=-72.5730&cursor=0');
    const feedData = await feedRes.json();
    if (feedRes.ok && feedData.status === 'success') {
      console.log(`%c✅ Feed endpoint OK: ${feedData.data.length} items`, 'color: #10b981;');
    } else {
      console.log(`%c❌ Feed endpoint ERROR:`, 'color: #ef4444;', feedData);
    }
  } catch (e) {
    console.log(`%c❌ Feed endpoint EXCEPTION:`, 'color: #ef4444;', e.message);
  }
  
  try {
    const categoriesRes = await fetch('/api/v1/categories');
    const categoriesData = await categoriesRes.json();
    if (categoriesRes.ok && Array.isArray(categoriesData)) {
      console.log(`%c✅ Categories endpoint OK: ${categoriesData.length} categorías`, 'color: #10b981;');
    } else {
      console.log(`%c❌ Categories endpoint ERROR:`, 'color: #ef4444;', categoriesData);
    }
  } catch (e) {
    console.log(`%c❌ Categories endpoint EXCEPTION:`, 'color: #ef4444;', e.message);
  }
  
  // Verificar mapRef
  console.log('\n%c🗺️ VERIFICANDO MAPREF...', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  if (window.mapRef) {
    if (window.mapRef.current) {
      console.log('%c✅ mapRef.current existe', 'color: #10b981;');
      if (window.mapRef.current.flyTo) {
        console.log('%c✅ mapRef.current.flyTo existe', 'color: #10b981;');
      } else {
        console.log('%c❌ mapRef.current.flyTo NO existe', 'color: #ef4444;');
      }
    } else {
      console.log('%c⚠️ mapRef.current es null', 'color: #f59e0b;');
    }
  } else {
    console.log('%c❌ window.mapRef NO existe', 'color: #ef4444;');
  }
  
  // Resumen final
  console.log('\n%c📋 RESUMEN FINAL', 'font-size: 16px; font-weight: bold; color: #6366f1;');
  console.log('─'.repeat(80));
  console.log(`Errores: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Logs capturados: ${logs.length}`);
  
  return {
    errors,
    warnings,
    logs
  };
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('%c💡 Ejecuta testConsole() para verificar la consola', 'color: #3b82f6; font-weight: bold;');
}
