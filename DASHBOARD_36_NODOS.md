# DASHBOARD DE 36 NODOS - ESPECIFICACIÓN TÉCNICA
## Sistema de Feed Emocional con Tipos de Trabajo Polimórficos

**Fecha:** 17 de Febrero 2026  
**Versión:** 1.0  
**Concepto:** Feed infinito de oportunidades con bidireccionalidad Dashboard ↔ Mapa

---

## 🎯 OBJETIVO

Crear un Dashboard que sea un **"Feed de Oportunidades"** infinito donde:

- **36 slots iniciales** con impacto emocional (mix de active, urgent, completed)
- **Paginación cursor-based** por distancia (expansión radial +10km por página)
- **Bidireccionalidad** Dashboard ↔ Mapa (click en tarjeta → flyTo en mapa, click en pin → scroll a tarjeta)
- **Tipos polimórficos** de trabajo (FIXED_JOB, RIDE_SHARE, EXPRESS_ERRAND)

---

## 📊 TIPOS DE TRABAJO (Polimórficos)

### **1. FIXED_JOB (Oficio) 🟡**

**Ejemplos:** Electricista, Carpintero, Mecánico, Pintor

**Atributos en `payload` JSONB:**
```json
{
  "skills": ["Electricidad", "Instalación LED"],
  "hourly_rate": 15000,
  "estimated_hours": 2
}
```

**Características:**
- Ubicación única (`client_location` POINT)
- Precio cerrado o por hora
- Requiere skills específicos

**Color UI:** Dorado (`amber-500`)

---

### **2. RIDE_SHARE (Modo Viaje) 🔵**

**Ejemplos:** Traslado Los Ángeles → Concepción, Viaje compartido

**Atributos en `payload` JSONB:**
```json
{
  "available_seats": 3,
  "departure_time": "2026-02-18T14:30:00Z",
  "destination": "Concepción",
  "vehicle_type": "Sedan"
}
```

**Características:**
- Ruta completa (`route` LINESTRING de PostGIS)
- Asientos disponibles
- Hora de salida
- Mapa muestra ruta completa (A → B)

**Color UI:** Azul (`blue-400`)

---

### **3. EXPRESS_ERRAND (Mandado/Compra) 🟣**

**Ejemplos:** Compras en Jumbo, Retiro en Sodimac, Farmacia

**Atributos en `payload` JSONB:**
```json
{
  "store_name": "Jumbo",
  "item_list": ["Leche", "Pan", "Huevos"],
  "load_type": "medium",
  "estimated_weight_kg": 10
}
```

**Características:**
- Nombre del comercio
- Lista de items
- Nivel de carga (light, medium, heavy)

**Color UI:** Púrpura (`purple-400`)

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### **Migración Ejecutada**

```sql
-- Columnas agregadas a service_requests
ALTER TABLE service_requests 
  ADD COLUMN category_type VARCHAR(20) DEFAULT 'fixed',
  ADD COLUMN payload JSONB,
  ADD COLUMN route GEOGRAPHY(LINESTRING, 4326);

-- Constraint para tipos válidos
ALTER TABLE service_requests 
  ADD CONSTRAINT service_requests_category_type_check 
  CHECK (category_type IN ('fixed', 'travel', 'errand'));

-- Índices para performance
CREATE INDEX idx_service_requests_category_type ON service_requests (category_type, status);
CREATE INDEX idx_service_requests_payload ON service_requests USING GIN (payload);
CREATE INDEX idx_service_requests_route ON service_requests USING GIST(route);
```

### **Modelo ServiceRequest**

```php
protected $fillable = [
    'category_type',  // 'fixed', 'travel', 'errand'
    'payload',        // JSONB con datos específicos
    // ... otros campos
];

protected $casts = [
    'payload' => 'array',
    // ... otros casts
];
```

---

## 🎨 ALGORITMO DE FEED EMOCIONAL

### **Bloque Inicial (36 Slots)**

**Slots 1-3: TOP PREMIUM** (Oportunidades de mayor pago + urgencia)
- Query: `urgency = 'high'` + `ORDER BY offered_price DESC`
- Template: `premium` (ancho completo, miniatura de mapa de fondo)

**Slots 4-15: ACTIVE** (Cercanía)
- Query: `status = 'pending'` + `ORDER BY distance_km ASC`
- Template: `standard` (grid 2 columnas)

**Slots 16-24: MIX URGENT** (Pares: Travel, Impares: Errand)
- Query: `urgency = 'high'` mezclado con tipos
- Template: `standard`

**Slots 25-36: HISTÓRICOS** (Validación Social)
- Query: `status = 'completed'` + `ORDER BY completed_at DESC`
- Template: `historical` (opacidad 50%, cliente anonimizado)
- Mensaje: "Alguien ganó $X hace poco"

