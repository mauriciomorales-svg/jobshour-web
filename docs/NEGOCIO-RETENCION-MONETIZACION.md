# Negocio: retención y monetización

Documento vivo: hipótesis, métricas de éxito y prioridad. Asume **clientes y trabajadores** en el mismo producto y **pago frecuentemente fuera de la app** (efectivo/transferencia), salvo que activéis cobro integrado.

---

## Iniciativa 1 — Recordatorio de solicitudes activas (retención)

**Hipótesis:** Los usuarios que tienen solicitudes en `pending` / `accepted` / `in_progress` pero navegan solo el mapa **no vuelven al chat** a tiempo; un recordatorio visible aumenta el re-engagement con el hilo de la solicitud.

**Qué hay en producto (2026):** Cintillo `OpenRequestsBanner` cuando hay ≥1 solicitud activa (mismo criterio que el sync de `useActiveServiceRequests`), con CTA “Ver” → pestaña Solicitudes. Se puede descartar por sesión (`sessionStorage`); al pasar de tener solicitudes activas a cero, se resetea el descarte para la próxima vez que vuelvan a tener actividad.

**Métricas de éxito (4–8 semanas):**

| Métrica | Objetivo direccional |
|--------|----------------------|
| CTR del cintillo (tap “Ver” / impresiones) | > 5–10% en usuarios elegibles |
| Tiempo hasta primer mensaje tras crear solicitud | ↓ mediana |
| Solicitudes que expiran sin chat | ↓ |

**Siguiente iteración:** Push FCM con el mismo copy (si aún no saturáis); A/B copy del cintillo.

**Eventos en cliente (para CTR y embudo):**

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `open_requests_banner_view` | Primera vez que el cintillo pasa a visible en esa “aparición” | `{ count }` |
| `open_requests_banner_click` | Tap en “Ver” | `{ count }` |
| `open_requests_banner_dismiss` | Tap en “✕” | `{ count }` |
| `worker_availability_banner_view` | Cintillo “¿Listo para trabajar?” visible | `{}` |
| `worker_availability_banner_activate` | Tap en “Activar” | `{}` |
| `worker_availability_banner_dismiss` | Tap en “✕” | `{}` |

Implementación: `trackEvent()` en `src/lib/analytics.ts` — dispara `CustomEvent` `jh_analytics` y, si está definido `NEXT_PUBLIC_ANALYTICS_INGEST`, envía el mismo payload por **POST** (preferencia `navigator.sendBeacon`, si no `fetch` con `keepalive`). Ver `docs/ENV.md`.

**Ruta Next (sumidero):** `POST /api/jh-analytics` en `src/app/api/jh-analytics/route.ts` — responde **204**, valida el body y opcionalmente reenvía a `ANALYTICS_FORWARD_URL` (Laravel u otro). Cabecera opcional `ANALYTICS_FORWARD_SECRET` → `X-Analytics-Secret`.

**Backend Laravel:** `POST /api/v1/analytics/events` en `jobshour-api` — tabla `product_analytics_events` (incluye `user_id` si el cliente envía `Authorization: Bearer` con token Sanctum válido). Variable **`ANALYTICS_INGEST_SECRET`**: si está definida, el cliente debe enviar cabecera `X-Analytics-Secret` con el mismo valor (recomendado en producción). Ejecutar migración: `php artisan migrate`. Admins: **`ADMIN_USER_IDS`**. Limpieza antigua: **`php artisan analytics:prune`**. Pushes de retención (mismo texto que cintillos): comandos `retention:push-open-requests` y `retention:push-worker-availability` + scheduler.

**Lectura admin (token Sanctum, mismo criterio de admin que el panel):**

- `GET /api/v1/admin/analytics/summary` — conteos por `name` en ventanas **D1** (últimas 24 h) y **D7** (últimos 7 días) según `created_at` del servidor; totales y `unique_ips` (aprox. clientes distintos por IP).
- `GET /api/v1/admin/analytics/events` — listado paginado con filtros opcionales `name`, `from`, `to`, `per_page`.

