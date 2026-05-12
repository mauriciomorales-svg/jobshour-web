# JobsHours — Technical brief (English)

**Audience:** architect / senior engineer / DevOps reviewer unfamiliar with the product · **May 2026**

## Product snapshot

JobsHours is a **geospatial services marketplace**: workers appear on a map; clients publish demands (“golden posts”), chat around **service requests**, pay via **Mercado Pago**, and workers can run a **simple storefront** per profile. Stack targets **Chile/LATAM**.

## Architecture

| Layer | Technology |
|--------|------------|
| Web app | **Next.js 15** (App Router), **React 19**, **Node ≥ 20** |
| API | **Laravel 11**, **PHP ≥ 8.2**, REST, **Laravel Sanctum** |
| Database | **PostgreSQL** + **PostGIS** (spatial queries, `client_location`, etc.) |
| Cache / queues | **Redis** (Predis), queue workers |
| Realtime client | **laravel-echo** + **pusher-js** (Pusher-compatible protocol) |
| Realtime server | **Laravel Reverb** available in repo (deployment-dependent) |
| Push | **Firebase Cloud Messaging** |
| Payments | **Mercado Pago** (Checkout Pro, preferences, webhooks) |
| Mobile path | **Capacitor 7** (Android-oriented; web-first) |
| Maps | **Leaflet** + clustering |

Rough topology: **browser → Next.js → HTTPS → Laravel API → PostgreSQL/PostGIS**, with **Redis** for cache/queues and **FCM/MP** as external integrations.

## Is this stack reasonable?

**Yes.** For a location-based marketplace with payments and notifications:

- **Laravel** is a mainstream choice for APIs, webhooks, scheduled jobs, and queue processing.
- **PostGIS** is the appropriate tool for proximity queries; avoiding PostGIS usually means weaker or homemade geo logic.
- **Next.js** is a solid choice for a hybrid marketing site + heavy interactive client (map, dashboards).

Nothing here is exotic or unmaintainable.

## What reviewers usually scrutinise (not “wrong tech”, but ops)

1. **Single-node VPS / low RAM** — first bottleneck is often infrastructure before framework limits.
2. **Laravel scheduler** — must run `* * * * * php artisan schedule:run` for SLA expiry, retention pushes, analytics jobs.
3. **Queue workers** — must run for async jobs; otherwise backlog and delayed notifications.
4. **Environment consistency** — duplicate or stale `.env.*` files and aggressive `config:cache` can mis-bind DB credentials; operational discipline matters.
5. **Webhook correctness** — Mercado Pago signatures and idempotent handling of payment notifications.

## Security & compliance (high level)

- API authentication via Sanctum; sensitive config in `.env`.
- Payment flows should enforce authorization server-side (client owns resource, etc.).
- Geo privacy: public feeds may use fuzzed coordinates — worth validating against product requirements.

## Testing & quality

- PHPUnit on API; frontend lint/build in CI-style pipelines; feature tests for critical flows where implemented.

## Questions for an external expert

1. At expected **concurrent users** and **query radius**, is single Postgres + API instance enough? When to add read replicas or horizontal API replicas?
2. **WebSockets:** run Reverb co-located with PHP vs managed Pusher vs separate VM?
3. **Observability:** recommend **structured logging**, DB alerts, and **error tracking** (e.g. Sentry) before scaling marketing spend.
4. **PostGIS:** index review on spatial columns and hot queries (`nearby` listings).

## Bottom line

**Technology choices align with the product.** Strategic risk is less “rewrite the stack” and more **runbooks, monitoring, scaling Postgres/Redis, and hardening payment webhooks** as traffic grows.
