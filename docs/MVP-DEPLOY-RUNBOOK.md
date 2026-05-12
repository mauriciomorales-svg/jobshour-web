# Runbook deploy MVP — JobsHours

Guía mínima para repetir despliegues sin sorpresas. Ajusta rutas y PM2 según tu VPS.

## 1. Repositorios

- **Web:** `jobshour-web` — Node 20+ recomendado, `npm ci`, `npm run build`.
- **API:** `jobshour-api` — PHP 8.x, `composer install --no-dev` en prod si aplica.
- **Inventario:** si es servicio aparte, despliégalo y verifica que el front resuelva `/inventario`.

## 2. Variables de entorno (web)

Revisar al menos:

- `NEXT_PUBLIC_API_URL` — base de la API Laravel (con o sin `/api` según cómo esté armado `apiFetch`).
- `NEXT_PUBLIC_SITE_URL` — URL pública del sitio (canonical, OG).
- `NEXT_PUBLIC_ANALYTICS_INGEST` — opcional, endpoint de eventos.
- Reverb / Pusher si usáis tiempo real (`NEXT_PUBLIC_REVERB_*` o Pusher).

Tras cambiar env: **rebuild** (`npm run build`) y reiniciar proceso Node.

## 3. Variables de entorno (API)

- `APP_URL`, `APP_KEY`, base de datos, colas, mail, Mercado Pago, CORS si front está en otro dominio.
- `SANCTUM_STATEFUL_DOMAINS` / cookies si usáis sesión entre subdominios.

## 4. Secuencia típica (web)

```bash
cd /ruta/jobshour-web
git pull origin master
npm ci
npm run build
# Reiniciar PM2/systemd según tengáis
```

## 5. Secuencia típica (API)

```bash
cd /ruta/jobshour-api
git pull origin master
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
# Reiniciar PHP-FPM / Octane / queue workers
```

## 6. Salud post-deploy

- `GET /` o página pública carga sin 500.
- Login y una llamada autenticada a `/api/...` OK.
- Tienda de prueba: checkout llega a Mercado Pago (sandbox o prod según entorno).
- Inventario: `GET /inventario/worker-stats/{id}` con token si aplica.

## 7. Monitoreo mínimo (recomendado)

- Logs de nginx / PHP / Node centralizados o al menos rotación en disco.
- Alerta si el proceso web o API cae (UptimeRobot, Healthchecks.io, etc.).
- Revisar colas (`failed_jobs`) y workers de Laravel si usáis colas.

## 8. Backups

- Dump programado de MySQL/PostgreSQL + retención.
- **Probar** restaurar una copia en entorno de staging al menos una vez.

## 9. Rollback

- Web: volver al commit anterior, `npm ci && npm run build`, reiniciar.
- API: `git checkout` commit anterior + `composer install` + `migrate` solo si hace falta revertir migraciones (planificar antes).

## 10. Salud HTTP y correo transaccional (API)

- `GET {APP_URL}/api/v1/health` — chequeo amplio (BD, cache, cola, Redis, Reverb, etc.); responde **503** si algo crítico falla.
- `GET {APP_URL}/api/v1/health/ping` — **200** si la aplicación responde (útil para uptime barato).
- **Correo al pagar tienda:** al pasar un `store_order` de `pending` a `paid` (webhook Mercado Pago o QA), se intenta enviar correo al comprador y al vendedor. Requiere `MAIL_*` configurado en Laravel.
- `FRONTEND_URL` (o `APP_URL` como fallback en `config/app.php`) debe apuntar al sitio Next para el enlace “ver pedido” en el correo **y** para las `back_urls` de Mercado Pago en checkout de tienda/cotización (el `notification_url` del webhook sigue siendo la API).
- `SUPPORT_EMAIL` (opcional) — texto de contacto en el correo al comprador; por defecto `contacto@jobshour.cl`.

## 11. Salud del front (Next)

- `GET https://tu-dominio/api/health` — JSON `{ ok: true }` desde el propio Next (no valida la API Laravel).
