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
- **`INTERNAL_API_ORIGIN`** y **`INTERNAL_INVENTARIO_ORIGIN`** — orígenes que usa **Next al compilar** (`next.config.js`) para los rewrites de `/api/*`, `/inventario/*`, etc. Deben ser alcanzables **desde el proceso Node en el VPS** (típico: `http://127.0.0.1:8095` y `http://127.0.0.1:8003`). Si cambiás puertos o el inventario va a otra máquina, exportá estas variables **antes de** `npm run build` (el script `deploy-on-server.sh` ya pone valores por defecto en `127.0.0.1`).
- `NEXT_PUBLIC_ANALYTICS_INGEST` — opcional, endpoint de eventos.
- Reverb / Pusher si usáis tiempo real (`NEXT_PUBLIC_REVERB_*` o Pusher).

Tras cambiar env: **rebuild** (`npm run build`) y reiniciar proceso Node.

## 3. Variables de entorno (API)

- `APP_URL`, `APP_KEY`, base de datos, colas, mail, Mercado Pago, CORS si front está en otro dominio.
- `SANCTUM_STATEFUL_DOMAINS` / cookies si usáis sesión entre subdominios.

## 4. Deploy web en VPS (forma estándar del repo)

Evitá disparar solo `ssh ... "cd /var/www/jobshour-web && npm run build"` desde la laptop: la sesión SSH puede cortarse al cabo de mucho tiempo y perdés salida útil. El flujo acordado en este monorepo es **siempre** el script del servidor.

**En el VPS** (si la conexión es inestable, usá `tmux` o `screen`):

```bash
export DEPLOY_BRANCH=master   # o la rama que uses en origin
bash /var/www/jobshour-web/scripts/deploy-on-server.sh
```

Ese script hace `git fetch/reset`, `npm ci`, `npm run build` con `NODE_OPTIONS` y `NEXT_PUBLIC_*` por defecto, `pm2 reload jobshour-web` y un health check. Deja traza en `/var/log/jobshours-web-deploy.log`.

**Desde Windows (PowerShell)**, desde la raíz de `jobshour-web`:

```powershell
.\scripts\deploy-from-windows.ps1 -SshConfigHost "jobshours-droplet"
```

Eso envía por SSH el mismo contenido que `scripts/deploy-on-server.sh` y lo ejecuta en el servidor (misma lógica que el job de GitHub Actions, que llama a `bash /var/www/jobshour-web/scripts/deploy-on-server.sh`).

**VPS con poca RAM (≈1 GB):** `npm run build` en el servidor suele morir por OOM. Alternativa probada desde Windows:

```powershell
cd c:\wamp64\www\jobshour-web
.\scripts\deploy-web.ps1
```

Build en WSL (`/tmp`), tarball de `.next`, SCP nativo y `pm2 reload jobshour-web`. Tras cambiar variables `NEXT_PUBLIC_*` o Firebase, hay que **volver a ejecutar** el script (rebuild).

**FCM en producción:** definir `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (y el resto de `NEXT_PUBLIC_FIREBASE_*` del `.env.example`) **antes del build**, no solo en runtime. Sin VAPID verás en consola `No VAPID key, trying without...`; el token puede registrarse igual, pero conviene la clave para push fiable en Chrome/Edge.

### 4.1 Inventario API (`inventario-api`, mismo VPS)

Mismo patrón que el web: script en el servidor + PowerShell opcional desde Windows.

**En el VPS** (`tmux` recomendado si la sesión es larga):

```bash
export DEPLOY_BRANCH=master   # o la rama que exista en origin
bash /var/www/inventario-api/scripts/deploy-on-server.sh
```

Hace `git fetch/reset`, `composer install --no-dev`, `migrate --force`, cachés Laravel, ejecuta `restart_api.sh` (puerto **8003**) y health `http://127.0.0.1:8003/up`. Traza en `/var/log/inventario-api-deploy.log`.

