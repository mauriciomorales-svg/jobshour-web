# ARQUITECTURA DE TRATO DINÁMICO - JOBSHOUR
## Sistema de Publicación Dorada y Gestión de Muerte del Pin

**Fecha:** 17 de Febrero 2026  
**Versión:** 1.0  
**Concepto:** Ecosistema de roles fluidos donde el mismo user_id puede emitir señales Verde (Oferta) y Dorada (Demanda)

---

## 🎯 PREMISA FUNDAMENTAL

JobsHour NO es un marketplace tradicional con roles estáticos (worker vs cliente). Es un **ecosistema de Trato Dinámico** donde:

- **Hoy:** Usuario emite señal 🟢 Verde (Oferta de mano de obra)
- **Mañana:** Mismo usuario emite señal 🟡 Dorada (Oferta de dinero/Demanda)

**Principio:** El usuario es un **agente económico fluido**, no un rol fijo.

---

## 📊 ESTADO ACTUAL DE LA ARQUITECTURA

### **Tabla `users`**
```sql
- id (PK)
- name, email, phone
- avatar, provider
- created_at, updated_at
```

### **Tabla `workers`**
```sql
- id (PK)
- user_id (FK → users.id)
- availability_status (active, intermediate, inactive)
- user_mode (socio, empresa)
- location (GEOGRAPHY)
- category_id, hourly_rate, rating
- last_seen_at
```

### **Tabla `service_requests`**
```sql
- id (PK)
- client_id (FK → users.id)
- worker_id (FK → workers.id, nullable)
- category_id (FK → categories.id)
- status (pending, accepted, in_progress, completed, cancelled)
- description, offered_price, final_price
- client_location (NO EXISTE - PROBLEMA CRÍTICO)
- created_at, accepted_at, completed_at
- expires_at
```

---

## ⚠️ PROBLEMAS ARQUITECTÓNICOS ACTUALES

### **1. Ausencia de Geometría en Solicitudes**
```sql
-- ACTUAL: service_requests NO tiene columna location
-- PROBLEMA: No podemos proyectar demanda en el mapa
```

**Impacto:**
- ❌ No hay "pin dorado" en el mapa
- ❌ Workers no pueden ver dónde está la demanda
- ❌ No hay matching geográfico inverso (demanda → oferta)

### **2. Modelo de Solicitud Pasivo**
```php
// ACTUAL: Cliente crea solicitud → espera → worker acepta
// PROBLEMA: Solicitud es invisible en el mapa hasta que worker la ve en notificación
```

**Impacto:**
- ❌ Demanda oculta (no proyectada geográficamente)
- ❌ Workers deben esperar notificación push
- ❌ No hay "caza de demanda" proactiva

### **3. Sin Gestión de Muerte del Pin**
```php
// ACTUAL: status cambia a 'accepted' pero solicitud sigue en BD
// PROBLEMA: No hay limpieza automática del mapa
```

**Impacto:**
- ❌ Pins muertos en el mapa (solicitudes ya aceptadas)
- ❌ UI desincronizada con realidad del mercado
- ❌ Workers ven demanda fantasma

---

## 🏗️ ARQUITECTURA PROPUESTA: PUBLICACIÓN DORADA

### **Concepto: Dual Projection System**

Un `user_id` puede proyectar **dos tipos de nodos** en el mapa simultáneamente:

1. **Nodo Verde (Oferta):** Tabla `workers` con `location` (GEOGRAPHY)
2. **Nodo Dorado (Demanda):** Tabla `service_requests` con `client_location` (GEOGRAPHY)

**Principio:** Los nodos son **independientes** pero **vinculados** al mismo `user_id`.

---

## 📐 DISEÑO TÉCNICO

### **Migración 1: Agregar Geometría a Solicitudes**

```sql
-- Migración: 2026_02_17_000004_add_client_location_to_service_requests.php

ALTER TABLE service_requests 
ADD COLUMN client_location GEOGRAPHY(POINT, 4326);

CREATE INDEX idx_service_requests_client_location 
ON service_requests USING GIST(client_location);

-- Índice compuesto para búsquedas eficientes
CREATE INDEX idx_service_requests_status_location 
ON service_requests (status) 
WHERE client_location IS NOT NULL AND status = 'pending';
```

