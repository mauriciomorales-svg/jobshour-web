# QA manual multi-dispositivo — JobsHours (web)

Checklist para probar en **celulares reales**, **navegadores** y **ubicaciones** distintas. Marca ✅ / ❌ y anota modelo de teléfono, OS, navegador y ciudad (o “GPS simulado”).

**Preparación**

- [ ] URL de prueba acordada (p. ej. `https://jobshours.com` o staging).
- [ ] Cuentas: al menos 1 **cliente** y 1 **worker** (o dos dispositivos con cada rol).
- [ ] Mercado Pago en **sandbox** si vas a pagar de verdad en QA.
- [ ] Notas: capturas de pantalla solo si no hay datos personales de terceros.

---

## 1. Conectividad y carga

| # | Caso | Cliente A | Cliente B | Notas |
|---|------|------------|-----------|--------|
| 1.1 | Abrir home con **4G/5G** (sin Wi‑Fi) | | | Mapa y lista cargan en &lt; 15 s aceptable |
| 1.2 | Abrir home con **Wi‑Fi lento** (o “limitación de red” en DevTools en desktop) | | | |
| 1.3 | **Recargar** la página con el mapa ya movido | | | No pantalla en blanco permanente |
| 1.4 | Pestaña en **segundo plano** 2 min, volver al frente | | | Reconexión Echo/Reverb si aplica |

---

## 2. Mapa y geolocalización

| # | Caso | Dispositivo / lugar | OK |
|---|------|----------------------|-----|
| 2.1 | **Permitir** ubicación: mapa centra cerca de ti | | |
| 2.2 | **Denegar** ubicación: la app sigue usable (fallback o mensaje claro) | | |
| 2.3 | Misma prueba en **otra ciudad** (viaje real o GPS de prueba en Android “opciones desarrollador”) | | |
| 2.4 | Zoom in/out rápido, pan largo: **sin crash** ni lista rota | | |
| 2.5 | Tocar **marcador** worker → ficha / modal abre y cierra bien | | |

---

## 3. Autenticación

| # | Caso | OK |
|---|------|-----|
| 3.1 | Registro / login **email** (si está habilitado) | |
| 3.2 | **Google** OAuth en Chrome móvil | |
| 3.3 | Google OAuth en **Safari iOS** (cuidado cookies / ventanas) | |
| 3.4 | Cerrar sesión y volver a entrar: datos de perfil coherentes | |

---

## 4. Flujo demanda / chat / trabajo (resumen)

| # | Caso | OK |
|---|------|-----|
| 4.1 | Cliente publica demanda → aparece en mapa para worker | |
| 4.2 | Worker acepta → chat envía y recibe | |
| 4.3 | Notificaciones **push** (FCM) al recibir mensaje (si están configuradas) | |
| 4.4 | Marcar trabajo en curso / completado según reglas de negocio | |
| 4.5 | **Solicitud de pago** (💳): cliente abre link MP y vuelve sin error 500 | |

---

## 5. Tienda (worker vendedor)

| # | Caso | OK |
|---|------|-----|
| 5.1 | Abrir `/tienda/{workerId}` desde **enlace compartido** (WhatsApp / SMS) | |
| 5.2 | Añadir al carrito, cambiar cantidades, **vaciar** carrito | |
| 5.3 | Checkout con **delivery** on/off según diseño | |
| 5.4 | Pago sandbox → redirección **success/pending/failure** coherente | |
| 5.5 | Comprador recibe correo o pantalla de confirmación (según entorno) | |

---

## 6. Rendimiento y UX móvil

| # | Caso | OK |
|---|------|-----|
| 6.1 | Teclado virtual no **tapa** inputs críticos (login, checkout) | |
| 6.2 | Scroll en modales / bottom sheet sin quedarse “enganchado” | |
| 6.3 | Rotación **horizontal** si el usuario la fuerza: no pérdida total de estado crítica | |

---

## 7. Cabeceras útiles para soporte

En una petición fallida a la API, pedir (o capturar en proxy) el header de respuesta **`X-Request-Id`** y buscar la misma cadena en `storage/logs/laravel.log` del servidor para correlacionar.

---

## 8. E2E automatizado (opcional, antes del despliegue)

Con el front levantado:

```bash
cd jobshour-web
npm run test:e2e:install   # una vez por máquina
PLAYWRIGHT_BASE_URL=https://jobshours.com npm run test:e2e
```

No sustituye pruebas físicas; solo humo HTTP.

---

## Resultado de la ronda

- Fecha: _______________
- Participantes: _______________
- **Bloqueantes encontrados** (lista corta):  
- **Mejoras no urgentes**:  
