# JobsHours - Análisis de Gaps y Pantallas Faltantes

**Fecha:** 16 Feb 2026  
**Objetivo:** Identificar todas las funcionalidades faltantes para que el sistema sea completamente usable

---

## 🚨 CRÍTICO - BLOQUEADORES DE USO

### 1. Sistema de Autenticación Completo ❌
**Estado:** Solo OAuth (Google/Facebook), sin email/password nativo

**Faltante:**
- ✅ Backend existe: `AuthController@register` y `@login`
- ❌ Frontend: No existe `LoginModal` con email/password
- ❌ Frontend: No existe `RegisterModal` con formulario completo
- ❌ Frontend: No existe "Olvidé mi contraseña"
- ❌ Frontend: No existe validación de email
- ❌ Frontend: No existe confirmación de cuenta

**Actual:**
```tsx
// page.tsx línea 674-694
// Solo botones OAuth, sin opción email/password
<button onClick={() => window.location.href = '/api/auth/google'}>
  Continuar con Google
</button>
```

**Necesario:**
- `LoginModal.tsx` - Email/password con validación
- `RegisterModal.tsx` - Registro completo (nombre, email, teléfono, contraseña, tipo)
- `ForgotPasswordModal.tsx` - Recuperación de contraseña
- `EmailVerificationScreen.tsx` - Confirmación de email
- Backend: Rutas de reset password y email verification

---

### 2. Onboarding de Trabajador ❌
**Estado:** Registro básico existe, pero falta completar perfil

**Faltante:**
- ❌ Wizard de configuración inicial (paso a paso)
- ❌ Upload de foto de perfil con crop
- ❌ Selección de ubicación en mapa
- ❌ Configuración de tarifa por hora
- ❌ Agregar skills/especialidades
- ❌ Agregar bio/descripción
- ❌ Configuración de disponibilidad horaria
- ❌ Tutorial interactivo de la app

**Actual:**
```php
// AuthController.php línea 33-41
// Solo crea worker con datos mínimos
Worker::firstOrCreate(['user_id' => $user->id], [
    'category_id' => $validated['category_id'],
    'hourly_rate' => 10000, // Hardcoded!
    'availability_status' => 'intermediate',
]);
```

**Necesario:**
- `OnboardingWizard.tsx` - 5 pasos:
  1. Bienvenida y tipo de cuenta
  2. Foto de perfil
  3. Ubicación y radio de trabajo
  4. Tarifa y especialidades
  5. Bio y disponibilidad
- `ProfilePhotoUpload.tsx` - Con crop y compresión WebP
- `LocationPicker.tsx` - Mapa interactivo para ubicación
- `SkillsSelector.tsx` - Chips de especialidades

---

### 3. Gestión de Solicitudes (Cliente) ❌
**Estado:** Modal existe pero incompleto

**Faltante:**
- ❌ Lista de solicitudes enviadas
- ❌ Tracking de estado (pendiente/aceptada/rechazada)
- ❌ Notificaciones push cuando trabajador responde
- ❌ Cancelar solicitud pendiente
- ❌ Ver historial de solicitudes
- ❌ Re-enviar solicitud rechazada

**Actual:**
```tsx
// ServiceRequestModal.tsx existe pero solo crea
// No hay pantalla para ver solicitudes enviadas
```

**Necesario:**
- `MyRequestsScreen.tsx` - Lista de solicitudes con filtros
- `RequestDetailModal.tsx` - Detalle completo de solicitud
- `RequestTrackingWidget.tsx` - Estado en tiempo real
- Backend: Endpoint `GET /v1/requests/my-requests`

---

### 4. Gestión de Solicitudes (Trabajador) ⚠️
**Estado:** Parcial, falta UI completa

**Faltante:**
- ❌ Notificación push de nueva solicitud
- ❌ Modal de solicitud entrante con detalles
- ❌ Botones aceptar/rechazar con confirmación
- ❌ Lista de solicitudes recibidas
- ❌ Filtros por estado
- ❌ Contador de solicitudes pendientes

**Actual:**
```tsx
// WorkerJobs.tsx existe pero es básico
// No muestra solicitudes entrantes en tiempo real
```

