# Plan de Optimización Mobile - JobsHour
**Fecha:** 17 de Febrero 2026

## Problemas Actuales Identificados

### 1. Superposición de Modales
- Login modal (z-150/151) puede superponerse con otros
- Sidebar (z-200/201) puede tapar modales de trabajo
- WorkerProfile/WorkerJobs (z-250) muy alto
- Search overlay (z-200) conflicto con sidebar
- Dashboard (z-100) puede quedar bajo todo

### 2. Botones Inferiores
- "Ver dashboard" (bottom-6 left-6)
- "Modo Trabajo" (bottom-6 center)
- Pueden superponerse en pantallas pequeñas

### 3. Top Bar
- Logo + Menú + Búsqueda + Auth = demasiado apretado
- Chips de categorías pueden no verse bien

## Nueva Jerarquía Z-Index Propuesta

```
z-10   → Mapa base
z-50   → Worker detail card (flotante)
z-100  → Top bar (menú, logo, búsqueda)
z-110  → Chips de categorías
z-120  → Botones inferiores (dashboard, modo trabajo)
z-150  → Dashboard panel
z-200  → Search overlay
z-250  → Login/Register modals
z-300  → Sidebar
z-350  → WorkerProfile/WorkerJobs (modales principales)
z-400  → Alerts/Toasts
```

## Cambios a Implementar

### Top Bar (Mobile-First)
1. **Primera fila:**
   - Menú hamburguesa (left)
   - Logo JOBSHOURS (center, más pequeño)
   - Avatar/Login (right)

2. **Segunda fila:**
   - Barra de búsqueda (full width)

3. **Tercera fila:**
   - Chips de categorías (scroll horizontal)

### Botones Inferiores
1. **Layout en pantallas pequeñas:**
   - Stack vertical en esquina inferior derecha
   - "Modo Trabajo" arriba
   - "Ver dashboard" abajo
   - Ambos compactos, iconos + texto corto

### Modales
1. **Login/Register:**
   - Max height 90vh
   - Centrado con scroll interno
   - z-250

2. **Sidebar:**
   - Slide desde izquierda
   - Max width 85vw
   - z-300

3. **WorkerProfile/WorkerJobs:**
   - Bottom sheet (desde abajo)
   - Max height 92vh
   - z-350
   - Backdrop z-349

4. **Search Overlay:**
   - Top sheet (desde arriba)
   - z-200
   - No fullscreen, solo top 40%

### Dashboard
- Mantener bottom full width
- Max height 35vh (reducido)
- z-150

## Breakpoints
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

## Touch Targets
- Mínimo 44x44px para todos los botones
- Espaciado mínimo 8px entre elementos clickeables