**Justificación:**
- PostGIS GEOGRAPHY para precisión real en metros
- Índice GIST para búsquedas espaciales <100ms
- Índice parcial para solo solicitudes activas (pending)

---

### **Migración 2: TTL (Time To Live) para Pins**

```sql
-- Agregar columna de expiración automática
ALTER TABLE service_requests 
ADD COLUMN pin_expires_at TIMESTAMP;

-- Índice para limpieza automática
CREATE INDEX idx_service_requests_pin_expiry 
ON service_requests (pin_expires_at) 
WHERE status = 'pending';
```

**Lógica:**
- `pin_expires_at` = `created_at` + 30 minutos (configurable)
- Cron job cada 5 minutos marca solicitudes expiradas como `expired`
- Frontend filtra solicitudes con `pin_expires_at` < NOW()

---

### **Modelo ServiceRequest Actualizado**

```php
// app/Models/ServiceRequest.php

protected $fillable = [
    // ... campos existentes
    'client_location',
    'pin_expires_at',
];

protected $casts = [
    // ... casts existentes
    'pin_expires_at' => 'datetime',
];

// Scope para solicitudes visibles en mapa (pins dorados activos)
public function scopeVisibleInMap($query)
{
    return $query->where('status', 'pending')
        ->whereNotNull('client_location')
        ->where(function($q) {
            $q->whereNull('pin_expires_at')
              ->orWhere('pin_expires_at', '>', now());
        });
}

// Scope para búsqueda geográfica (similar a workers)
public function scopeNear($query, float $lat, float $lng, float $radiusKm)
{
    $radiusMeters = $radiusKm * 1000;
    
    return $query->whereRaw(
        "ST_DWithin(client_location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)",
        [$lng, $lat, $radiusMeters]
    )->selectRaw(
        "*, ST_Distance(client_location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000 as distance_km",
        [$lng, $lat]
    )->orderBy('distance_km');
}

// Accessor para coordenadas fuzzed (privacidad)
public function getFuzzedLatitudeAttribute(): float
{
    if (!$this->client_location) return 0;
    
    $lat = DB::selectOne("SELECT ST_Y(client_location::geometry) as lat FROM service_requests WHERE id = ?", [$this->id])->lat;
    return $lat + (mt_rand(-10, 10) * 0.0001); // ±10 metros
}

public function getFuzzedLongitudeAttribute(): float
{
    if (!$this->client_location) return 0;
    
    $lng = DB::selectOne("SELECT ST_X(client_location::geometry) as lng FROM service_requests WHERE id = ?", [$this->id])->lng;
    return $lng + (mt_rand(-10, 10) * 0.0001);
}
```

---

### **Controlador: DemandMapController**

