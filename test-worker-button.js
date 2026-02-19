// Script para probar el botón "Modo Trabajo" desde la consola del navegador
// Copia y pega este código completo en la consola del navegador (F12)

console.log('%c🔧 SCRIPT DE PRUEBA - BOTÓN MODO TRABAJO', 'font-size: 16px; font-weight: bold; color: #6366f1');

// Función para probar el cambio de estado del botón
async function testWorkerButton() {
  console.log('%c📋 Estado actual del botón:', 'color: #3b82f6; font-weight: bold');
  
  // Obtener el token
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    console.error('%c❌ No hay token de autenticación', 'color: #ef4444; font-weight: bold');
    console.log('   Por favor, inicia sesión primero');
    return;
  }
  
  console.log('✅ Token encontrado');
  
  // Verificar estado actual del worker
  try {
    const meRes = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!meRes.ok) {
      console.error(`%c❌ Error obteniendo perfil: HTTP ${meRes.status}`, 'color: #ef4444');
      return;
    }
    
    const meData = await meRes.json();
    console.log('📊 Perfil del usuario:', {
      id: meData.id,
      name: meData.name,
      worker: meData.worker ? {
        id: meData.worker.id,
        status: meData.worker.availability_status,
        category_id: meData.worker.category_id,
        hasCategory: !!meData.worker.category_id
      } : 'No tiene worker'
    });
    
    // Probar cambio de estado
    if (!navigator.geolocation) {
      console.error('%c❌ Geolocalización no disponible', 'color: #ef4444');
      return;
    }
    
    console.log('%c🔄 Obteniendo ubicación...', 'color: #f59e0b');
    
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log(`📍 Ubicación obtenida: ${lat}, ${lng}`);
      
      // Probar activar modo trabajo
      console.log('%c🟢 Intentando activar modo trabajo (active)...', 'color: #10b981');
      
      const res = await fetch('/api/v1/worker/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'active',
          lat: lat,
          lng: lng
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        console.log('%c✅ Estado actualizado correctamente:', 'color: #10b981; font-weight: bold');
        console.log('   Respuesta:', data);
        console.log('%c💡 Recarga la página para ver el cambio', 'color: #3b82f6');
      } else {
        console.error(`%c❌ Error: HTTP ${res.status}`, 'color: #ef4444; font-weight: bold');
        console.error('   Respuesta:', data);
        
        if (data.code === 'REQUIRE_CATEGORY') {
          console.log('%c⚠️ Se requiere seleccionar una categoría primero', 'color: #f59e0b');
          console.log('   Abre el sidebar y selecciona una categoría');
        }
      }
    }, (error) => {
      console.error('%c❌ Error de geolocalización:', 'color: #ef4444', error);
    });
    
  } catch (err) {
    console.error('%c❌ Error:', 'color: #ef4444', err);
  }
}

// Función para verificar estado actual
async function checkWorkerStatus() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    console.log('%c⚠️ No hay token', 'color: #f59e0b');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    console.log('%c📊 ESTADO ACTUAL:', 'font-size: 14px; font-weight: bold; color: #6366f1');
    console.log('Usuario:', data.name || data.email);
    console.log('Worker:', data.worker ? {
      status: data.worker.availability_status,
      category_id: data.worker.category_id,
      category_name: data.worker.category?.name || 'Sin categoría'
    } : 'No tiene worker');
    
    return data;
  } catch (err) {
    console.error('Error:', err);
  }
}

// Función para forzar cambio de estado (bypass UI)
async function forceWorkerStatus(status) {
  const validStatuses = ['active', 'listening', 'inactive'];
  if (!validStatuses.includes(status)) {
    console.error(`%c❌ Estado inválido. Usa: ${validStatuses.join(', ')}`, 'color: #ef4444');
    return;
  }
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    console.error('%c❌ No hay token', 'color: #ef4444');
    return;
  }
  
  if (!navigator.geolocation) {
    console.error('%c❌ Geolocalización no disponible', 'color: #ef4444');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(async (position) => {
    const res = await fetch('/api/v1/worker/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: status,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log(`%c✅ Estado cambiado a: ${status}`, 'color: #10b981; font-weight: bold');
      console.log('   Respuesta:', data);
      console.log('%c💡 Recarga la página (Ctrl+F5) para ver el cambio', 'color: #3b82f6');
    } else {
      console.error(`%c❌ Error: HTTP ${res.status}`, 'color: #ef4444');
      console.error('   Respuesta:', data);
    }
  });
}

// Exportar funciones al scope global
window.testWorkerButton = testWorkerButton;
window.checkWorkerStatus = checkWorkerStatus;
window.forceWorkerStatus = forceWorkerStatus;

console.log('%c✅ Script cargado!', 'color: #10b981; font-weight: bold');
console.log('%c📝 Comandos disponibles:', 'color: #3b82f6; font-weight: bold');
console.log('   1. checkWorkerStatus() - Ver estado actual');
console.log('   2. testWorkerButton() - Probar activación');
console.log('   3. forceWorkerStatus("active") - Forzar a activo');
console.log('   4. forceWorkerStatus("listening") - Forzar a intermedio');
console.log('   5. forceWorkerStatus("inactive") - Forzar a inactivo');
console.log('');
console.log('%c💡 Ejecuta: checkWorkerStatus() primero', 'color: #f59e0b');