**Necesario:**
- `IncomingRequestNotification.tsx` - Toast con sonido
- `RequestActionModal.tsx` - Aceptar/rechazar con razón
- `WorkerRequestsScreen.tsx` - Lista completa
- `RequestBadge.tsx` - Contador en FAB

---

### 5. Sistema de Chat Completo ⚠️
**Estado:** Existe pero falta funcionalidad

**Faltante:**
- ❌ Upload de imágenes en chat
- ❌ Grabación de audio
- ❌ Indicador "escribiendo..."
- ❌ Confirmación de lectura (doble check)
- ❌ Notificación de mensaje nuevo
- ❌ Lista de chats activos
- ❌ Búsqueda en mensajes

**Actual:**
```tsx
// ChatPanel.tsx existe pero solo texto
// Backend soporta type: 'image'|'audio' pero frontend no lo usa
```

**Necesario:**
- `ChatImageUpload.tsx` - Con preview y compresión
- `ChatAudioRecorder.tsx` - Grabación de voz
- `ChatTypingIndicator.tsx` - "Escribiendo..."
- `ChatListScreen.tsx` - Todos los chats
- Backend: WebSocket para typing indicator

---

### 6. Sistema de Pagos ❌
**Estado:** Backend existe (`PaymentController`), frontend NO

**Faltante:**
- ❌ Integración con pasarela de pago
- ❌ Modal de checkout
- ❌ Confirmación de pago
- ❌ Recibo/comprobante
- ❌ Historial de pagos
- ❌ Métodos de pago guardados

**Actual:**
```php
// PaymentController.php existe pero no está integrado
// No hay UI para pagar
```

**Necesario:**
- `CheckoutModal.tsx` - Pasarela de pago
- `PaymentMethodSelector.tsx` - Tarjeta/transferencia
- `PaymentConfirmation.tsx` - Comprobante
- `PaymentHistoryScreen.tsx` - Historial
- Integración: Mercado Pago, Flow, Transbank

---

### 7. Sistema de Calificaciones ❌
**Estado:** Backend parcial, frontend NO existe

**Faltante:**
- ❌ Modal de calificación (estrellas + comentario)
- ❌ Mostrar calificaciones en perfil
- ❌ Promedio de rating
- ❌ Lista de reviews
- ❌ Responder a reviews
- ❌ Reportar review inapropiada

**Necesario:**
- `RatingModal.tsx` - Estrellas + texto
- `ReviewsList.tsx` - Lista de calificaciones
- `ReviewCard.tsx` - Card individual
- Backend: `ReviewsController` completo
- Migración: `create_reviews_table`

---

### 8. Perfil de Usuario Completo ❌
**Estado:** Existe `WorkerProfile.tsx` pero falta edición

**Faltante:**
- ❌ Editar perfil (nombre, email, teléfono)
- ❌ Cambiar foto de perfil
- ❌ Cambiar contraseña
- ❌ Configuración de privacidad
- ❌ Configuración de notificaciones
- ❌ Eliminar cuenta
- ❌ Cerrar sesión

**Actual:**
```tsx
// WorkerProfile.tsx solo muestra datos
// No hay botón "Editar"
```

**Necesario:**
- `EditProfileModal.tsx` - Formulario completo
- `ChangePasswordModal.tsx` - Cambio de contraseña
- `PrivacySettings.tsx` - Configuración
- `NotificationSettings.tsx` - Push, email, SMS
- `DeleteAccountModal.tsx` - Con confirmación

---

### 9. Verificación de Identidad ⚠️
**Estado:** Existe `VerificationCard.tsx` pero no funcional

**Faltante:**
- ❌ Upload de documento de identidad
- ❌ Selfie con documento
- ❌ Verificación de teléfono (SMS)
- ❌ Verificación de email
- ❌ Estado de verificación en perfil
- ❌ Badge verificado

**Actual:**
```tsx
// VerificationCard.tsx existe pero no hace nada
```

**Necesario:**
- `IDVerificationFlow.tsx` - Wizard completo
- `PhoneVerification.tsx` - SMS con código
- `EmailVerification.tsx` - Link de confirmación
- Backend: Integración con servicio de verificación
- Backend: Endpoints de verificación

