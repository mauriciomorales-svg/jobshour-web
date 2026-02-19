# Instrucciones para Probar la Consola

## Método 1: Script Automático

1. Abre la aplicación en el navegador: `http://localhost:3002`
2. Abre la consola del navegador (F12)
3. Copia y pega el siguiente código:

```javascript
async function testConsole() {
  console.clear();
  console.log('%c🔍 VERIFICANDO CONSOLA DEL NAVEGADOR', 'font-size: 18px; font-weight: bold; color: #6366f1;');
  
  const errors = [];
  const warnings = [];
  
  // Interceptar console.error y console.warn
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
  
  console.log('%c⏳ Esperando 5 segundos para capturar errores...', 'color: #f59e0b;');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Restaurar console original
  console.error = originalError;
  console.warn = originalWarn;
  
  console.log('\n%c📊 RESULTADOS', 'font-size: 16px; font-weight: bold; color: #10b981;');
  
  if (errors.length > 0) {
    console.log(`%c❌ ERRORES: ${errors.length}`, 'color: #ef4444; font-weight: bold;');
    errors.forEach((err, i) => {
      console.log(`[${i + 1}]`, ...err.args);
    });
  } else {
    console.log('%c✅ No se encontraron errores', 'color: #10b981;');
  }
  
  if (warnings.length > 0) {
    console.log(`%c⚠️ WARNINGS: ${warnings.length}`, 'color: #f59e0b; font-weight: bold;');
    warnings.forEach((warn, i) => {
      console.log(`[${i + 1}]`, ...warn.args);
    });
  } else {
    console.log('%c✅ No se encontraron warnings', 'color: #10b981;');
  }
  
  // Probar endpoints
  console.log('\n%c🌐 PROBANDO ENDPOINTS...', 'font-size: 14px; font-weight: bold;');
  
  try {
    const feedRes = await fetch('/api/v1/dashboard/feed?lat=-37.6672&lng=-72.5730&cursor=0');
    const feedData = await feedRes.json();
    if (feedRes.ok && feedData.status === 'success') {
      console.log(`%c✅ Feed: ${feedData.data.length} items`, 'color: #10b981;');
    } else {
      console.log(`%c❌ Feed ERROR:`, 'color: #ef4444;', feedData);
    }
  } catch (e) {
    console.log(`%c❌ Feed EXCEPTION:`, 'color: #ef4444;', e.message);
  }
  
  // Verificar mapRef
  console.log('\n%c🗺️ VERIFICANDO MAPREF...', 'font-size: 14px; font-weight: bold;');
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
  
  return { errors, warnings };
}

testConsole();
```

4. Presiona Enter para ejecutar

## Método 2: Usar el script existente

1. Abre `http://localhost:3002`
2. Abre la consola (F12)
3. Copia y pega el contenido completo de `test-console.js`
4. Ejecuta: `testJobsHour()`

## Verificación Manual

Para verificar errores manualmente:

1. Abre la consola (F12)
2. Revisa la pestaña "Console"
3. Busca mensajes en rojo (errores) o amarillo (warnings)
4. Filtra por nivel: Error, Warning, Info, Log

## Comandos Útiles

```javascript
// Ver todos los errores
console.error

// Verificar mapRef
window.mapRef?.current?.flyTo

// Probar feed
fetch('/api/v1/dashboard/feed?lat=-37.6672&lng=-72.5730&cursor=0').then(r => r.json()).then(console.log)

// Limpiar consola
console.clear()
```