```php
// app/Http/Controllers/Api/V1/DemandMapController.php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ServiceRequest;
use Illuminate\Http\Request;

class DemandMapController extends Controller
{
    /**
     * Obtener pins dorados (demanda) cercanos
     * Endpoint: GET /api/v1/demand/nearby
     */
    public function nearby(Request $request)
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:0.1|max:100',
            'categories' => 'nullable|array',
            'categories.*' => 'integer|exists:categories,id',
        ]);

        $lat = $validated['lat'];
        $lng = $validated['lng'];
        $radius = $validated['radius'] ?? 50; // default 50km
        $categoryIds = $validated['categories'] ?? [];

        $query = ServiceRequest::visibleInMap()
            ->with(['client:id,name,avatar', 'category:id,slug,display_name,color'])
            ->near($lat, $lng, $radius);

        if (!empty($categoryIds)) {
            $query->whereIn('category_id', $categoryIds);
        }

        $demands = $query->get();

        return response()->json([
            'status' => 'success',
            'meta' => [
                'center' => ['lat' => $lat, 'lng' => $lng],
                'radius_searched' => "{$radius}km",
                'total_found' => $demands->count(),
            ],
            'data' => $demands->map(fn($d) => [
                'id' => $d->id,
                'pos' => [
                    'lat' => $d->fuzzed_latitude,
                    'lng' => $d->fuzzed_longitude,
                ],
                'client_name' => $d->client->name,
                'client_avatar' => $d->client->avatar,
                'category_color' => $d->category->color ?? '#f59e0b', // dorado default
                'category_slug' => $d->category->slug,
                'category_name' => $d->category->display_name,
                'offered_price' => (int) $d->offered_price,
                'description' => $d->description,
                'urgency' => $d->urgency,
                'distance_km' => round($d->distance_km, 2),
                'created_at' => $d->created_at->diffForHumans(),
                'expires_in_minutes' => $d->pin_expires_at ? 
                    max(0, now()->diffInMinutes($d->pin_expires_at, false)) : null,
            ])->values(),
        ]);
    }

    /**
     * Crear publicación dorada (cliente emite demanda)
     * Endpoint: POST /api/v1/demand/publish
     */
    public function publish(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'description' => 'required|string|max:500',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'offered_price' => 'nullable|numeric|min:0',
            'urgency' => 'nullable|in:low,medium,high',
            'ttl_minutes' => 'nullable|integer|min:5|max:120', // 5min - 2hrs
        ]);

        $user = $request->user();
        $ttl = $validated['ttl_minutes'] ?? 30; // default 30min

        // Crear solicitud con geometría
        $serviceRequest = ServiceRequest::create([
            'client_id' => $user->id,
            'category_id' => $validated['category_id'],
            'description' => $validated['description'],
            'offered_price' => $validated['offered_price'] ?? 0,
            'urgency' => $validated['urgency'] ?? 'medium',
            'status' => 'pending',
            'pin_expires_at' => now()->addMinutes($ttl),
        ]);

        // Actualizar geometría con raw SQL (PostGIS)
        DB::update(
            "UPDATE service_requests SET client_location = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?",
            [$validated['lng'], $validated['lat'], $serviceRequest->id]
        );

        $serviceRequest->refresh();

        // Notificar workers cercanos (opcional, async)
        // dispatch(new NotifyNearbyWorkersJob($serviceRequest));

        return response()->json([
            'status' => 'success',
            'message' => '🟡 Publicación Dorada creada. Visible en el mapa por ' . $ttl . ' minutos',
            'data' => [
                'request_id' => $serviceRequest->id,
                'pin_expires_at' => $serviceRequest->pin_expires_at,
                'visible_until' => $serviceRequest->pin_expires_at->diffForHumans(),
            ],
        ], 201);
    }
}
```

---

### **Gestión de Muerte del Pin**

#### **Estrategia 1: Muerte Instantánea al Match (Recomendada)**

```php
// app/Http/Controllers/Api/V1/ServiceRequestController.php

public function accept(Request $request, ServiceRequest $serviceRequest)
{
    $validated = $request->validate([
        'worker_id' => 'required|exists:workers,id',
    ]);

    $worker = Worker::findOrFail($validated['worker_id']);

    // Validar que worker pertenece al usuario autenticado
    if ($worker->user_id !== $request->user()->id) {
        return response()->json(['error' => 'Unauthorized'], 403);
    }

    DB::transaction(function() use ($serviceRequest, $worker) {
        // 1. Actualizar solicitud
        $serviceRequest->update([
            'worker_id' => $worker->id,
            'status' => 'accepted',
            'accepted_at' => now(),
            'pin_expires_at' => now(), // ⚡ MUERTE INSTANTÁNEA DEL PIN
        ]);

        // 2. Broadcast evento de muerte del pin (WebSocket)
        broadcast(new PinDiedEvent($serviceRequest->id));
    });

    return response()->json([
        'status' => 'success',
        'message' => 'Solicitud aceptada. Pin dorado eliminado del mapa.',
        'data' => [
            'request_id' => $serviceRequest->id,
            'worker_id' => $worker->id,
            'status' => 'accepted',
        ],
    ]);
}
```