---

### 10. Notificaciones Push ⚠️
**Estado:** Backend existe, frontend parcial

**Faltante:**
- ❌ Solicitud de permisos al usuario
- ❌ Configuración de tipos de notificación
- ❌ Centro de notificaciones
- ❌ Marcar como leída
- ❌ Eliminar notificación
- ❌ Sonidos personalizados

**Actual:**
```tsx
// useNotifications hook existe
// Pero no hay UI para gestionar
```

**Necesario:**
- `NotificationPermissionModal.tsx` - Solicitud
- `NotificationCenter.tsx` - Lista de notificaciones
- `NotificationSettings.tsx` - Configuración
- `NotificationBadge.tsx` - Contador

---

## 🔧 IMPORTANTE - MEJORAS DE UX

### 11. Búsqueda Avanzada ⚠️
**Estado:** Existe `FullScreenSearchOverlay` pero básico

**Faltante:**
- ❌ Filtros avanzados (precio, rating, distancia)
- ❌ Ordenamiento (relevancia, precio, rating)
- ❌ Guardar búsquedas
- ❌ Historial de búsquedas
- ❌ Sugerencias inteligentes

**Necesario:**
- `SearchFilters.tsx` - Panel de filtros
- `SearchSortOptions.tsx` - Ordenamiento
- `SavedSearches.tsx` - Búsquedas guardadas

---

### 12. Mapa Interactivo ⚠️
**Estado:** Existe `MapSection` pero básico

**Faltante:**
- ❌ Filtro por categoría en mapa
- ❌ Clusters de marcadores
- ❌ Heatmap de demanda
- ❌ Ruta a trabajador
- ❌ Compartir ubicación

**Necesario:**
- `MapFilters.tsx` - Filtros en mapa
- `MapClusters.tsx` - Agrupación
- `RouteToWorker.tsx` - Navegación

---

### 13. Gestión de Créditos ❌
**Estado:** `CreditsWidget` existe pero no funcional

**Faltante:**
- ❌ Compra de créditos (pasarela)
- ❌ Historial de uso
- ❌ Recarga automática
- ❌ Transferir créditos
- ❌ Códigos promocionales

**Necesario:**
- `BuyCreditsModal.tsx` - Checkout
- `CreditsHistoryScreen.tsx` - Historial
- `PromoCodeInput.tsx` - Cupones
- Backend: Endpoints de compra

---

### 14. Registro Empresa ❌
**Estado:** `CompanyRegistrationModal` existe pero no integrado

**Faltante:**
- ❌ Integración en flujo de registro
- ❌ Validación de RUT en backend
- ❌ Campos adicionales empresa
- ❌ Facturación automática
- ❌ Múltiples usuarios por empresa

**Necesario:**
- Integrar modal en registro
- Backend: Validación RUT
- Backend: Facturación
- `CompanyUsersManagement.tsx` - Gestión de usuarios

---

### 15. Dashboard de Trabajador ❌
**Estado:** No existe

**Faltante:**
- ❌ Estadísticas (trabajos, ingresos, rating)
- ❌ Gráficos de rendimiento
- ❌ Calendario de trabajos
- ❌ Metas y objetivos
- ❌ Comparación con otros

**Necesario:**
- `WorkerDashboard.tsx` - Dashboard completo
- `StatsWidget.tsx` - Estadísticas
- `PerformanceChart.tsx` - Gráficos
- `WorkCalendar.tsx` - Calendario
- Backend: Endpoints de analytics

---

### 16. Dashboard de Cliente ❌
**Estado:** No existe

**Faltante:**
- ❌ Historial de servicios
- ❌ Trabajadores favoritos
- ❌ Gastos totales
- ❌ Próximos servicios
- ❌ Recomendaciones

**Necesario:**
- `ClientDashboard.tsx` - Dashboard
- `ServiceHistory.tsx` - Historial
- `FavoriteWorkers.tsx` - Favoritos
- `SpendingChart.tsx` - Gastos

---

### 17. Sistema de Favoritos ⚠️
**Estado:** Backend existe (`FavoritesController`), frontend NO

