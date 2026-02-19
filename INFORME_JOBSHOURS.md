# JOBSHOURS — Informe Técnico y de Negocio
**Fecha:** 19 de Febrero 2026  
**Versión:** MVP 0.1.0  
**Estado:** En desarrollo activo — funcional en ambiente local + túnel Cloudflare  

---

## 1. ¿Qué es JobsHours?

JobsHours es un **marketplace geolocalizado de servicios en tiempo real**. Conecta personas que necesitan algo **ahora** (un electricista, un delivery, un viaje, una compra) con personas cercanas dispuestas a hacerlo.

**No es un portal de empleos tradicional.** Es una plataforma donde la oferta y la demanda se encuentran en un mapa en vivo, con transacciones que ocurren en minutos, no días.

### Analogía rápida
> "Es como Uber, pero para **cualquier servicio**: arreglar una llave, entregar una pizza, compartir un viaje, o comprar algo en una tienda."

---

## 2. Modelo de Negocio

### 2.1 Los 3 actores

| Actor | Rol | Cómo gana |
|-------|-----|-----------|
| **Cliente** | Publica demandas ("necesito X") | Obtiene servicio rápido y cercano |
| **Socio (Worker)** | Se activa en el mapa y toma demandas | Cobra el precio pactado |
| **JobsHours** | Plataforma + pagos + confianza | Comisión por transacción (Flow.cl) |

### 2.2 Tipos de servicio soportados

| Tipo | Ejemplo | Estado |
|------|---------|--------|
| 🔧 **Trabajo fijo** | "Necesito electricista ahora" | ✅ Implementado |
| 📦 **Mandado/Compra** | "Comprar X en tienda Y y traerlo" | ✅ Implementado |
| 🚗 **Viaje compartido** | "Voy a Angol, tengo 2 asientos" | ✅ Implementado |

### 2.3 Casos de uso reales

| # | Situación | Tipo | Cómo lo resuelve JobsHours |
|---|-----------|------|---------------------------|
| 1 | 🍕 Un restaurante necesita que alguien entregue una pizza | `express_errand` | Publica demanda con dirección de entrega + foto del pedido → el repartidor más cercano la toma |
| 2 | ⚡ Una persona necesita arreglar un problema eléctrico | `fixed_job` | Publica demanda urgente → ve electricistas activos cerca en el mapa → el más cercano la toma |
| 3 | 🚗 Alguien viaja a Angol y quiere ofrecer un asiento | `ride_share` | Publica demanda con origen, destino, hora y asientos → pasajeros cercanos la ven en el feed |
| 4 | 🛒 Una persona necesita comprar un producto en un negocio | `express_errand` | Publica demanda con nombre de tienda + lista + foto → alguien cercano la compra y entrega |

### 2.4 Flujo de una transacción típica

```
1. Cliente publica demanda (descripción, precio, foto, urgencia, TTL)
2. Demanda aparece como PIN DORADO en el mapa + feed de Demandas
3. Workers cercanos la ven ordenada por DISTANCIA (más cercano primero)
4. Worker toca "Tomar solicitud" → demanda desaparece del feed
5. Se abre chat entre cliente y worker
6. Worker realiza el servicio
7. Cliente confirma → pago vía Flow.cl → calificación mutua
```

### 2.4 Monetización

- **Comisión por servicio** — Se cobra al cerrar vía pasarela Flow.cl (integrado)
- **Créditos** — Sistema de créditos para revelar contacto de workers (implementado)
- **Pioneros** — Badge especial para early adopters (campo `is_pioneer` en BD)

---

## 3. Arquitectura Técnica

