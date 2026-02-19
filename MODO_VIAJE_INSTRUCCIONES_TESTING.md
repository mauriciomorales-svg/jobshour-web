# 🧪 INSTRUCCIONES DE TESTING - MODO VIAJE

**Para:** Equipo de Desarrollo JobsHour  
**De:** Mauricio (Dueño del Producto)  
**Fecha:** 17 de Febrero, 2026  
**Objetivo:** Validar que el sistema "absorba" correctamente según el ADN de "Prioridad al Recurso"

---

## 🎯 OBJETIVO DEL TESTING

**Validar que el sistema:**
1. ✅ Matchea a clientes que están **en el camino** (≤2km de desvío)
2. ❌ Descarta a clientes que están **muy lejos** (>2km de desvío)
3. ⚡ Responde en **menos de 1 segundo** (escalabilidad)
4. 🎥 Muestra el **Video CV del worker** al cliente (confianza)
5. 📦 Trata **delivery con la misma prioridad** que ride

---

## 🎬 ESCENARIO DE PRUEBA

### **Personajes:**

**🚗 Marco (Worker)**
- Ubicación: Centro de Renaico
- Destino: Angol
- Vehículo: Auto con 3 asientos
- Acepta: Pasajeros y encomiendas

**✅ María (Cliente A - CERCA)**
- Ubicación: 1.2km de la Ruta 180
- **DEBE APARECER** en el match de Marco
- Desvío esperado: ~1.2km

**❌ Pedro (Cliente B - LEJOS)**
- Ubicación: 5km de la Ruta 180 (sector rural)
- **NO DEBE APARECER** en el match de Marco
- Desvío: >2km (fuera del límite quirúrgico)

---

## 📋 PASOS DE EJECUCIÓN

### **PASO 1: Preparar el Entorno**

```bash
# 1. Ejecutar migraciones del Modo Viaje
cd c:\wamp64\www\jobshour-api
php artisan migrate

# 2. Crear usuarios de prueba
php artisan db:seed --class=TravelModeTestSeeder
```

**Resultado esperado:**
```
🎬 Creando escenario de testing para Modo Viaje...

👤 Creando Worker: Marco (Renaico → Angol)
   ✅ Marco creado en Renaico (-37.67, -72.57)
   📧 Email: marco.test@jobshour.cl | Password: password123

👤 Creando Cliente A: María (CERCA - debe matchear)
   ✅ María creada a ~1.2km de la Ruta 180
   📧 Email: maria.test@jobshour.cl | Password: password123
   🎯 DEBE APARECER en el match de Marco

👤 Creando Cliente B: Pedro (LEJOS - NO debe matchear)
   ✅ Pedro creado a ~5km de la Ruta 180
   📧 Email: pedro.test@jobshour.cl | Password: password123
   ❌ NO DEBE APARECER en el match de Marco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ESCENARIO DE TESTING CREADO
```

---

### **PASO 2: Activar Modo Viaje (Marco)**

**Login como Marco:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marco.test@jobshour.cl",
    "password": "password123"
  }'
```

**Guardar el token de Marco:**
```bash
export MARCO_TOKEN="<token_recibido>"
```

**Activar ruta Renaico → Angol:**
```bash
curl -X POST http://localhost:8000/api/v1/worker/travel-mode/activate \
  -H "Authorization: Bearer $MARCO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin_lat": -37.67,
    "origin_lng": -72.57,
    "origin_address": "Centro de Renaico",
    "destination_lat": -37.80,
    "destination_lng": -72.71,
    "destination_address": "Angol",
    "departure_time": "2026-02-17T18:00:00Z",
    "available_seats": 3,
    "cargo_space": "paquete",
    "route_type": "personal"
  }'
```

**✅ Verificar respuesta:**
```json
{
  "status": "success",
  "message": "🚗 Modo Viaje activado. El sistema buscará necesidades en tu ruta.",
  "data": {
    "active_route": {
      "status": "active",
      "origin": {"lat": -37.67, "lng": -72.57, "address": "Centro de Renaico"},
      "destination": {"lat": -37.80, "lng": -72.71, "address": "Angol"},
      "distance_km": 13.2,
      "available_seats": 3
    },
    "potential_matches": 1,  // ← Debe ser 1 (solo María)
    "matches": [...]
  }
}
```

**🔍 Punto de verificación 1:**
- [ ] `potential_matches` debe ser **1** (solo María, no Pedro)
- [ ] `active_route.status` debe ser **"active"**
- [ ] `distance_km` debe ser ~13km (Renaico-Angol)

---

### **PASO 3: María Solicita Viaje (CERCA - debe matchear)**

**Login como María:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.test@jobshour.cl",
    "password": "password123"
  }'

export MARIA_TOKEN="<token_recibido>"
```