**Eventos adicionales de pantalla (embudo / tráfico):**

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `home_app_mount` | Primera carga de la app web (home) | `{}` |
| `landing_view` | Página `/landing` | `{}` |
| `worker_public_profile_view` | Perfil público `/worker/[id]` cargado | `{ worker_id }` |
| `tienda_view` | Tienda `/tienda/[workerId]` con datos del vendedor | `{ worker_id }` |

**Cintillo trabajador (inactivo):** `WorkerAvailabilityBanner` (`src/app/components/WorkerAvailabilityBanner.tsx`) cuando `workerStatus === 'inactive'`, hay categorías y el usuario está en mapa. Eventos: `worker_availability_banner_view` | `worker_availability_banner_activate` | `worker_availability_banner_dismiss`. Si además hay cintillo de solicitudes activas, se apila más arriba para no solaparse.

---

## Iniciativa 2 — “Boost” de demanda o visibilidad (monetización temprana)

**Hipótesis:** Con densidad baja de oferta, la comisión por transacción **no escala**; un **primer SKU de pago** simple (demanda destacada 24h o radio ampliado) valida disposición a pagar sin bloquear el flujo.

**Criterio de éxito:** Al menos **un** pago real por semana por ciudad piloto, con tasa de conversión aceptable desde “publicar demanda” (aunque sea baja al principio).

**Riesgos:** Percepción de “solo si pagas”; mitigar con límites claros y gratis para la primera demanda.

**Implementado (2026):** `boosted_until` en `service_requests`, orden en `GET /demand/nearby`, admin `POST /admin/demands/{id}/boost`, pago cliente **`POST /api/v1/payments/mp/demand-boost`** (Checkout Pro) con webhook `external_reference` `boost:{id}`. UI: botón **Destacar en mapa** en `MisSolicitudes` (demanda pendiente, rol cliente). Variables **`BOOST_DEMAND_PRICE_CLP`**, **`BOOST_DEMAND_HOURS`**, **`FRONTEND_URL`**.

---

## Iniciativa 3 — Métricas de embudo compartidas (retención + monetización)

**Hipótesis:** Sin tablero mínimo, no se puede priorizar ni retención ni pricing.

**Definiciones mínimas:**

| Métrica | Definición |
|--------|------------|
| **D1 / D7** | Usuario que vuelve a abrir la app a los 1 / 7 días del registro o primera acción clave |
| **Time-to-first-reply** | Desde `pending` hasta primer mensaje en chat (o aceptación) |
| **Tasa de abandono** | Solicitudes `pending`/`accepted` sin actividad en X horas |

**Implementación:** Eventos servidor (o `POST /api/v1/analytics/events` batch) + dashboard (Metabase, Looker, o hoja + export). El cliente puede disparar eventos solo para UX; la **fuente de verdad** debe ser backend o analítica.

---

## Orden recomendado

1. **Cintillo + medición** (evento `open_requests_banner_view` / `open_requests_banner_click` cuando añadáis analytics).  
2. **Tablero D1/D7 + time-to-f** (aunque sea manual).  
3. **Boost** de demanda tras validar que el embudo de chat no está roto.

---

## Referencia de código

- Conteo de solicitudes activas: `useActiveServiceRequests` → `openActiveRequestsCount`.
- UI: `src/app/components/OpenRequestsBanner.tsx`.
- Analytics: `src/lib/analytics.ts` (`trackEvent`, `sendAnalyticsIngest`), API `src/app/api/jh-analytics/route.ts`, tests en `src/lib/analytics.test.ts`.
- Panel admin web: pestaña **Analytics** en `src/app/admin/page.tsx` (resumen D1/D7 + tabla de eventos vía `GET /api/v1/admin/analytics/summary` y `.../events`).
- Trabajador inactivo: `WorkerAvailabilityBanner.tsx`.