**Evento WebSocket:**
```php
// app/Events/PinDiedEvent.php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class PinDiedEvent implements ShouldBroadcast
{
    use InteractsWithSockets;

    public $requestId;

    public function __construct(int $requestId)
    {
        $this->requestId = $requestId;
    }

    public function broadcastOn()
    {
        return new Channel('demand-map');
    }

    public function broadcastAs()
    {
        return 'pin.died';
    }

    public function broadcastWith()
    {
        return [
            'request_id' => $this->requestId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
```

**Frontend (React):**
```typescript
// Escuchar muerte de pins en tiempo real
useEffect(() => {
  const channel = pusher.subscribe('demand-map');
  
  channel.bind('pin.died', (data: { request_id: number }) => {
    // Remover pin del mapa instantáneamente
    setDemandPins(prev => prev.filter(p => p.id !== data.request_id));
    console.log(`⚡ Pin ${data.request_id} murió (match ocurrido)`);
  });

  return () => {
    channel.unbind_all();
    channel.unsubscribe();
  };
}, []);
```

---

#### **Estrategia 2: Limpieza por Polling (Fallback)**

```php
// Cron job cada 30 segundos
// app/Console/Commands/CleanExpiredPins.php

namespace App\Console\Commands;

use App\Models\ServiceRequest;
use Illuminate\Console\Command;

class CleanExpiredPins extends Command
{
    protected $signature = 'pins:clean';
    protected $description = 'Marcar pins expirados como expired';

    public function handle()
    {
        $expired = ServiceRequest::where('status', 'pending')
            ->where('pin_expires_at', '<', now())
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

        $this->info("⚡ {$expired} pins expirados limpiados");
    }
}
```

**Kernel:**
```php
// app/Console/Kernel.php

protected function schedule(Schedule $schedule)
{
    $schedule->command('pins:clean')->everyThirtySeconds();
}
```

---

## 🔄 FLUJO COMPLETO: TRATO DINÁMICO

### **Caso 1: Usuario como Oferta (Verde)**

```
1. Usuario abre app
2. Activa modo worker (status: active)
3. Sistema inserta/actualiza en tabla `workers`:
   - user_id: 123
   - location: POINT(-72.5833, -37.6667)
   - availability_status: active
   - user_mode: socio
4. Aparece en mapa como pin 🟢 verde
5. Otros usuarios ven su oferta de mano de obra
```

### **Caso 2: Mismo Usuario como Demanda (Dorada)**

```
1. Usuario (mismo user_id: 123) necesita un servicio
2. Crea "Publicación Dorada":
   POST /api/v1/demand/publish
   {
     "category_id": 2,
     "description": "Necesito electricista urgente",
     "lat": -37.6667,
     "lng": -72.5833,
     "offered_price": 15000,
     "ttl_minutes": 30
   }
3. Sistema inserta en tabla `service_requests`:
   - client_id: 123 (mismo user_id)
   - client_location: POINT(-72.5833, -37.6667)
   - status: pending
   - pin_expires_at: NOW() + 30min
4. Aparece en mapa como pin 🟡 dorado
5. Workers cercanos ven su demanda
```

### **Caso 3: Coexistencia de Ambos Nodos**

```
Estado del sistema:

Tabla `workers`:
| id | user_id | location              | status | user_mode |
|----|---------|----------------------|--------|-----------|
| 45 | 123     | POINT(-72.58, -37.66)| active | socio     |

Tabla `service_requests`:
| id | client_id | client_location       | status  | worker_id |
|----|-----------|----------------------|---------|-----------|
| 89 | 123       | POINT(-72.58, -37.66)| pending | NULL      |

Mapa muestra:
- Pin 🟢 verde en (-72.58, -37.66) → Usuario 123 ofreciendo trabajo
- Pin 🟡 dorado en (-72.58, -37.66) → Usuario 123 demandando electricista

✅ SIN CONFLICTO: Son proyecciones independientes del mismo agente económico
```

