# Checklist lanzamiento piloto — JobsHours

Usar en **https://jobshours.com** con dos perfiles de prueba: **cliente** y **trabajador** (cuentas distintas, idealmente dos teléfonos/navegadores).

Automatizable desde PC:

```bash
cd jobshour-api
php scripts/simulate-prod-smoke.php https://jobshours.com
```

---

## A. Infraestructura (5 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| A1 | Abrir https://jobshours.com | Mapa o login carga, sin pantalla blanca | ☐ |
| A2 | DevTools → Application → Service Workers | Un SW activo (`/sw.js`); si hay varios viejos, Unregister y recargar | ☐ |
| A3 | `GET /api/v1/health` (o script smoke S01) | `status: ok`, `database: ok`, `horizon: running`, `reverb: ok` | ☐ |
| A4 | Páginas `/terminos` y `/privacidad` | 200, texto legible | ☐ |
| A5 | `GET /api/v1/zone-info` | `enabled: false` (nacional) o `true` (solo zona piloto) — anotar | ☐ |

---

## B. Cliente — descubrir y pedir (15 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| B1 | Registrarse / iniciar sesión como **cliente** | Entra al mapa | ☐ |
| B2 | Permitir ubicación (o elegir Renaico/Angol en mapa) | Aparecen pines de trabajadores | ☐ |
| B3 | Tocar un trabajador → ver detalle | Perfil, precio, reseñas si hay | ☐ |
| B4 | **Solicitar servicio** (tipo fijo) | Modal Esencial → enviar | ☐ |
| B5 | **Publicar demanda** (pin dorado) | Aparece en mapa y en feed | ☐ |
| B6 | Mis solicitudes | Solicitud en estado pendiente | ☐ |
| B7 | Abrir **chat** de esa solicitud | Mensajes envían/reciben (probar con cuenta trabajador en otro dispositivo) | ☐ |

---

## C. Trabajador — recibir y cerrar (15 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| C1 | Cuenta **trabajador** con perfil completo y categoría | Visible en mapa (o “intermedio” según reglas) | ☐ |
| C2 | Activar disponibilidad / ubicación | Pin propio o estado activo | ☐ |
| C3 | Ver solicitud entrante (notificación o panel) | Aceptar solicitud | ☐ |
| C4 | Chat con el cliente | Mensaje en tiempo real | ☐ |
| C5 | **Marcar completado** | Cliente ve estado completado | ☐ |
| C6 | (Opcional) Ajustar precio antes de pagar | Cliente ve monto actualizado en chat | ☐ |

---

## D. Pago Mercado Pago (10 min) — monto bajo

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| D1 | Cliente: botón pagar en chat / solicitud completada | Abre checkout MP (Brick o redirect) | ☐ |
| D2 | Pagar con tarjeta de **prueba** o monto real pequeño | Retorno a app o `/pago/resultado` | ☐ |
| D3 | Solicitud: `payment_status` = completado | En Mis solicitudes | ☐ |
| D4 | Webhook: revisar logs API si el pago no se refleja en 2 min | `storage/logs/laravel.log` en VPS | ☐ |

> Flow: **no usar** para checkout nuevo (standby). Solo MP.

---

## E. Reseñas y confianza (5 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| E1 | Tras completar + pagar, cliente recibe aviso “califica” | Modal de reseña (o botón en Mis solicitudes) | ☐ |
| E2 | Enviar **5 estrellas + comentario ≥10 caracteres** | Éxito, no permite duplicar | ☐ |
| E3 | Perfil público `/worker/{id}` | Sección reseñas con la nueva | ☐ |
| E4 | Trabajador: Mi perfil → **Reseñas de clientes** → Responder | Respuesta visible | ☐ |
| E5 | Chat → **Tuve un problema** (reporte) | Envía sin error | ☐ |

---

## F. Tienda y extras (10 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| F1 | `/tienda/{workerId}` catálogo | Carga productos si hay | ☐ |
| F2 | Compra tienda (si aplica) | MP checkout tienda | ☐ |
| F3 | Trabajador vendedor: dominio público tienda (si configurado) | Panel host verificado | ☐ |
| F4 | Pin morado tienda premium (si hay URL externa) | Handoff y link externo | ☐ |

---

## G. Integración tienda → demanda (API, 5 min)

Solo si tenés el token en el servidor (`/var/lib/jobshours/store-demand-integration-created.txt`).

```bash
curl -sS -X POST "https://jobshours.com/api/v1/integrations/store-demand" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"external_order_id\":\"checklist-001\",\"description\":\"Pedido checklist\",\"lat\":-37.6672,\"lng\":-72.5730}"
```

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| G1 | POST sin token | 401 | ☐ |
| G2 | POST con token válido | 201 + `request_id` | ☐ |
| G3 | Repetir mismo `external_order_id` | 200 + `idempotent: true` | ☐ |
| G4 | Ver demanda en mapa JobsHours | Pin dorado bajo cuenta de la tienda | ☐ |

---

## H. Notificaciones push (5 min)

| # | Paso | Esperado | ☐ |
|---|------|----------|---|
| H1 | Cliente: aceptar permiso notificaciones en el navegador | Sin error 401 en consola (FCM) | ☐ |
| H2 | Enviar mensaje de chat con app en segundo plano | Toast o push (según SO) | ☐ |
| H3 | VPS: `php artisan firebase:verify` | ✅ OK | ☐ |

---

## I. Situaciones límite (10 min)

| # | Situación | Esperado | ☐ |
|---|-----------|----------|---|
| I1 | Usuario **fuera de Angol** con geofence **off** | Mapa con datos o vacío, sin “fuera de zona” | ☐ |
| I2 | Con `GEOFENCE_ENABLED=true` (solo si lo activaste) | Fuera del radio → mensaje zona piloto | ☐ |
| I3 | Cancelar solicitud pendiente | Estado cancelado, sin chat roto | ☐ |
| I4 | Rechazar solicitud (trabajador) | Cliente notificado | ☐ |
| I5 | Deep link `?pubdemanda=1&lat=…&lng=…` | Abre modal publicar demanda | ☐ |
| I6 | Deep link `?payment=ok&request_id=…` tras MP | Toast éxito en home | ☐ |

---

## J. Registro de resultados

| Campo | Valor |
|-------|--------|
| Fecha | |
| Quién probó | |
| Navegador / dispositivo | |
| Cuenta cliente (email) | |
| Cuenta trabajador (email) | |
| Pago MP order id | |
| Fallos encontrados | |
| ¿Listo para anunciar piloto? | Sí / No / Con reservas |

---

## Comandos útiles (VPS)

```bash
ssh jobshours-droplet
cd /var/www/jobshour-api
php artisan firebase:verify
php artisan config:clear
curl -s http://127.0.0.1:8095/api/v1/health | jq .
pm2 list
```

---

## Resultado de la simulación automática (referencia)

Ejecutada contra producción; 14/14 escenarios API/web públicos OK tras ajuste categorías.

- Mapa Angol: ~19 puntos
- Geofence: **desactivado** (uso nacional)
- Flow init: 401 sin login (standby; MP activo)
- Tests locales PHPUnit (demanda, reseñas, store-demand): 21 OK
