# Variables de entorno — jobshour-web

## Cliente (`NEXT_PUBLIC_*`)

Se incrustan en el bundle en **build time**. Tras cambiarlas en el servidor hay que **volver a ejecutar** `npm run build` (o el script de deploy).

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | Base de la API Laravel (con o sin `/api` final; el código normaliza). En producción debe ser la URL pública real (p. ej. `https://jobshours.com`), **no** `localhost` en el `.env` del VPS, o el cliente intentará llamar al navegador del usuario. |
| `NEXT_PUBLIC_PUSHER_KEY` | Clave Pusher para tiempo real. |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Cluster Pusher (p. ej. `us2`). |
| `NEXT_PUBLIC_ANALYTICS_INGEST` | Opcional. URL del **POST** de eventos (absoluta o relativa al mismo origen). Body JSON: `{ "name": string, "payload": object, "t": number }`. Ejemplo en la misma app Next: **`/api/jh-analytics`** (ruta `src/app/api/jh-analytics/route.ts`). Si no existe, solo se emite `jh_analytics` en el cliente. |
| `ANALYTICS_FORWARD_URL` | Solo servidor (no `NEXT_PUBLIC`). Si está definida, la ruta `/api/jh-analytics` **reenvía** el mismo JSON a este URL (p. ej. Laravel `https://jobshours.com/api/v1/analytics/events`). Opcional. |
| `ANALYTICS_FORWARD_SECRET` | Solo servidor. Si el backend exige `X-Analytics-Secret` (mismo valor que `ANALYTICS_INGEST_SECRET` en Laravel), defínelo aquí para que Next lo envíe al reenviar. |

El cliente envía `Authorization: Bearer` al sumidero `/api/jh-analytics` cuando hay token en `localStorage`, para que Laravel pueda guardar `user_id` en analytics. Ejemplo en repo: `jobshour-web/.env.example`.

## Desarrollo local

- Copia `.env.example` a `.env.local` si existe, o crea `.env.local` con `NEXT_PUBLIC_API_URL` apuntando a tu backend (p. ej. `http://localhost:8095/api`).
- **No** subas `.env.local` de producción al repositorio.

## Rewrites (Next.js)

En `next.config.js`, en modo servidor (no export estático), `/api/*` se reescribe a `http://localhost:8095/api/*` para el backend en la misma máquina. Ajusta el puerto **8095** si tu API escucha en otro.

## Android / export estático

`npm run build:android` usa `NEXT_PUBLIC_API_URL` explícita en el comando; el bridge de Capacitor en `layout.tsx` reescribe `/api/` hacia el host público cuando aplica.

**Analytics:** en export estático **no** existe el servidor Next, así que **`NEXT_PUBLIC_ANALYTICS_INGEST` no puede ser** `/api/jh-analytics` relativo. Usa una **URL absoluta** al backend (p. ej. endpoint Laravel) o déjalo vacío.