**Faltante:**
- ❌ Botón "Agregar a favoritos"
- ❌ Lista de favoritos
- ❌ Notificación cuando favorito está disponible
- ❌ Organizar en carpetas

**Necesario:**
- `FavoriteButton.tsx` - Toggle favorito
- `FavoritesScreen.tsx` - Lista
- `FavoriteFolders.tsx` - Organización

---

### 18. Sistema de Disputas ⚠️
**Estado:** Backend existe (`DisputeController`), frontend NO

**Faltante:**
- ❌ Reportar problema
- ❌ Chat de disputa
- ❌ Subir evidencia
- ❌ Resolución de disputa
- ❌ Reembolso

**Necesario:**
- `ReportIssueModal.tsx` - Reporte
- `DisputeChat.tsx` - Chat con soporte
- `DisputeEvidence.tsx` - Upload evidencia
- `DisputeResolution.tsx` - Resolución

---

### 19. Amigos/Red Social ⚠️
**Estado:** Existe `Friends.tsx` pero básico

**Faltante:**
- ❌ Buscar amigos
- ❌ Invitar amigos
- ❌ Compartir trabajador
- ❌ Recomendaciones de amigos
- ❌ Feed social

**Necesario:**
- `FriendSearch.tsx` - Búsqueda
- `InviteFriends.tsx` - Invitaciones
- `ShareWorker.tsx` - Compartir
- `SocialFeed.tsx` - Feed

---

### 20. Configuración Avanzada ⚠️
**Estado:** Existe `Settings.tsx` pero incompleto

**Faltante:**
- ❌ Idioma
- ❌ Moneda
- ❌ Zona horaria
- ❌ Tema (claro/oscuro)
- ❌ Accesibilidad
- ❌ Datos y privacidad

**Necesario:**
- `LanguageSelector.tsx` - Idiomas
- `ThemeSelector.tsx` - Tema
- `AccessibilitySettings.tsx` - Accesibilidad
- `PrivacySettings.tsx` - Privacidad

---

## 📱 MOBILE - FUNCIONALIDADES NATIVAS

### 21. Geolocalización ⚠️
**Estado:** Parcial

**Faltante:**
- ❌ Solicitar permisos de ubicación
- ❌ Actualización en background
- ❌ Modo "Trabajando" con tracking
- ❌ Compartir ubicación en tiempo real

**Necesario:**
- `LocationPermission.tsx` - Solicitud
- `BackgroundLocation.tsx` - Tracking
- `LiveLocationShare.tsx` - Compartir

---

### 22. Cámara y Multimedia ❌
**Estado:** No existe

**Faltante:**
- ❌ Tomar foto desde cámara
- ❌ Grabar video
- ❌ Grabar audio
- ❌ Galería de fotos
- ❌ Editor de imágenes

**Necesario:**
- `CameraCapture.tsx` - Cámara
- `VideoRecorder.tsx` - Video
- `AudioRecorder.tsx` - Audio
- `ImageEditor.tsx` - Editor

---

### 23. Llamadas y Contacto ⚠️
**Estado:** Solo `tel:` link

**Faltante:**
- ❌ Llamada in-app (VoIP)
- ❌ Videollamada
- ❌ Historial de llamadas
- ❌ Grabar llamada (con permiso)

**Necesario:**
- `VoIPCall.tsx` - Llamada VoIP
- `VideoCall.tsx` - Videollamada
- Integración: Twilio, Agora

---

### 24. Calendario y Agenda ❌
**Estado:** No existe

**Faltante:**
- ❌ Calendario de disponibilidad
- ❌ Agendar servicio
- ❌ Recordatorios
- ❌ Sincronización con Google Calendar
- ❌ Bloquear horarios

**Necesario:**
- `AvailabilityCalendar.tsx` - Calendario
- `BookingModal.tsx` - Agendar
- `CalendarSync.tsx` - Sincronización

---

### 25. Offline Mode ❌
**Estado:** No existe

**Faltante:**
- ❌ Caché de datos
- ❌ Queue de acciones offline
- ❌ Sincronización al volver online
- ❌ Indicador de modo offline