**Desde Windows (PowerShell)**, desde la raíz de `inventario-api` (repo `c:\wamp64\www\inventario-api` o donde lo tengas):

```powershell
.\scripts\deploy-from-windows.ps1 -SshConfigHost "jobshours-droplet"
```

(O `-Server "64.23.199.180"` y `-User` si no usás `~/.ssh/config`.)

Log de aplicación Laravel: `/var/www/inventario-api/storage/logs/laravel.log`.

## 5. Secuencia típica (web, a mano sin el script)

```bash
cd /ruta/jobshour-web
git pull origin master
npm ci
npm run mvp:verify   # opcional: exige NEXT_PUBLIC_API_URL válida (.env.local o export)
npm run build
# Reiniciar PM2/systemd según tengáis
```

## 6. Secuencia típica (API)

```bash
cd /ruta/jobshour-api
git pull origin master
composer install --no-dev --optimize-autoloader
composer mvp:verify   # mismo que: php artisan mvp:verify-env --strict
php artisan migrate --force
php artisan config:cache
php artisan route:cache
# Reiniciar PHP-FPM / Octane / queue workers
```

## 7. Salud post-deploy

- `GET /` o página pública carga sin 500.
- En el **contenedor o VPS API**: `php artisan mvp:verify-env` o `composer mvp:verify` (comprueba `APP_KEY`, BD, `FRONTEND_URL`, token MP, `MAIL_*`).
- Login y una llamada autenticada a `/api/...` OK.
- Tienda de prueba: checkout llega a Mercado Pago (sandbox o prod según entorno).
- Inventario: `GET /inventario/worker-stats/{id}` con token si aplica.
- **QA en campo (varios celulares / ciudades):** `docs/MANUAL-QA-DISPOSITIVOS.md` — **solo mapa:** `docs/MANUAL-QA-SOLO-MAPA.md`.
- **QA físico multi-dispositivo:** `docs/MANUAL-QA-DISPOSITIVOS.md` (celulares, mapa, tienda, pagos).

## 8. Monitoreo mínimo (recomendado)

- Logs de nginx / PHP / Node centralizados o al menos rotación en disco.
- Alerta si el proceso web o API cae (UptimeRobot, Healthchecks.io, etc.).
- Revisar colas (`failed_jobs`) y workers de Laravel si usáis colas.

## 9. Backups

- Dump programado de MySQL/PostgreSQL + retención.
- **Probar** restaurar una copia en entorno de staging al menos una vez.

## 10. Rollback

- Web: volver al commit anterior, `npm ci && npm run build`, reiniciar.
- API: `git checkout` commit anterior + `composer install` + `migrate` solo si hace falta revertir migraciones (planificar antes).

## 11. Salud HTTP y correo transaccional (API)

- `GET {APP_URL}/api/v1/health` — chequeo amplio (BD, cache, cola, Redis, Reverb, etc.); responde **503** si algo crítico falla.
- `GET {APP_URL}/api/v1/health/ping` — **200** si la aplicación responde (útil para uptime barato).
- **Correo al pagar tienda:** al pasar un `store_order` de `pending` a `paid` (webhook Mercado Pago o QA), se intenta enviar correo al comprador y al vendedor. Requiere `MAIL_*` configurado en Laravel.
- `FRONTEND_URL` (o `APP_URL` como fallback en `config/app.php`) debe apuntar al sitio Next para el enlace “ver pedido” en el correo **y** para las `back_urls` de Mercado Pago en checkout de tienda/cotización (el `notification_url` del webhook sigue siendo la API).
- `SUPPORT_EMAIL` (opcional) — texto de contacto en el correo al comprador; por defecto `contacto@jobshour.cl`.

## 12. Salud del front (Next)

- `GET https://tu-dominio/api/health` — JSON `{ ok: true }` desde el propio Next (no valida la API Laravel).