**Solicitar viaje:**
```bash
curl -X POST http://localhost:8000/api/v1/travel-requests \
  -H "Authorization: Bearer $MARIA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type": "ride",
    "pickup_lat": -37.735,
    "pickup_lng": -72.625,
    "pickup_address": "Mi casa (cerca de Ruta 180)",
    "delivery_lat": -37.80,
    "delivery_lng": -72.71,
    "delivery_address": "Angol Centro",
    "passenger_count": 1,
    "offered_price": 3000
  }'
```

**✅ Verificar respuesta:**
```json
{
  "status": "success",
  "message": "🚗 Buscando conductores que van en tu dirección...",
  "data": {
    "request_id": 123,
    "matches_found": 1,  // ← DEBE SER 1 (Marco)
    "matches": [
      {
        "worker_id": 1,
        "worker_name": "Marco Pérez",
        "worker_avatar": "https://...",
        "pickup_detour_km": 1.2,  // ← Debe ser ≤2km
        "delivery_detour_km": 0.3,
        "total_detour_km": 1.5,   // ← Debe ser ≤4km
        "active_route": {
          "departure_time": "2026-02-17T18:00:00Z",
          "available_seats": 3
        }
      }
    ]
  }
}
```

**🔍 Punto de verificación 2:**
- [ ] `matches_found` debe ser **1** (Marco)
- [ ] `pickup_detour_km` debe ser **≤2km**
- [ ] `delivery_detour_km` debe ser **≤2km**
- [ ] `total_detour_km` debe ser **≤4km**
- [ ] Respuesta en **<1 segundo** ⚡

---

### **PASO 4: Pedro Solicita Viaje (LEJOS - NO debe matchear)**

**Login como Pedro:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pedro.test@jobshour.cl",
    "password": "password123"
  }'

export PEDRO_TOKEN="<token_recibido>"
```

**Solicitar viaje:**
```bash
curl -X POST http://localhost:8000/api/v1/travel-requests \
  -H "Authorization: Bearer $PEDRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type": "ride",
    "pickup_lat": -37.745,
    "pickup_lng": -72.575,
    "pickup_address": "Sector rural (lejos de ruta)",
    "delivery_lat": -37.80,
    "delivery_lng": -72.71,
    "delivery_address": "Angol Centro",
    "passenger_count": 1,
    "offered_price": 5000
  }'
```

**✅ Verificar respuesta:**
```json
{
  "status": "success",
  "message": "🚗 Buscando conductores que van en tu dirección...",
  "data": {
    "request_id": 124,
    "matches_found": 0,  // ← DEBE SER 0 (Pedro está muy lejos)
    "matches": []
  }
}
```

**🔍 Punto de verificación 3:**
- [ ] `matches_found` debe ser **0** (sin matches)
- [ ] `matches` debe ser **array vacío**
- [ ] Sistema respetó el ADN: **"No desviar de más"**

---

### **PASO 5: Caso Especial - María Envía Sobre (Delivery)**

**Solicitar delivery:**
```bash
curl -X POST http://localhost:8000/api/v1/travel-requests \
  -H "Authorization: Bearer $MARIA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type": "delivery",
    "pickup_lat": -37.735,
    "pickup_lng": -72.625,
    "pickup_address": "Mi casa",
    "delivery_lat": -37.80,
    "delivery_lng": -72.71,
    "delivery_address": "Oficina en Angol",
    "carga_tipo": "sobre",
    "carga_peso": 0.5,
    "description": "Documentos importantes",
    "offered_price": 2000
  }'