### **Paginación Infinita (Slots 37+)**

**Expansión Radial:**
```
Página 0 (slots 0-35):   radio = 50km
Página 1 (slots 36-71):  radio = 60km (+10km)
Página 2 (slots 72-107): radio = 70km (+10km)
...
```

**Template:** `minimal` (solo título, precio, distancia)

---

## 🔄 BIDIRECCIONALIDAD DASHBOARD ↔ MAPA

### **Dashboard → Mapa (Enfoque)**

**Acción:** Usuario toca una tarjeta en el Dashboard

**Reacción:**
1. Emitir evento `SELECT_MISSION` con `{ id, lat, lng, category_type }`
2. Mapa ejecuta:
   - **FIXED_JOB / ERRAND:** `map.flyTo([lat, lng], zoom: 18)`
   - **RIDE_SHARE:** `map.fitBounds(route.getBounds())`
3. Pin dorado correspondiente hace "pulse" (animación)

### **Mapa → Dashboard (Sincronía)**

**Acción:** Usuario toca un Pin Dorado o Ruta en el mapa

**Reacción:**
1. Emitir evento `SELECT_PIN` con `{ request_id }`
2. Dashboard ejecuta:
   - Auto-scroll hasta la tarjeta correspondiente
   - Aplicar efecto "glow dorado" (border pulsante)
   - Mantener resaltado por 3 segundos

---

## 📡 API ENDPOINTS

### **GET /api/v1/dashboard/feed**

**Parámetros:**
```json
{
  "lat": -37.4689,
  "lng": -72.3527,
  "cursor": 0,
  "radius": 50
}
```

**Respuesta:**
```json
{
  "status": "success",
  "meta": {
    "cursor": 0,
    "next_cursor": 36,
    "radius_km": 50,
    "total_returned": 36,
    "has_more": true
  },
  "data": [
    {
      "id": 123,
      "category_type": "fixed",
      "status": "pending",
      "template": "premium",
      "pos": { "lat": -37.47, "lng": -72.35 },
      "client": { "name": "Juan P.", "avatar": "..." },
      "category": { "name": "Electricidad", "color": "#f59e0b" },
      "offered_price": 25000,
      "urgency": "high",
      "distance_km": 1.2,
      "created_at": "hace 5 minutos",
      "payload": {
        "skills": ["Electricidad", "LED"],
        "hourly_rate": 15000
      }
    },
    // ... 35 más
  ]
}
```

### **GET /api/v1/dashboard/live-stats**

**Parámetros:**
```json
{
  "lat": -37.4689,
  "lng": -72.3527,
  "radius": 50
}
```

**Respuesta:**
```json
{
  "status": "success",
  "data": {
    "active_workers": 14,
    "active_demands": 28,
    "message": "Hay 14 socios activos en tu radio ahora mismo"
  }
}
```

---

## 🎨 COMPONENTES UI (React + TypeScript)

### **1. DashboardFeed.tsx** (Componente Principal)

