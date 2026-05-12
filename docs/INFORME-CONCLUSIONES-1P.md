# JobsHours — Conclusiones técnicas (1 página)

**Para:** revisión rápida por experto · **Mayo 2026**

## Qué es

Marketplace geolocalizado de servicios (mapa, demandas, chat, pagos Mercado Pago, tiendas por trabajador). Front **Next.js 15** + API **Laravel 11** + **PostgreSQL/PostGIS** + **Redis** + push **FCM**.

## Veredicto del stack

La combinación es **industrial y adecuada** para el dominio (LATAM, mapa, pagos, notificaciones). No es tecnología de laboratorio; hay soporte, talento y documentación en la industria.

## Fortalezas

- **PostGIS** para proximidad es la elección correcta frente a hacks en MySQL.
- **Laravel** encaja con pagos, webhooks, colas, scheduler y auth API (Sanctum).
- **Next.js** permite SEO donde hace falta y SPA para mapa/dashboard.
- **Redis** para caché/colas es el estándar esperado.

## Riesgos operativos (no tanto “mal stack”)

- **Servidor pequeño** (RAM limitada): antes escalar código, escalar **recursos o separar DB**.
- **Configuración:** múltiples `.env*` o `config:cache` mal alineados pueden romper credenciales — procedimiento único y revisión en deploy.
- **Cron + colas:** si no corren, caducan SLAs y webhooks; hay que monitorizar `schedule:run` y workers.

## Qué pediría un consultor

1. Objetivo de **usuarios concurrentes** y radio de búsqueda → tamaño de índices PostGIS y caching.
2. **Realtime:** Reverb en mismo host vs Pusher gestionado vs separar proceso.
3. **Observabilidad:** logs estructurados, alertas DB, trazas de errores (p. ej. Sentry) antes de crecer tráfico.

## Una frase

**La tecnología elegida es coherente; el foco de mejora típico será operación, escala y observabilidad, no reescribir el stack.**