```

**✅ Verificar respuesta:**
```json
{
  "status": "success",
  "message": "📦 Buscando personas que pueden llevar tu encomienda...",
  "data": {
    "request_id": 125,
    "request_type": "delivery",
    "matches_found": 1,  // ← DEBE SER 1 (mismo match que ride)
    "matches": [
      {
        "worker_name": "Marco Pérez",
        "pickup_detour_km": 1.2,
        "delivery_detour_km": 0.3,
        "total_detour_km": 1.5
      }
    ]
  }
}
```

**🔍 Punto de verificación 4:**
- [ ] `matches_found` debe ser **1** (delivery matchea igual que ride)
- [ ] `request_type` debe ser **"delivery"**
- [ ] Desvío debe ser el **mismo** que para ride

---

### **PASO 6: Marco Acepta Solicitud de María**

**Aceptar solicitud:**
```bash
curl -X POST http://localhost:8000/api/v1/travel-requests/123/accept \
  -H "Authorization: Bearer $MARCO_TOKEN" \
  -H "Content-Type: application/json"
```

**✅ Verificar respuesta:**
```json
{
  "status": "success",
  "message": "✅ Solicitud aceptada. Coordina con el cliente para la recogida.",
  "data": {
    "request": {
      "id": 123,
      "status": "accepted",
      "client": {
        "name": "María González",
        "avatar": "https://..."
      }
    },
    "pickup_address": "Mi casa (cerca de Ruta 180)",
    "delivery_address": "Angol Centro"
  }
}
```

**🔍 Punto de verificación 5:**
- [ ] `status` debe ser **"accepted"**
- [ ] Marco recibe **dirección exacta** de María
- [ ] Sistema muestra **nombre y avatar** del cliente

---

### **PASO 7: Verificar en la UI (Frontend)**

**Login en la app web como Marco:**
1. Ir a `http://localhost:3000`
2. Login: `marco.test@jobshour.cl` / `password123`
3. Abrir modal "Modo Viaje"
4. Ingresar: Renaico → Angol
5. Clic "Activar Modo Viaje"

**✅ Verificar UI:**
- [ ] Modal muestra **matches proactivos** (María)
- [ ] Card de María muestra:
  - [ ] Avatar
  - [ ] Nombre
  - [ ] Desvío en km
  - [ ] Precio ofrecido
  - [ ] Botón "Ver detalles"

**Login como María:**
1. Login: `maria.test@jobshour.cl` / `password123`
2. Solicitar viaje a Angol
3. Ver lista de matches

**✅ Verificar UI:**
- [ ] Card de Marco muestra:
  - [ ] **Video CV** (si existe)
  - [ ] Avatar
  - [ ] Nombre
  - [ ] Desvío
  - [ ] Hora de salida
  - [ ] Asientos disponibles
  - [ ] Botón "Solicitar viaje"

---

## 🎯 PUNTOS CRÍTICOS A OBSERVAR

### **1. ¿Es Rápido? ⚡**
- Match PostGIS debe ser **instantáneo** (<1s)
- Si demora, el sistema **no escalará**
- Verificar con: `time curl ...`

### **2. ¿Es Lógico? 🧠**
- Sistema **NO** debe ofrecer a alguien que:
  - Te hace retroceder
  - Te desvía >2km por punto
  - Está en dirección opuesta
- Si ofrece matches ilógicos, el algoritmo de `ST_MakeLine` está fallando

### **3. La Identidad (Programa Social) 🎥**
- Al ver el match, cliente debe ver:
  - [ ] **Video CV del worker** (confianza)
  - [ ] Avatar
  - [ ] Rating
  - [ ] Nombre completo
- **Esto es crucial:** La confianza hace que el cliente se suba al auto

### **4. Elasticidad del Sistema 🔧**
- `request_type` debe aceptar:
  - `ride` (pasajeros)
  - `delivery` (encomiendas)
  - Futuros: `asistencia_en_ruta`, etc.
- Sistema debe tratar **delivery con la misma prioridad** que ride

---

## 🧪 TESTING AUTOMATIZADO

**Ejecutar suite completa de tests:**

```bash
cd c:\wamp64\www\jobshour-api
php artisan test --filter TravelModeValidationTest
```

**Tests incluidos:**
1. ✅ Marco activa Modo Viaje
2. ✅ María solicita viaje (debe matchear)
3. ✅ Pedro solicita viaje (NO debe matchear)
4. ✅ María envía sobre (delivery)
5. ✅ Marco acepta solicitud
6. ✅ Performance (<1s)