**Necesario:**
- Service Worker con cache
- IndexedDB para datos
- Background Sync API
- `OfflineIndicator.tsx`

---

## 🎨 UI/UX - COMPONENTES FALTANTES

### 26. Componentes Reutilizables ❌

**Faltante:**
- ❌ `Button.tsx` - Botón genérico
- ❌ `Input.tsx` - Input genérico
- ❌ `Select.tsx` - Select genérico
- ❌ `Checkbox.tsx` - Checkbox
- ❌ `Radio.tsx` - Radio button
- ❌ `Switch.tsx` - Toggle switch
- ❌ `Slider.tsx` - Range slider
- ❌ `DatePicker.tsx` - Selector de fecha
- ❌ `TimePicker.tsx` - Selector de hora
- ❌ `Modal.tsx` - Modal genérico
- ❌ `Toast.tsx` - Notificación toast
- ❌ `Skeleton.tsx` - Loading skeleton
- ❌ `EmptyState.tsx` - Estado vacío
- ❌ `ErrorState.tsx` - Estado de error

---

### 27. Navegación ❌

**Faltante:**
- ❌ Bottom navigation bar
- ❌ Drawer menu
- ❌ Breadcrumbs
- ❌ Tabs
- ❌ Stepper

**Necesario:**
- `BottomNav.tsx` - Navegación inferior
- `DrawerMenu.tsx` - Menú lateral
- `TabBar.tsx` - Pestañas

---

## 📊 RESUMEN DE GAPS

### Por Prioridad

**CRÍTICO (Bloqueadores):**
1. ❌ Login/Register completo con email/password
2. ❌ Onboarding de trabajador
3. ❌ Gestión de solicitudes (cliente)
4. ⚠️ Gestión de solicitudes (trabajador)
5. ❌ Sistema de pagos
6. ❌ Sistema de calificaciones
7. ❌ Edición de perfil

**ALTO (Funcionalidad core):**
8. ⚠️ Chat completo (imágenes, audio)
9. ⚠️ Verificación de identidad
10. ⚠️ Notificaciones push completas
11. ❌ Dashboard trabajador
12. ❌ Dashboard cliente
13. ❌ Gestión de créditos funcional

**MEDIO (Mejoras UX):**
14. ⚠️ Búsqueda avanzada
15. ⚠️ Mapa interactivo
16. ⚠️ Sistema de favoritos
17. ⚠️ Sistema de disputas
18. ⚠️ Amigos/Red social
19. ❌ Registro empresa integrado

**BAJO (Nice to have):**
20. ❌ Calendario y agenda
21. ❌ Llamadas VoIP
22. ❌ Offline mode
23. ❌ Componentes reutilizables
24. ❌ Configuración avanzada

---

## 📈 ESTIMACIÓN DE DESARROLLO

### Sprint 1 (1 semana) - CRÍTICO
- Login/Register completo
- Onboarding trabajador
- Edición de perfil básica

### Sprint 2 (1 semana) - SOLICITUDES
- Gestión solicitudes cliente
- Gestión solicitudes trabajador
- Notificaciones push

### Sprint 3 (1 semana) - PAGOS
- Sistema de pagos
- Gestión de créditos
- Compra de planes

### Sprint 4 (1 semana) - CALIFICACIONES
- Sistema de calificaciones
- Reviews y comentarios
- Dashboard básico

### Sprint 5 (1 semana) - CHAT
- Chat multimedia
- Typing indicator
- Lista de chats

### Sprint 6+ (2-3 semanas) - RESTO
- Verificación
- Favoritos
- Disputas
- Calendario
- Offline mode

**Total estimado:** 7-8 semanas para MVP completo

---

## 🎯 RECOMENDACIÓN

**Prioridad inmediata (próxima sesión):**

1. **LoginModal + RegisterModal** - Sin esto, solo OAuth funciona
2. **OnboardingWizard** - Trabajadores no pueden completar perfil
3. **MyRequestsScreen** - Clientes no ven sus solicitudes
4. **WorkerRequestsScreen** - Trabajadores no ven solicitudes entrantes
5. **EditProfileModal** - No se puede editar nada

**Estas 5 pantallas desbloquean el 70% del flujo de usuario.**