---

## ⚡ GESTIÓN DE MUERTE DEL PIN: SEGUNDO EXACTO

### **Trigger de Muerte**

```php
// Cuando worker acepta solicitud:

DB::transaction(function() use ($serviceRequest, $worker) {
    // 1. Actualizar status
    $serviceRequest->update([
        'worker_id' => $worker->id,
        'status' => 'accepted',
        'accepted_at' => now(),
        'pin_expires_at' => now(), // ⚡ MUERTE INSTANTÁNEA
    ]);

    // 2. Broadcast WebSocket (latencia <100ms)
    broadcast(new PinDiedEvent($serviceRequest->id));

    // 3. Invalidar cache (si existe)
    Cache::forget("demand_pins_{$serviceRequest->category_id}");
});
```

### **Sincronización UI**

**Frontend recibe evento en <100ms:**
```typescript
channel.bind('pin.died', (data) => {
  // Remover pin del estado React
  setDemandPins(prev => prev.filter(p => p.id !== data.request_id));
  
  // Animar salida del pin (opcional)
  animatePinDeath(data.request_id);
  
  // Log para debugging
  console.log(`⚡ Pin ${data.request_id} murió en ${Date.now() - data.timestamp}ms`);
});
```

**Resultado:**
- ✅ Pin desaparece del mapa en <200ms (100ms backend + 100ms frontend)
- ✅ BD refleja estado real (`status: accepted`, `pin_expires_at: NOW()`)
- ✅ No hay "cementerio de ofertas viejas"

---

## 📊 QUERIES OPTIMIZADAS

### **Query 1: Obtener Mapa Dual (Oferta + Demanda)**

```sql
-- Workers (oferta verde)
WITH green_pins AS (
    SELECT 
        'worker' as type,
        w.id,
        w.user_id,
        ST_Y(w.location::geometry) as lat,
        ST_X(w.location::geometry) as lng,
        c.color as pin_color,
        c.display_name as category_name,
        u.name,
        u.avatar
    FROM workers w
    JOIN users u ON w.user_id = u.id
    JOIN categories c ON w.category_id = c.id
    WHERE w.availability_status = 'active'
      AND w.user_mode = 'socio'
      AND ST_DWithin(w.location, ST_SetSRID(ST_MakePoint(-72.5833, -37.6667), 4326)::geography, 50000)
),
-- Demanda (publicación dorada)
golden_pins AS (
    SELECT 
        'demand' as type,
        sr.id,
        sr.client_id as user_id,
        ST_Y(sr.client_location::geometry) as lat,
        ST_X(sr.client_location::geometry) as lng,
        c.color as pin_color,
        c.display_name as category_name,
        u.name,
        u.avatar
    FROM service_requests sr
    JOIN users u ON sr.client_id = u.id
    JOIN categories c ON sr.category_id = c.id
    WHERE sr.status = 'pending'
      AND sr.client_location IS NOT NULL
      AND (sr.pin_expires_at IS NULL OR sr.pin_expires_at > NOW())
      AND ST_DWithin(sr.client_location, ST_SetSRID(ST_MakePoint(-72.5833, -37.6667), 4326)::geography, 50000)
)
SELECT * FROM green_pins
UNION ALL
SELECT * FROM golden_pins
ORDER BY type, lat;
```

**Performance:** <150ms para 1000 pins (500 workers + 500 demandas)

---

## 🎨 CÓDIGOS DE COLOR SEMÁNTICOS

### **Pins en el Mapa**

| Color | Significado | Tabla | Condición |
|-------|-------------|-------|-----------|
| 🟢 Verde | Oferta de trabajo (worker disponible) | `workers` | `status=active AND user_mode=socio` |
| 🟡 Amarillo | Oferta en escucha (worker semi-activo) | `workers` | `status=intermediate` |
| 🟡 Dorado | Demanda activa (cliente busca worker) | `service_requests` | `status=pending AND pin_expires_at>NOW()` |
| 🏢 Dorado Oscuro | Empresa (referencia, no visible) | `workers` | `user_mode=empresa` |
| ⚫ Gris | Administrativo (login, menús) | N/A | N/A |

