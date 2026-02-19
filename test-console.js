// ============================================
// SCRIPT DE PRUEBA JOBSHOUR - Consola del Navegador
// ============================================
// Copia y pega este código completo en la consola del navegador (F12)
// Luego ejecuta: testJobsHour()

const API_BASE = window.location.origin; // Usa el mismo dominio (con rewrites de Next.js)
const API_V1 = `${API_BASE}/api/v1`;

// Colores para la consola
const colors = {
  success: 'color: #10b981; font-weight: bold',
  error: 'color: #ef4444; font-weight: bold',
  info: 'color: #3b82f6; font-weight: bold',
  warning: 'color: #f59e0b; font-weight: bold',
};

async function testJobsHour() {
  console.log('%c🚀 INICIANDO PRUEBAS JOBSHOUR', 'font-size: 16px; font-weight: bold; color: #6366f1');
  console.log(`%cAPI Base: ${API_BASE}`, colors.info);
  console.log(`%cAPI v1: ${API_V1}`, colors.info);
  console.log('─'.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Endpoint público - Categorías
  await test('GET /api/v1/categories', async () => {
    const res = await fetch(`${API_V1}/categories`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('No es un array');
    console.log(`✅ ${data.length} categorías encontradas`);
    return data;
  }, results);

  // Test 2: Endpoint público - Experts Nearby
  await test('GET /api/v1/experts/nearby', async () => {
    const res = await fetch(`${API_V1}/experts/nearby?lat=-37.6672&lng=-72.5730&radius=10`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) throw new Error('Estructura inválida');
    console.log(`✅ ${data.data.length} expertos encontrados`);
    if (data.meta) {
      console.log(`   📍 Ciudad: ${data.meta.city || 'N/A'}`);
      console.log(`   📏 Radio: ${data.meta.radius_searched}`);
    }
    return data;
  }, results);

  // Test 3: Endpoint público - Nudges
  await test('GET /api/v1/nudges/random', async () => {
    const res = await fetch(`${API_V1}/nudges/random`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await res.json();
    if (!data.message) throw new Error('No tiene mensaje');
    console.log(`✅ Nudge: "${data.message}"`);
    return data;
  }, results);

  // Test 4: Endpoint público - Búsqueda
  await test('GET /api/v1/search', async () => {
    const res = await fetch(`${API_V1}/search?q=gasfiter&lat=-37.6672&lng=-72.5730`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('No es un array');
    console.log(`✅ ${data.length} resultados de búsqueda`);
    return data;
  }, results);

  // Test 5: Endpoint público - Dashboard Feed
  await test('GET /api/v1/dashboard/feed', async () => {
    const res = await fetch(`${API_V1}/dashboard/feed`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('No es un array');
    console.log(`✅ ${data.length} items en feed`);
    return data;
  }, results);

  // Test 6: Endpoint público - Live Stats
  await test('GET /api/v1/dashboard/live-stats', async () => {
    const res = await fetch(`${API_V1}/dashboard/live-stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`✅ Stats:`, data);
    return data;
  }, results);

  // Test 7: Verificar estructura de Expert Detail
  await test('GET /api/v1/experts/{id} (si existe)', async () => {
    // Primero obtener lista de experts
    const res = await fetch(`${API_V1}/experts/nearby?lat=-37.6672&lng=-72.5730&radius=10`);
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      const firstExpert = data.data[0];
      const detailRes = await fetch(`${API_V1}/experts/${firstExpert.id}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        console.log(`✅ Detalle de experto obtenido:`, {
          id: detail.id,
          name: detail.name,
          hourly_rate: detail.hourly_rate,
          status: detail.status
        });
        return detail;
      }
    }
    console.log('⚠️ No hay expertos para probar detalle');
    return null;
  }, results);

  // Resumen final
  console.log('─'.repeat(60));
  console.log(`%c📊 RESUMEN:`, 'font-size: 14px; font-weight: bold');
  console.log(`%c✅ Pasados: ${results.passed}`, colors.success);
  console.log(`%c❌ Fallidos: ${results.failed}`, colors.error);
  
  if (results.errors.length > 0) {
    console.log(`%c⚠️ ERRORES ENCONTRADOS:`, colors.warning);
    results.errors.forEach((err, i) => {
      console.log(`%c${i + 1}. ${err.test}`, colors.error);
      console.log(`   ${err.message}`);
    });
  }

  // Guardar resultados en window para inspección
  window.jobshourTestResults = results;
  console.log(`%c💾 Resultados guardados en window.jobshourTestResults`, colors.info);

  return results;
}

// Función helper para tests
async function test(name, fn, results) {
  try {
    console.log(`%c🧪 Probando: ${name}`, colors.info);
    const start = performance.now();
    const result = await fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`%c✅ ${name} - OK (${duration}ms)`, colors.success);
    results.passed++;
    return result;
  } catch (error) {
    console.error(`%c❌ ${name} - ERROR`, colors.error);
    console.error(`   ${error.message}`);
    results.failed++;
    results.errors.push({
      test: name,
      message: error.message,
      error: error
    });
    return null;
  }
}

// Función para probar autenticación (requiere token)
async function testAuth(token) {
  if (!token) {
    console.log('%c⚠️ No hay token, omitiendo tests de autenticación', colors.warning);
    return;
  }

  console.log('%c🔐 PROBANDO ENDPOINTS AUTENTICADOS', 'font-size: 14px; font-weight: bold');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Test: Obtener perfil de usuario
  await test('GET /api/auth/me', async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`✅ Usuario: ${data.name || data.email}`);
    return data;
  }, window.jobshourTestResults || { passed: 0, failed: 0, errors: [] });

  // Test: Obtener métricas de worker
  await test('GET /api/worker/metrics', async () => {
    const res = await fetch(`${API_BASE}/api/worker/metrics`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`✅ Métricas obtenidas:`, data);
    return data;
  }, window.jobshourTestResults || { passed: 0, failed: 0, errors: [] });
}

// Función para probar creación de solicitud (requiere autenticación)
async function testCreateRequest(token, workerId) {
  if (!token || !workerId) {
    console.log('%c⚠️ Se necesita token y workerId para crear solicitud', colors.warning);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  await test('POST /api/v1/requests', async () => {
    const res = await fetch(`${API_V1}/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        worker_id: workerId,
        category_id: 1,
        description: 'Prueba desde consola',
        urgency: 'normal',
        offered_price: 15000
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(error)}`);
    }
    
    const data = await res.json();
    console.log(`✅ Solicitud creada: ID ${data.data?.id}`);
    return data;
  }, window.jobshourTestResults || { passed: 0, failed: 0, errors: [] });
}

// Exportar funciones al scope global
window.testJobsHour = testJobsHour;
window.testAuth = testAuth;
window.testCreateRequest = testCreateRequest;

console.log('%c✅ Script cargado! Ejecuta: testJobsHour()', colors.success);
console.log('%c📝 Otros comandos disponibles:', colors.info);
console.log('   - testAuth(token) - Probar endpoints autenticados');
console.log('   - testCreateRequest(token, workerId) - Crear solicitud de prueba');