### 3.1 Stack

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 14 + React 18 + TypeScript             │
│  Leaflet (mapas) + Framer Motion (animaciones)  │
│  Pusher/Echo (WebSocket real-time)              │
│  TailwindCSS (estilos)                          │
│  Puerto: 3002 (dev) / 3001 (prod)              │
├─────────────────────────────────────────────────┤
│              PROXY / GATEWAY                     │
│  Next.js Rewrites → /api/* → backend:8095       │
│  Cloudflare Tunnel → jobshour.dondemorales.cl   │
├─────────────────────────────────────────────────┤
│                   BACKEND                        │
│  Laravel 11 + PHP 8.2 + Sanctum (auth)          │
│  Laravel Reverb (WebSocket server)              │
│  Spatie Permissions (roles)                      │
│  Intervention Image + FFmpeg (media)             │
├─────────────────────────────────────────────────┤
│                 DATOS                            │
│  PostgreSQL 16 + PostGIS 3.4 (geoespacial)      │
│  Redis 7 (cache, sesiones, queues)              │
├─────────────────────────────────────────────────┤
│              INFRAESTRUCTURA                     │
│  Docker Compose (5 contenedores)                │
│  Nginx (reverse proxy)                           │
│  Cloudflare Tunnel (exposición pública)         │
└─────────────────────────────────────────────────┘
```

### 3.2 Contenedores Docker

| Contenedor | Imagen | Puerto | Función |
|------------|--------|--------|---------|
| `jobshour-api` | PHP 8.2 custom | — | Laravel API |
| `jobshour-nginx` | nginx:alpine | 8095→80 | Reverse proxy |
| `jobshour-db` | postgis/postgis:16 | 5434→5432 | Base de datos geoespacial |
| `jobshour-redis` | redis:7-alpine | 6381→6379 | Cache + queues |
| `jobshour-reverb` | PHP 8.2 custom | 8085→8080 | WebSocket server |

### 3.3 Base de datos (21 modelos)

**Modelos principales:**
- `User` — Usuarios (auth, avatar, nickname, créditos, FCM token)
- `Worker` — Perfil de trabajador (categorías, ubicación PostGIS, availability_status, rating, CV, video CV, QR)
- `ServiceRequest` — Demandas/solicitudes (ubicación, precio, estado, tipo, payload JSONB, TTL, fotos)
- `Category` — Categorías de servicio (color, icono, slug)
- `Message` — Chat en tiempo real entre partes
- `Review` — Calificaciones (1-5 estrellas + comentario)
- `Payment` — Pagos vía Flow.cl

**Modelos secundarios:**
- `ProfileView` — Tracking de vistas de perfil
- `SearchLog` — Analytics de búsquedas
- `ContactReveal` — Créditos gastados en ver teléfono
- `WorkerExperience` — Experiencias laborales del worker
- `ServiceDispute` — Disputas entre partes
- `Friendship` — Red social entre usuarios
- `Video` — Video CV y showcase
- `Notification` / `NotificationPreference` — Sistema de notificaciones
- `Nudge` — Mensajes motivacionales rotativos

### 3.4 Capacidades geoespaciales (PostGIS)

- **Búsqueda por radio:** `ST_DWithin` para encontrar workers/demandas en X km
- **Distancia real:** `ST_Distance` para calcular km entre usuario y servicio
- **Ubicación fuzzeada:** Coordenadas con ruido (+/- 0.001°) para privacidad
- **Escalado automático:** Si no hay resultados en 5km, busca en 15km, luego 50km

---

## 4. Frontend — Componentes (51 archivos TSX)

### 4.1 Pantallas principales

| Componente | Función |
|------------|---------|
| `page.tsx` | Orquestador principal (~2300 líneas) — mapa, estado, navegación |
| `MapSection.tsx` | Mapa Leaflet con pins de workers (verde/amarillo) y demandas (dorado) |
| `DashboardFeed.tsx` | Feed de demandas disponibles (scroll infinito, 36 slots) |
| `MisSolicitudes.tsx` | Solicitudes propias del usuario (activas, históricas, cancelar) |
| `WorkerProfileHub.tsx` | Hub de perfil del worker (CV, video, experiencias, categorías) |

### 4.2 Sistema de pins en mapa

| Color | Significado | Visibilidad |
|-------|-------------|-------------|
| 🟢 Verde | Worker activo — disponible ahora | Radio completo (hasta 50km) |
| 🟡 Amarillo | Worker intermedio — a convenir | Solo 5km cercanos |
| ⚫ Gris | Worker inactivo | NO aparece en mapa |
| 🟠 Dorado | Demanda activa (cliente necesita algo) | Radio completo |

### 4.3 Flujos interactivos implementados

- **Publicar demanda** — 3 tipos (trabajo, viaje, compra) + foto + urgencia + TTL
- **Tomar demanda** — Worker toma → pin desaparece → chat se abre
- **Cancelar solicitud** — Demanda vuelve a pending → reaparece en feed
- **Chat real-time** — WebSocket vía Pusher/Reverb + envío de imágenes
- **Modo Viaje** — Activar ruta con origen/destino/hora/asientos
- **Calificación** — Modal post-servicio con estrellas + comentario
- **Pago** — Integración con Flow.cl (pasarela chilena)
- **Tarjeta de verificación** — QR + datos del worker (exportable PDF)
- **Registro/Login** — Email + Google Social Auth
- **Notificaciones** — Push + in-app con preferencias configurables

### 4.4 UX actual

- **Mobile-first** — Diseñado para celular, bottom tab navigation
- **Dark mode** en tarjetas y feed
- **Animaciones** con Framer Motion
- **"Cómo llegar"** — Botón en cada demanda que abre Google Maps
- **Nudge ticker** — Mensajes motivacionales rotativos cada 12s
- **Meta del día** — Indicador de earnings vs meta configurable
- **Live Stats** — "Hay X socios activos en tu radio"

---

## 5. Backend — API (37 controllers)

### 5.1 Endpoints principales

| Controller | Endpoints clave |
|------------|----------------|
| `ExpertController` | `GET /experts/nearby` — Buscar workers por radio + categoría |
| `DemandMapController` | `GET /demand/nearby` + `POST /demand/publish` — Demandas geolocalizadas |
| `DashboardController` | `GET /dashboard/feed` + `/live-stats` — Feed inteligente con mix emocional |
| `ServiceRequestController` | CRUD de solicitudes + `myRequests` |
| `ChatController` | Enviar/recibir mensajes + imágenes |
| `WorkerModeController` | Cambiar estado (active/intermediate/inactive) + ubicación |
| `TravelModeController` | Activar/desactivar modo viaje con ruta |
| `FlowController` | Iniciar/confirmar pago con Flow.cl |
| `ReviewController` | Crear/responder calificaciones |
| `ContactRevealController` | Gastar créditos para ver teléfono |

### 5.2 WebSocket Events (11 eventos)

- `WorkerLocationUpdated` — Posición en tiempo real
- `WorkerAvailabilityChanged` — Cambio de estado verde/amarillo/gris
- `NewMessage` — Mensaje de chat
- `ServiceRequestCreated/Updated` — Nueva demanda / cambio de estado
- `DemandAlert` — Alerta a workers cercanos
- `ProfileViewed` — Notificación de vista de perfil
- `PinDiedEvent` — Demanda expirada

### 5.3 Feed inteligente (DashboardController)

El feed no es una lista simple. Tiene un **algoritmo de "Mix Emocional"**:

```
Slots  1-3:   TOP PREMIUM — Mayor pago + urgencia alta
Slots  4-15:  ACTIVE — Cercanos, pendientes, sin worker
Slots 16-24:  MIX URGENT — Urgentes restantes
Slots 25-36:  HISTÓRICOS — Completados recientes (validación social)
```

---

## 6. Estado Actual — ¿Qué funciona y qué falta?

### 6.1 ✅ Funcional (MVP)

| Feature | Estado | Notas |
|---------|--------|-------|
| Mapa con workers en tiempo real | ✅ | PostGIS + Leaflet + WebSocket |
| 3 estados de worker (verde/amarillo/inactivo) | ✅ | Con UI de cambio de estado |
| Publicar demandas (3 tipos) | ✅ | Con foto, urgencia, TTL |
| Feed de demandas por cercanía | ✅ | Algoritmo mix emocional |
| Tomar/cancelar demanda | ✅ | Con actualización inmediata de UI |
| Chat real-time | ✅ | WebSocket + imágenes |
| Sistema de calificaciones | ✅ | 1-5 estrellas + comentario |
| Perfil worker con CV/video | ✅ | Upload + QR card |
| Categorías múltiples | ✅ | Worker puede tener varias |
| Modo viaje | ✅ | Ruta con asientos disponibles |
| Pagos con Flow.cl | ✅ | Integración completa |
| Auth (email + Google) | ✅ | Sanctum + Socialite |
| "Cómo llegar" (Google Maps) | ✅ | En demandas y solicitudes |
| Demandas programadas | ✅ | "Necesito electricista el viernes a las 10am" |
| Multi-worker | ✅ | "Necesito 3 personas para mudanza" (1-20 personas) |
| Demandas recurrentes | ✅ | Una vez, diario, semanal, o días personalizados |
| Compartir en WhatsApp | ✅ | Botón en cada tarjeta de demanda |
| Cuentas empresa | ✅ | Flag is_business + business_name + business_type |
| Foto adjunta en demandas | ✅ | Upload imagen hasta 5MB en publicación |
| Docker containerizado | ✅ | 5 contenedores |
| Exposición pública | ✅ | Cloudflare tunnel |

### 6.2 ⚠️ Parcial / Necesita mejoras

| Feature | Estado | Qué falta |
|---------|--------|-----------|
| Tracking en tiempo real del worker | ⚠️ | Componente existe pero no conectado al flujo principal |
| Confirmación de entrega | ⚠️ | Existe `delivery_photo` en BD pero sin flujo UI |
| Notificaciones push (FCM) | ⚠️ | Campo `fcm_token` existe, falta implementar envío |
| Match por ruta geográfica | ⚠️ | Worker en modo viaje no filtra demandas por su ruta |
| Dispute resolution | ⚠️ | Modelo `ServiceDispute` existe, UI básica |

### 6.3 ❌ No implementado

| Feature | Prioridad | Impacto |
|---------|-----------|---------|
| App nativa (React Native / PWA) | Alta | Experiencia móvil real |
| Panel admin | Alta | Gestión de usuarios, categorías, disputes |
| Analytics dashboard | Media | Métricas de negocio, conversión, retention |
| Sistema de pagos automáticos | Media | Ahora es manual/Flow |
| Verificación de identidad | Media | Solo email/Google, sin RUT/CI |
| SEO / Landing page | Media | Solo tiene la app, no landing marketing |
| Tests automatizados | Media | 0 tests actualmente |
| CI/CD pipeline | Baja | Deploy es manual |

---

## 7. Métricas del código

| Métrica | Valor |
|---------|-------|
| **Componentes React** | 51 archivos .tsx |
| **Controllers Laravel** | 37 archivos .php |
| **Modelos de datos** | 21 modelos |
| **Migraciones** | 42 migraciones |
| **Eventos WebSocket** | 11 eventos |
| **Líneas `page.tsx`** | ~2,300 |
| **Tipos de servicio** | 3 (fixed_job, ride_share, express_errand) |
| **Roles de worker** | 3 (active, intermediate, inactive) |

---

## 8. Infraestructura de deploy actual

```
[Máquina local Windows]
    ├── Docker Desktop
    │   ├── PostgreSQL 16 + PostGIS
    │   ├── Redis 7
    │   ├── Nginx → Laravel API (puerto 8095)
    │   └── Laravel Reverb WebSocket (puerto 8085)
    │
    ├── Next.js dev server (puerto 3002)
    │
    └── Cloudflare Tunnel
        └── jobshour.dondemorales.cl → localhost:3002
```

**Para producción se necesita:**
- VPS o cloud (DigitalOcean / AWS / Railway)
- PostgreSQL + PostGIS managed
- Redis managed
- Dominio propio + SSL
- CI/CD pipeline

---

## 9. Ventajas competitivas técnicas

1. **PostGIS real** — No es "calcular distancia en JS". Usa índices geoespaciales nativos de PostgreSQL para búsquedas eficientes en radio.

2. **WebSocket real** — Workers se mueven en el mapa en tiempo real. Las demandas aparecen al instante. No es polling.

3. **Privacy by design** — Ubicaciones fuzzeadas para proteger al usuario hasta que acepte un servicio.

4. **Feed inteligente** — No es cronológico. Mezcla urgencia, precio y cercanía para maximizar conversión.

5. **3 verticales en 1** — Trabajo fijo + delivery/compras + viaje compartido usan la misma infraestructura.

---

## 10. Riesgos y deuda técnica

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| `page.tsx` tiene 2,300 líneas | 🔴 Alta | Refactorizar en sub-componentes y hooks |
| 0 tests automatizados | 🔴 Alta | Agregar PHPUnit + Jest/Playwright |
| Deploy desde máquina local | 🟡 Media | Migrar a VPS con CI/CD |
| Sin panel admin | 🟡 Media | Construir con Laravel Nova o similar |
| Auth solo email+Google | 🟡 Media | Agregar verificación de identidad real |
| Sin rate limiting robusto | 🟡 Media | Implementar throttling por IP/usuario |

---

## 11. Próximos pasos recomendados

### Corto plazo (1-2 semanas)
1. **Tests básicos** — Endpoints críticos (auth, demandas, pagos)
2. **Panel admin** — CRUD categorías, ver usuarios, moderar
3. **Notificaciones push** — FCM ya tiene campo en BD, solo falta envío
4. **Deploy en VPS** — Salir de localhost

### Mediano plazo (1-2 meses)
5. **PWA** — Convertir Next.js en Progressive Web App (installable)
6. **Verificación identidad** — RUT o CI para confianza
7. **Analytics** — Dashboard con métricas de negocio
8. **Refactoring `page.tsx`** — Dividir en módulos manejables

### Largo plazo (3-6 meses)
9. **App nativa** — React Native con el mismo backend
10. **Expansión geográfica** — Multi-ciudad con categorías locales
11. **API pública** — Para integraciones de terceros
12. **Machine learning** — Pricing sugerido, match inteligente

---

*Informe generado desde el análisis directo del código fuente del proyecto.*  
*Repositorios: `jobshour-api` (Laravel) + `jobshour-web` (Next.js)*