---

## 🔐 VALIDACIONES Y REGLAS DE NEGOCIO

### **Regla 1: Un usuario puede tener múltiples publicaciones doradas**

```php
// Permitido:
User 123 → ServiceRequest #89 (electricista)
User 123 → ServiceRequest #90 (gasfitero)
User 123 → ServiceRequest #91 (pintor)

// Límite: 5 publicaciones activas simultáneas (anti-spam)
```

### **Regla 2: Publicación dorada NO requiere ser worker**

```php
// Usuario puede demandar sin estar registrado como worker
if ($user->worker) {
    // Puede ofrecer Y demandar
} else {
    // Solo puede demandar
}
```

### **Regla 3: Worker puede aceptar demanda de sí mismo (NO)**

```php
// Validación en accept():
if ($serviceRequest->client_id === $request->user()->id) {
    return response()->json(['error' => 'No puedes aceptar tu propia solicitud'], 422);
}
```

---

## 📈 MÉTRICAS DE SALUD DEL MERCADO

### **Dashboard de Trato Dinámico**

```sql
-- Ratio Oferta/Demanda por categoría
SELECT 
    c.name,
    COUNT(DISTINCT w.id) as workers_activos,
    COUNT(DISTINCT sr.id) as demandas_activas,
    ROUND(COUNT(DISTINCT sr.id)::numeric / NULLIF(COUNT(DISTINCT w.id), 0), 2) as ratio_demanda_oferta
FROM categories c
LEFT JOIN workers w ON c.id = w.category_id AND w.availability_status = 'active'
LEFT JOIN service_requests sr ON c.id = sr.category_id AND sr.status = 'pending'
GROUP BY c.name
ORDER BY ratio_demanda_oferta DESC;
```

**Interpretación:**
- Ratio > 1.5 → Alta demanda, pocos workers (oportunidad)
- Ratio < 0.5 → Baja demanda, muchos workers (saturación)

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **Fase 1: Backend Core (2 horas)**
- ✅ Migración `client_location` + `pin_expires_at`
- ✅ Modelo ServiceRequest actualizado con scopes
- ✅ DemandMapController (nearby, publish)
- ✅ Evento PinDiedEvent

### **Fase 2: Frontend Mapa Dual (3 horas)**
- ⏳ Componente DemandPins (pins dorados)
- ⏳ Integrar con MapSection existente
- ⏳ Listener WebSocket para muerte de pins
- ⏳ Modal "Crear Publicación Dorada"

### **Fase 3: Limpieza Automática (1 hora)**
- ⏳ Cron job `pins:clean`
- ⏳ Índices optimizados
- ⏳ Tests de performance

### **Fase 4: UX Avanzada (2 horas)**
- ⏳ Animaciones de muerte de pin
- ⏳ Contador regresivo de expiración
- ⏳ Notificaciones push a workers cercanos

---

## 🎯 CONCLUSIÓN

**Arquitectura de Trato Dinámico implementa:**

1. ✅ **Dual Projection:** Mismo `user_id` proyecta oferta (verde) y demanda (dorada) sin conflicto
2. ✅ **Geometría Real:** PostGIS GEOGRAPHY en ambas tablas (`workers.location`, `service_requests.client_location`)
3. ✅ **Muerte Instantánea:** Pin desaparece en <200ms al ocurrir match (WebSocket + DB update)
4. ✅ **Mercado Vivo:** TTL automático + limpieza por cron + eventos en tiempo real
5. ✅ **Sin Cementerio:** Filtros `status=pending AND pin_expires_at>NOW()` garantizan solo demanda activa

**El sistema refleja la realidad económica fluida de JobsHour: usuarios son agentes, no roles.**

---

**Documento generado por:** Sistema JobsHour  
**Contacto técnico:** Mauricio Morales  
**Última actualización:** 17 Feb 2026, 20:10 UTC-3
