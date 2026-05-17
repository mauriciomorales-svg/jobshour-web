# Variables de entorno — jobshour-web

## Cliente (`NEXT_PUBLIC_*`)

Se incrustan en el bundle en **build time**. Tras cambiarlas en el servidor hay que **volver a ejecutar** `npm run build` (o el script de deploy).

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | Base de la API Laravel (con o sin `/api` final; el código normaliza). En producción debe ser la URL pública real (p. ej. `https://jobshours.com`), **no** `localhost` en el `.env` del VPS, o el cliente intentará llamar al navegador del usuario. |
| `NEXT_PUBLIC_PUSHER_KEY` | Clave Pusher para tiempo real (**solo** si usás Pusher Cloud y **no** Reverb self-hosted). |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Cluster Pusher (p. ej. `us2`). Ignorado cuando Reverb está activo (abajo). |
| `NEXT_PUBLIC_REVERB_APP_KEY` | Misma clave pública que `REVERB_APP_KEY` en Laravel. Si está definida **junto con** `NEXT_PUBLIC_REVERB_HOST`, Echo conecta al WebSocket Reverb propio. |
| `NEXT_PUBLIC_REVERB_HOST` | Hostname **sin** protocolo (p. ej. `jobshours.com`). Requiere `NEXT_PUBLIC_REVERB_APP_KEY`. |
| `NEXT_PUBLIC_REVERB_PORT` | Puerto WebSocket TLS (típico `443` detrás de Nginx). Por defecto `443` si `NEXT_PUBLIC_REVERB_SCHEME=https`. |
| `NEXT_PUBLIC_REVERB_SCHEME` | `https` o `http` (desarrollo). |
| `NEXT_PUBLIC_ECHO_AUTH_ENDPOINT` | Opcional. URL absoluta del `POST` de autorización de canales privados. Por defecto: `/api/broadcasting/auth` (mismo origen que la web) o, en `file:` (Capacitor), derivado de `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_ANALYTICS_INGEST` | Opcional. URL del **POST** de eventos (absoluta o relativa al mismo origen). Body JSON: `{ "name": string, "payload": object, "t": number }`. Ejemplo en la misma app Next: **`/api/jh-analytics`** (ruta `src/app/api/jh-analytics/route.ts`). Si no existe, solo se emite `jh_analytics` en el cliente. |
| `ANALYTICS_FORWARD_URL` | Solo servidor (no `NEXT_PUBLIC`). Si está definida, la ruta `/api/jh-analytics` **reenvía** el mismo JSON a este URL (p. ej. Laravel `https://jobshours.com/api/v1/analytics/events`). Opcional. |
| `ANALYTICS_FORWARD_SECRET` | Solo servidor. Si el backend exige `X-Analytics-Secret` (mismo valor que `ANALYTICS_INGEST_SECRET` en Laravel), defínelo aquí para que Next lo envíe al reenviar. |

El cliente envía `Authorization: Bearer` al sumidero `/api/jh-analytics` cuando hay token en `localStorage`, para que Laravel pueda guardar `user_id` en analytics. Ejemplo en repo: `jobshour-web/.env.example`.

## Desarrollo local

- Copia `.env.example` a `.env.local` si existe, o crea `.env.local` con `NEXT_PUBLIC_API_URL` apuntando a tu backend (p. ej. `http://localhost:8095/api`).
- **No** subas `.env.local` de producción al repositorio.

## Rewrites (Next.js)

En `next.config.js`, en modo servidor (no export estático), el navegador pide rutas relativas (`/api/...`, `/inventario/...`) y **Next las reescribe** hacia backends internos. Esos destinos se leen en **build time** desde:

| Variable | Default | Uso |
|----------|---------|-----|
| `INTERNAL_API_ORIGIN` | `http://127.0.0.1:8095` | Laravel: `/api/*`, `take_demand.php`, `cancel_*`, `broadcasting_auth.php`. |
| `INTERNAL_INVENTARIO_ORIGIN` | `http://127.0.0.1:8003` | Servicio inventario: `/inventario/*` → `{origen}/api/*`. |

En el **VPS** típico (API + inventario en el mismo servidor) los defaults bastan. Si el inventario escucha en otro puerto o host, exportá las variables **antes de** `npm run build` (el script `scripts/deploy-on-server.sh` ya exporta los mismos defaults).

**Cámara / micrófono (PWA):** el sitio debe servirse por **HTTPS**; en Nginx evitá un `Permissions-Policy` global que bloquee `camera`/`microphone`. Ejemplo en `deploy/nginx-web.conf`.

## Pagos

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Clave pública MP para Brick / checkout. Si falta, `GET /api/v1/payments/mp/brick-config`. |

**Activo:** Mercado Pago (`src/lib/paymentGateway.ts`).

**Standby:** Flow.cl — código y rutas en API (`jobshour-api/docs/FLOW-STANDBY.md`). No se inicia checkout nuevo; `/pago/resultado?token=` sigue confirmando pagos Flow antiguos.

En **Laravel** (`.env`): `PAYMENT_GATEWAY=mercadopago`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`. Variables `FLOW_*` opcionales hasta reactivar.

## Android / export estático

`npm run build:android` usa `NEXT_PUBLIC_API_URL` explícita en el comando; el bridge de Capacitor en `layout.tsx` reescribe `/api/` hacia el host público cuando aplica.

**Analytics:** en export estático **no** existe el servidor Next, así que **`NEXT_PUBLIC_ANALYTICS_INGEST` no puede ser** `/api/jh-analytics` relativo. Usa una **URL absoluta** al backend (p. ej. endpoint Laravel) o déjalo vacío.
