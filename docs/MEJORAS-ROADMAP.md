# Roadmap de mejoras — jobshour-web

Plan priorizado para abordar deuda técnica, operación y calidad. Cada fase puede hacerse en PRs separados.

---

## Fase 0 — Operación (hecho o en curso)

| ID | Tarea | Estado |
|----|--------|--------|
| 0.1 | Deploy manual alineado: `scripts/deploy-on-server.sh` con `npm ci` sin `NODE_ENV=production` previo, `NEXT_PUBLIC_*` en build, `pm2 reload` | Hecho |
| 0.2 | `getPublicApiBase()` para no embeber localhost en clientes | Hecho |
| 0.3 | Service Worker: subir `CACHE_NAME` cuando haya release visible | Manual por release |
| 0.4 | **CI deploy = mismo script que VPS** (`.github/workflows/ci.yml` llama `deploy-on-server.sh`) | Hecho |

---

## Fase 1 — Calidad mínima (1–2 días)

| ID | Tarea | Criterio de hecho |
|----|--------|-------------------|
| 1.1 | Añadir **ESLint** + `eslint-config-next` | Hecho (`npm run lint`) |
| 1.2 | Script **`lint`** en `package.json` | Hecho (`next lint --max-warnings 99999`) |
| 1.3 | Añadir job **lint** en CI antes del build (o dentro del mismo job) | Hecho |
| 1.4 | Corregir solo **errores** ESLint críticos (no todo el estilo de golpe) | Hecho (hooks en `ServiceRequestModal`; resto warnings) |

---

## Fase 2 — Tests de humo (2–3 días)

| ID | Tarea | Criterio de hecho |
|----|--------|-------------------|
| 2.1 | Instalar **Vitest** o **Jest** + `jsdom` mínimo | Hecho (`vitest`) |
| 2.2 | Tests unitarios: `getPublicApiBase` / `apiUrl` (`src/lib/api.ts`) | Hecho (`src/lib/api.test.ts`) |
| 2.3 | Test opcional: `readInitialMapCoords` o helpers puros si se extraen | Pendiente (helpers en `mapStorage.ts`) |
| 2.4 | CI: paso `npm run test` | Hecho |

---

## Fase 3 — Arquitectura: partir `page.tsx` (varios días / varias PRs)

| ID | Tarea | Notas |
|----|--------|--------|
| 3.1 | Extraer hooks: `useNearbyFetch`, `useMapViewport`, `useEchoWorker` | Parcial: **`useNearbyFetch`**, **`useMapViewport`**, **`useEchoRealtime`**, **`useActiveServiceRequests`** |
| 3.2 | Mover constantes LS / mapa a `src/lib/mapStorage.ts` | Hecho |
| 3.3 | Componentes contenedor: `MapScreen`, `HomeHeader`, `HomeModals` | **Hecho**: `MapScreen` (mapa + header + sheet + dashboard + prompt), `HomeChatPanels`, más los listados antes (`HomeMapPanel`, `HomeHeader`, …). |
| 3.4 | Reducir `any` en interfaces API (tipos `Expert`, `Demand`, `MapPoint`) | Progresivo |
| 3.5 | Extraer lógica a hooks: `useUserAuth`, `useWorkerProfile`, `useWorkerStatus`, `usePointDetail`, `useHomeBootstrap`, `useHomeChatState` | **Hecho** — `page.tsx` **~498 líneas** (objetivo &lt;500). |
| 3.6 | Objetivo: **`page.tsx` &lt; 500 líneas** | **Hecho**. |

---

## Fase 4 — Configuración y seguridad

| ID | Tarea |
|----|--------|
| 4.1 | Documentar variables `NEXT_PUBLIC_*`, puerto API (8095), no commitear `.env.local` de prod | Hecho (`docs/ENV.md`) |
| 4.2 | `next.config.js`: valorar `env` o documentar que rewrites apuntan al backend en el mismo host | Parcial (documentado en `docs/ENV.md`) |
| 4.3 | Quitar o acotar `(window as any).mapRef` solo en desarrollo | Hecho |
| 4.4 | Revisión `npm audit` + actualizar dependencias críticas | Pendiente |

---

## Fase 5 — UX y PWA

| ID | Tarea |
|----|--------|
| 5.1 | Meta `mobile-web-app-capable` en `layout.tsx` | Hecho |
| 5.2 | Mensajes de error de red visibles si falla `experts/nearby` | Hecho (toast en `fetchNearby`) |
| 5.3 | Reducir logs ruidosos en producción (`MapSection`, filtros de consola) | Hecho (`MapSection`, `__leafletMap` solo dev) |

---

## Fase 6 — Rendimiento

| ID | Tarea |
|----|--------|
| 6.1 | Auditar bundle (`@next/bundle-analyzer`) | Hecho (`npm run analyze` = `ANALYZE=true next build`) |
| 6.2 | Más `dynamic(..., { ssr: false })` en modales pesados | Parcial (ya hay varios en `page.tsx`) |
| 6.3 | Revisar `images.unoptimized` vs necesidades Capacitor vs web | Pendiente |

---

## Negocio — retención y monetización

Plan con hipótesis, métricas y prioridad: **`docs/NEGOCIO-RETENCION-MONETIZACION.md`**. Incluye cintillos (`OpenRequestsBanner`, `WorkerAvailabilityBanner`), `trackEvent` / `POST /api/jh-analytics` y reenvío opcional `ANALYTICS_FORWARD_URL`.

---

## Orden recomendado de trabajo

1. **Fase 0.4** (CI = script VPS) — evita divergencias de build.  
2. **Fase 1** (ESLint) — evita regresiones al refactor.  
3. **Fase 2** (tests humo) — red de seguridad.  
4. **Fase 3** (split `page.tsx`) — mayor impacto mantenimiento, hacer por PRs pequeños.  
5. **Fases 4–6** en paralelo según prioridad de negocio.

---

## Métricas de éxito

- Un solo comando de deploy en servidor y el mismo flujo en GitHub Actions (cuando billing permita Actions).
- `npm run lint` + `npm run test` + `npm run build` en verde en CI.
- `page.tsx` reducido y hooks reutilizables documentados.
