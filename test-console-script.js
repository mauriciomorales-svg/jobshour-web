// Script inline para ejecutar directamente en la consola
(async function testConsole() {
  console.clear();
  console.log('%cðŸ” VERIFICANDO CONSOLA DEL NAVEGADOR', 'font-size: 18px; font-weight: bold; color: #6366f1;');
  
  const errors = [];
  const warnings = [];
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    errors.push({ args, timestamp: new Date().toISOString() });
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    warnings.push({ args, timestamp: new Date().toISOString() });
    originalWarn.apply(console, args);
  };
  
  console.log('%câ³ Esperando 5 segundos para capturar errores...', 'color: #f59e0b; font-weight: bold');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.error = originalError;
  console.warn = originalWarn;
  
  console.log('\n%cðŸ“Š RESULTADOS DE LA CONSOLA', 'font-size: 16px; font-weight: bold; color: #10b981;');
  console.log('â”€'.repeat(80));
  
  if (errors.length > 0) {
    console.log(`%câŒ ERRORES ENCONTRADOS: ${errors.length}`, 'color: #ef4444; font-weight: bold; font-size: 14px;');
    errors.forEach((err, i) => {
      console.log(`%c[${i + 1}] ERROR:`, 'color: #ef4444; font-weight: bold;', ...err.args);
    });
  } else {
    console.log('%câœ… No se encontraron errores', 'color: #10b981; font-weight: bold;');
  }
  
  console.log('\n');
  
  if (warnings.length > 0) {
    console.log(`%câš ï¸ WARNINGS ENCONTRADOS: ${warnings.length}`, 'color: #f59e0b; font-weight: bold; font-size: 14px;');
    warnings.forEach((warn, i) => {
      console.log(`%c[${i + 1}] WARNING:`, 'color: #f59e0b; font-weight: bold;', ...warn.args);
    });
  } else {
    console.log('%câœ… No se encontraron warnings', 'color: #10b981; font-weight: bold;');
  }
  
  console.log('\n');
  
  console.log('%cðŸŒ PROBANDO ENDPOINTS...', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  
  try {
    const feedRes = await fetch('/api/v1/dashboard/feed?lat=-37.6672&lng=-72.5730&cursor=0');
    const feedData = await feedRes.json();
    if (feedRes.ok && feedData.status === 'success') {
      console.log(`%câœ… Feed endpoint OK: ${feedData.data.length} items`, 'color: #10b981;');
    } else {
      console.log(`%câŒ Feed endpoint ERROR:`, 'color: #ef4444;', feedData);
    }
  } catch (e) {
    console.log(`%câŒ Feed endpoint EXCEPTION:`, 'color: #ef4444;', e.message);
  }
  
  try {
    const categoriesRes = await fetch('/api/v1/categories');
    const categoriesData = await categoriesRes.json();
    if (categoriesRes.ok && Array.isArray(categoriesData)) {
      console.log(`%câœ… Categories endpoint OK: ${categoriesData.length} categorÃ­as`, 'color: #10b981;');
    } else {
      console.log(`%câŒ Categories endpoint ERROR:`, 'color: #ef4444;', categoriesData);
    }
  } catch (e) {
    console.log(`%câŒ Categories endpoint EXCEPTION:`, 'color: #ef4444;', e.message);
  }
  
  console.log('\n%cðŸ—ºï¸ VERIFICANDO MAPREF...', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  if (window.mapRef) {
    if (window.mapRef.current) {
      console.log('%câœ… mapRef.current existe', 'color: #10b981;');
      if (window.mapRef.current.flyTo) {
        console.log('%câœ… mapRef.current.flyTo existe', 'color: #10b981;');
      } else {
        console.log('%câŒ mapRef.current.flyTo NO existe', 'color: #ef4444;');
      }
    } else {
      console.log('%câš ï¸ mapRef.current es null', 'color: #f59e0b;');
    }
  } else {
    console.log('%câŒ window.mapRef NO existe', 'color: #ef4444;');
  }
  
  console.log('\n%cðŸ“‹ RESUMEN FINAL', 'font-size: 16px; font-weight: bold; color: #6366f1;');
  console.log('â”€'.repeat(80));
  console.log(`Errores: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  return { errors, warnings };
})();