**Resultado esperado:**
```
PASS  Tests\Feature\TravelModeValidationTest
✓ test 1 marco activa modo viaje renaico angol
✓ test 2 maria solicita viaje debe matchear
✓ test 3 pedro solicita viaje no debe matchear
✓ test 4 maria envia sobre delivery
✓ test 5 marco acepta solicitud de maria
✓ test 6 performance match debe ser rapido

Tests:  6 passed
Time:   2.34s
```

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### **Error 1: María NO matchea (debería matchear)**

**Síntoma:**
```json
{
  "matches_found": 0,
  "matches": []
}
```

**Causa probable:**
- Query PostGIS no está calculando bien la distancia a la línea
- Filtro de 2km está muy estricto

**Solución:**
```sql
-- Verificar manualmente la distancia
SELECT 
  ST_Distance(
    ST_SetSRID(ST_MakePoint(-72.625, -37.735), 4326)::geography,
    ST_MakeLine(
      ST_SetSRID(ST_MakePoint(-72.57, -37.67), 4326),
      ST_SetSRID(ST_MakePoint(-72.71, -37.80), 4326)
    )::geography
  ) / 1000 as distance_km;
-- Debe retornar ~1.2km
```

### **Error 2: Pedro SÍ matchea (NO debería)**

**Síntoma:**
```json
{
  "matches_found": 1,
  "matches": [{"worker_name": "Marco Pérez"}]
}
```

**Causa probable:**
- Filtro de 2km no se está aplicando
- Query WHERE está mal

**Solución:**
Verificar en `TravelRequestController.php`:
```php
WHERE
  ST_Distance(rp.pickup_point::geography, ar.route_line::geography) < 2000
  AND ST_Distance(rp.delivery_point::geography, ar.route_line::geography) < 2000
```

### **Error 3: Match tarda >1s**

**Síntoma:**
```bash
time curl ... 
# real    0m2.345s  ← MUY LENTO
```

**Causa probable:**
- Falta índice GIN en `active_route`
- Falta índice GIST en `location`

**Solución:**
```sql
-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'workers';

-- Debe mostrar:
-- workers_active_route_gin
-- workers_location_spatial
```

---

## ✅ CHECKLIST DE VALIDACIÓN FINAL

**Backend:**
- [ ] Migraciones ejecutadas correctamente
- [ ] Seeder creó 3 usuarios (Marco, María, Pedro)
- [ ] Marco puede activar Modo Viaje
- [ ] María matchea con Marco (1.2km)
- [ ] Pedro NO matchea con Marco (5km)
- [ ] Delivery matchea igual que ride
- [ ] Marco puede aceptar solicitudes
- [ ] Match responde en <1s

**Frontend:**
- [ ] Modal "Modo Viaje" se abre correctamente
- [ ] Muestra matches proactivos
- [ ] Cliente ve Video CV del worker
- [ ] Cards muestran desvío en km
- [ ] Animaciones Framer Motion funcionan
- [ ] Botones de acción funcionan

**UX:**
- [ ] Usuario no siente que cambió de app
- [ ] Mensajes son claros y motivadores
- [ ] Confianza: Video CV visible
- [ ] Transparencia: Desvío exacto mostrado

---

## 🎉 CRITERIO DE ÉXITO

**El testing es exitoso si:**

1. ✅ **María matchea** con Marco (desvío 1.2km)
2. ❌ **Pedro NO matchea** con Marco (desvío 5km)
3. ⚡ **Match en <1 segundo**
4. 📦 **Delivery funciona** igual que ride
5. 🎥 **Video CV visible** en la UI
6. 🧠 **Lógica correcta**: No ofrece matches ilógicos

**Si todos los puntos pasan → Sistema listo para producción 🚀**

---

## 📞 CONTACTO

Si encuentran algún problema durante el testing:

1. Revisar logs: `storage/logs/laravel.log`
2. Verificar query PostGIS manualmente
3. Ejecutar tests automatizados
4. Reportar con screenshots y logs

---

**Muchachos, este es el momento de validar que el ADN del sistema funciona. La "Prioridad al Recurso" es lo que hace que JobsHour sea diferente. ¡A trabajar!** 🚗⚡
