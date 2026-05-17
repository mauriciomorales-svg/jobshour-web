# FCM 401 en web (`fcmregistrations.googleapis.com`)

## Fix en código (mayo 2026)

El registro manual y el proxy Laravel usan **`Authorization: Bearer <token de Installations>`**, no solo `x-goog-firebase-installations-auth: FIS …` (con FIS solo Google devuelve 401).

Si el navegador sigue en 401 pero `node scripts/test-fcm-api.mjs` muestra **400 con Bearer**, la API key tiene restricción **HTTP referrer** que bloquea peticiones sin `Referer` (p. ej. desde service worker). Solución: proxy `POST /api/v1/notifications/register-fcm-web` o relajar restricciones de aplicación de la clave.

### Estado en producción (jobshours.com)

| Pieza | Estado |
|-------|--------|
| Registro web vía proxy Laravel | ✅ `POST /api/v1/notifications/register-fcm-web` |
| OAuth envío (service account) | ✅ `google/auth` en `FirebaseService` |
| Chat / demandas push | ✅ `FCMService` → `FirebaseService` (un solo path) |
| Verificación servidor | `php artisan firebase:verify` |
| Prueba a usuario | `php scripts/send-test-push-user.php <USER_ID>` |

Credenciales: `storage/firebase/jobshours-firebase-adminsdk-*.json` + `FIREBASE_WEB_API_KEY` en `.env` del API. Si el envío falla con **Invalid JWT Signature**, rotá la clave en Google Cloud IAM y redeployá el JSON.


Si en consola ves:

```text
POST .../v1/projects/jobshours/registrations 401 (Unauthorized)
Request is missing required authentication credential
```

## Conflicto de dos service workers (corregido en código)

`layout.tsx` registraba `/sw.js` y FCM registraba `/firebase-messaging-sw.js`. Ambos compiten por el scope `https://jobshours.com/` → `getToken` puede devolver **401** aunque la API key en Google Cloud esté bien.

**Solución desplegada:** Firebase vive dentro de `/sw.js` (módulo `sw-fcm.generated.js`). Tras deploy, en DevTools → Application → Service Workers → **Unregister** todos los de jobshours.com y recargar.

---

## Qué ya sabemos (proyecto jobshours)

Desde el servidor, la **misma API key** responde en Installations y FCM Registration (no está “muerta”):

- `firebaseinstallations.googleapis.com` → **200** con `X-Goog-Api-Key`
- `fcmregistrations.googleapis.com` → **400** (cuerpo inválido), no 401

Si en el **navegador** sigue 401, el problema casi siempre es uno de estos:

1. **Restricciones HTTP referrer** de la API key (solo afectan al browser).
2. **Bloqueador** (uBlock, Brave, etc.) cortando `googleapis.com`.
3. **Installations falla en el browser** (antes de `getToken`) → sin token Bearer → 401 en FCM.

Tras el último deploy, en consola deberías ver **`[FCM] Installation FID OK: ...`**. Si ves **`Installation FID failed`**, arreglá la API key antes de seguir con VAPID.

---

## Paso 1 — API key en Google Cloud (5 minutos)

1. Abrí: https://console.cloud.google.com/apis/credentials?project=jobshours  
2. Editá la clave que termina en **`6WgaIM`** (la de Firebase Web).
3. **Prueba rápida:** *Application restrictions* → **None** → Guardar.  
   Esperá 2–3 min, recargá jobshours.com con Ctrl+Shift+R y probá de nuevo.
4. Si con *None* **funciona**, volvé a *HTTP referrers* y agregá **todas** estas líneas:

   ```text
   https://jobshours.com/*
   https://www.jobshours.com/*
   http://localhost:3002/*
   ```

5. *API restrictions* → **Don't restrict key** (prueba) o permití explícitamente:
   - Firebase Installations API
   - FCM Registration API
   - Firebase Cloud Messaging API

## Paso 2 — Restricciones de **API** (el error más común si FID ya es OK)

Si en consola ves **`Installation FID OK`** pero sigue **401** en `fcmregistrations`:

1. https://console.cloud.google.com/apis/credentials?project=jobshours  
2. Editá la clave **…6WgaIM**.  
3. **API restrictions** → *Restrict key* → en el buscador agregá exactamente:
   - **FCM Registration API** ← suele faltar (el nombre **no** incluye la palabra Firebase)
   - Firebase Installations API  
   - Firebase Cloud Messaging API  
4. Guardar y esperar 2–3 minutos.

## Paso 3 — Restricciones de **aplicación** (referrers)

Si tenés **HTTP referrers** en la misma clave, Installations puede funcionar y FCM fallar (el service worker a veces envía referrer vacío).

**Recomendado para push web:** *Application restrictions* → **None**.

Si querés referrers para otras cosas, usá **otra API key** para Maps y dejá la de Firebase sin restricción de aplicación.

## Paso 4 — Habilitar APIs en el proyecto (si no lo hiciste)

- https://console.cloud.google.com/apis/library/fcmregistrations.googleapis.com?project=jobshours → **Enable**
- https://console.cloud.google.com/apis/library/firebaseinstallations.googleapis.com?project=jobshours → **Enable**
- https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=jobshours → **Enable**

## Paso 5 — VAPID

Firebase Console → **Project settings** → **Cloud Messaging** → **Web Push certificates** → copiá el par del proyecto **jobshours** a `NEXT_PUBLIC_FIREBASE_VAPID_KEY` en `.env.local` y redeploy.

## Paso 6 — Navegador (solo pruebas tuyas)

1. DevTools → **Application** → **Service Workers** → *Unregister* en jobshours.com.  
2. Recarga forzada (Ctrl+Shift+R).  
3. Probá en ventana de incógnito **sin extensiones**.  
4. En **Network**, abrí el POST fallido a `fcmregistrations.googleapis.com` y revisá si lleva headers `Authorization` y `x-goog-api-key`.

## Deploy

```powershell
cd c:\wamp64\www\jobshour-web
.\scripts\deploy-web.ps1
```

## Logs esperados cuando funciona

```text
[FCM] Installation FID OK: ...
[FCM] getToken (VAPID, SDK default SW)...
[FCM] Token OK (VAPID, SDK default SW)
[FCM] Got token: ...
[FCM] Token registration result: success
```