```typescript
interface DashboardFeedProps {
  userLat: number;
  userLng: number;
  onCardClick: (request: ServiceRequest) => void;
}

const DashboardFeed: React.FC<DashboardFeedProps> = ({ userLat, userLng, onCardClick }) => {
  const [feed, setFeed] = useState<ServiceRequest[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/dashboard/feed?lat=${userLat}&lng=${userLng}&cursor=${cursor}`);
    const data = await res.json();
    setFeed(prev => [...prev, ...data.data]);
    setCursor(data.meta.next_cursor);
    setLoading(false);
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div className="space-y-4">
      {feed.map((request, index) => (
        <ServiceCard 
          key={request.id}
          request={request}
          index={index}
          onClick={() => onCardClick(request)}
        />
      ))}
      
      {loading && <SkeletonCards count={6} />}
      
      <InfiniteScroll onReachEnd={loadMore} />
    </div>
  );
};
```

### **2. ServiceCard.tsx** (Tarjeta Polimórfica)

```typescript
interface ServiceCardProps {
  request: ServiceRequest;
  index: number;
  onClick: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ request, index, onClick }) => {
  // Determinar template según posición
  const template = request.template || (index < 3 ? 'premium' : index < 24 ? 'standard' : 'historical');

  // Colores según category_type
  const colors = {
    fixed: 'from-amber-500 to-yellow-600',
    travel: 'from-blue-400 to-blue-600',
    errand: 'from-purple-400 to-purple-600',
  };

  if (template === 'premium') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`relative w-full h-48 rounded-2xl bg-gradient-to-r ${colors[request.category_type]} p-6 cursor-pointer shadow-2xl`}
      >
        {/* Miniatura de mapa de fondo */}
        <div className="absolute inset-0 opacity-20">
          <MiniMap lat={request.pos.lat} lng={request.pos.lng} />
        </div>

        <div className="relative z-10 text-white">
          <h3 className="text-2xl font-black mb-2">${request.offered_price.toLocaleString()}</h3>
          <p className="text-sm opacity-90">{request.description}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs bg-white/20 px-2 py-1 rounded">{request.distance_km}km</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">{request.urgency}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (template === 'standard') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className="bg-slate-800 rounded-xl p-4 border border-slate-700 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${colors[request.category_type]} flex items-center justify-center text-2xl`}>
            {request.category_type === 'fixed' && '🔧'}
            {request.category_type === 'travel' && '🚗'}
            {request.category_type === 'errand' && '🛍️'}
          </div>
          
          <div className="flex-1">
            <h4 className="font-bold text-white">{request.description}</h4>
            <p className="text-sm text-slate-400">{request.category.name}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-lg font-black text-emerald-400">${request.offered_price.toLocaleString()}</span>
              <span className="text-xs text-slate-500">{request.distance_km}km</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (template === 'historical') {
    return (
      <div className="bg-slate-900/50 rounded-lg p-3 opacity-50 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Alguien ganó ${request.offered_price.toLocaleString()}</span>
          <span className="text-xs text-slate-600">{request.completed_at}</span>
        </div>
      </div>
    );
  }

  return null;
};
```

### **3. LiveStats.tsx** (Contador "Pueblo Vivo")

```typescript
const LiveStats: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const [stats, setStats] = useState({ active_workers: 0, message: '' });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch(`/api/v1/dashboard/live-stats?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      setStats(data.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, [lat, lng]);

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
      <div className="flex items-center gap-2">
        <span className="text-3xl">🌍</span>
        <div>
          <p className="text-sm opacity-90">Pueblo Vivo</p>
          <p className="font-black">{stats.message}</p>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎮 GAMIFICACIÓN

### **1. Barra de Meta Diaria**

```typescript
const DailyGoalBar: React.FC = () => {
  const [viewed, setViewed] = useState(0);
  const goal = 50000; // Meta diaria $50.000

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-slate-400">Meta Diaria</span>
        <span className="text-sm font-bold text-emerald-400">${viewed.toLocaleString()} / ${goal.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${(viewed / goal) * 100}%` }}
        />
      </div>
    </div>
  );
};
```

### **2. Skeleton Screens (Paginación)**

```typescript
const SkeletonCards: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
      </div>
    ))}
  </>
);
```

---

## 🚀 IMPLEMENTACIÓN COMPLETADA

### **Backend**
- ✅ Migración ejecutada: `category_type`, `payload` JSONB, `route` LINESTRING
- ✅ Modelo ServiceRequest actualizado con casts
- ✅ DashboardController con algoritmo de feed emocional
- ✅ Seeder con 30 ejemplos (5 fixed, 3 travel, 4 errand)
- ✅ Rutas API: `/dashboard/feed`, `/dashboard/live-stats`

### **Estructura de Datos**
```
service_requests:
├─ category_type: ENUM('fixed', 'travel', 'errand')
├─ payload: JSONB (datos específicos por tipo)
├─ client_location: GEOGRAPHY(POINT)
├─ route: GEOGRAPHY(LINESTRING) [solo travel]
└─ pin_expires_at: TIMESTAMP
```

### **API Response Format**
```json
{
  "id": 123,
  "category_type": "fixed|travel|errand",
  "template": "premium|standard|historical|minimal",
  "payload": { /* datos específicos */ },
  "pos": { "lat": -37.47, "lng": -72.35 },
  "offered_price": 25000,
  "distance_km": 1.2
}
```

---

## 📋 PRÓXIMOS PASOS (Frontend)

1. **Crear componentes React:**
   - `DashboardFeed.tsx` (contenedor principal)
   - `ServiceCard.tsx` (tarjeta polimórfica)
   - `LiveStats.tsx` (contador pueblo vivo)
   - `DailyGoalBar.tsx` (barra de meta)

2. **Integrar con mapa:**
   - Event emitter para `SELECT_MISSION` y `SELECT_PIN`
   - Listener en MapSection para `flyTo` y `fitBounds`
   - Listener en Dashboard para auto-scroll

3. **Infinite Scroll:**
   - Intersection Observer en slot 36
   - Trigger `loadMore()` al entrar en viewport

4. **Animaciones (Framer Motion):**
   - Pulse en pins al hover en tarjeta
   - Glow dorado en tarjeta al click en pin
   - Transiciones suaves Dashboard ↔ Mapa

---

**Sistema de Dashboard de 36 Nodos implementado y listo para integración frontend.** 🎯

