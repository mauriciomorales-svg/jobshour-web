# JobsHours - Componentes Frontend Premium

**Fecha:** 16 Feb 2026  
**Diseño:** Premium Mobile-First con animaciones fluidas

---

## 🎨 COMPONENTES IMPLEMENTADOS

### 1. PhoneRevealButton 📞
**Archivo:** `src/app/components/PhoneRevealButton.tsx`

**Características:**
- ✨ Gradiente animado (blue → indigo)
- 🔒 Modal de confirmación con diseño premium
- 👑 Badge especial para usuarios pioneros
- 💎 Muestra saldo de créditos
- ✅ Validación de créditos antes de revelar
- 🎭 Animaciones: fade-in, scale-in, hover effects
- 📱 Responsive mobile-first
- ⚡ Idempotente: no cobra 2 veces

**Estados:**
- **No revelado:** Botón azul "Ver Teléfono" con icono ojo
- **Revelado:** Botón verde con número completo clickeable
- **Sin créditos:** Modal con error y sugerencia de compra
- **Pioneer:** Badge dorado, acceso ilimitado gratis

**Integración:**
```tsx
<PhoneRevealButton
  workerId={worker.id}
  phone={worker.phone}
  phoneRevealed={worker.phone_revealed}
  userToken={user?.token}
  isPioneer={user?.is_pioneer}
  creditsBalance={user?.credits_balance}
/>
```

---

### 2. CompanyRegistrationModal 🏢
**Archivo:** `src/app/components/CompanyRegistrationModal.tsx`

**Características:**
- 🎚️ Toggle animado empresa/particular
- 📝 Validación RUT Módulo 11 en tiempo real
- ✅ Checkmark verde cuando RUT es válido
- 🎨 Formato automático: 12.345.678-9
- 📋 Select de giros comerciales predefinidos
- 💼 Info box con beneficios empresa
- 🎭 Animaciones slide-up para campos condicionales
- ⚠️ Validación inline con mensajes de error

**Validaciones:**
- RUT: Formato y dígito verificador Módulo 11
- Razón Social: Obligatorio si es empresa
- Giro: Obligatorio si es empresa

**Giros Disponibles:**
- Construcción y obras civiles
- Servicios de mantención
- Transporte y logística
- Comercio (mayor/menor)
- Servicios profesionales
- Agricultura y ganadería
- Manufactura
- Tecnología
- Otro

**Integración:**
```tsx
<CompanyRegistrationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(data) => {
    // data.is_company, data.company_rut, etc.
  }}
/>
```

---

### 3. CreditsWidget 💎
**Archivo:** `src/app/components/CreditsWidget.tsx`

**Características:**
- 👑 Badge especial para pioneros (corona animada)
- 💎 Muestra saldo de créditos
- 📊 Modal con planes de compra
- 🎨 Gradientes premium (purple → pink)
- 💰 3 planes: Básico (10), Pro (30), Empresa (100)
- 🏷️ Badges "POPULAR" y descuentos destacados
- ✨ Animaciones hover y pulse
- 📱 Diseño mobile-first

**Planes:**
| Plan | Créditos | Precio | Ahorro |
|------|----------|--------|--------|
| Básico | 10 | $4.990 | - |
| Pro | 30 | $9.990 | 33% OFF |
| Empresa | 100 | $24.990 | 50% OFF |

**Beneficios Pioneer:**
- Contactos ilimitados
- Sin cargos mensuales
- Soporte prioritario
- Acceso de por vida

**Integración:**
```tsx
<CreditsWidget
  creditsBalance={user.credits_balance}
  isPioneer={user.is_pioneer}
  userName={user.name}
/>
```

---

### 4. LazyAvatar 🖼️
**Archivo:** `src/app/components/LazyAvatar.tsx`

**Características:**
- 👁️ Intersection Observer para lazy loading
- ✨ Efecto shimmer mientras carga
- 🎨 Fallback con iniciales en gradiente
- 📏 4 tamaños: sm, md, lg, xl
- 🔄 Manejo de errores con fallback elegante
- ⚡ Optimizado para rural/3G
- 🎭 Transición suave opacity

**Tamaños:**
- `sm`: 32px (w-8 h-8)
- `md`: 48px (w-12 h-12) - default
- `lg`: 64px (w-16 h-16)
- `xl`: 80px (w-20 h-20)

**Integración:**
```tsx
<LazyAvatar
  src={user.avatar}
  alt={user.name}
  size="md"
  fallbackText={user.name.charAt(0)}
/>
```

---

### 5. FullScreenSearchOverlay 🔍
**Archivo:** `src/app/components/FullScreenSearchOverlay.tsx`

**Características:**
- 🎤 Speech-to-Text integrado (botón micrófono)
- ⏱️ Debounce 300ms en digitación
- 🎨 Highlight de matches en resultados (negrita azul)
- 📱 Fullscreen modal mobile-first
- 🔍 Auto-focus en input
- ✨ Animaciones slide-up
- 💡 Sugerencias rápidas
- 🎯 Click en resultado → abre detalle

**Integración:**
```tsx
<FullScreenSearchOverlay
  isOpen={showSearch}
  onClose={() => setShowSearch(false)}
  onSelectWorker={(id) => openWorkerDetail(id)}
  cityName={meta?.city}
  lat={userLat}
  lng={userLng}
/>
```

---

## 🎨 ANIMACIONES CSS

**Archivo:** `src/app/globals.css`

### Animaciones Disponibles:

#### 1. Slide Up
```css
.animate-slide-up
```
- Uso: Modales desde abajo
- Duración: 0.3s
- Easing: ease-out

#### 2. Fade In
```css
.animate-fade-in
```
- Uso: Overlays/backdrops
- Duración: 0.2s
- Easing: ease-out

#### 3. Scale In
```css
.animate-scale-in
```
- Uso: Modal content
- Duración: 0.3s
- Easing: cubic-bezier bounce

#### 4. Shimmer
```css
.animate-shimmer
```
- Uso: Loading skeletons
- Duración: 2s infinite
- Efecto: Gradiente deslizante

---

## 🛠️ UTILIDADES

### imageCompression.ts
**Archivo:** `src/lib/imageCompression.ts`

**Funciones:**

#### compressImageToWebP(file: File): Promise<Blob>
- Redimensiona a max 1024px width
- Convierte a WebP 80% quality
- Optimizado para rural/3G
- Reduce tamaño ~70-80%

#### getImageSizeInfo(original, compressed)
- Retorna info de compresión
- Formato: { original, compressed, reduction, savings }

**Uso:**
```typescript
import { compressImageToWebP } from '@/lib/imageCompression'

const compressed = await compressImageToWebP(file)
const formData = new FormData()
formData.append('image', compressed, 'avatar.webp')
```

---

## 📐 SISTEMA DE DISEÑO

### Colores Premium

**Gradientes:**
- Phone Reveal: `from-blue-500 to-indigo-600`
- Credits: `from-purple-500 to-pink-600`
- Company: `from-slate-700 to-slate-900`
- Success: `from-green-500 to-emerald-600`

**Estados:**
- Active: `bg-green-500`
- Intermediate: `bg-amber-400`
- Inactive: `bg-gray-300`
- Error: `bg-red-500`

### Tipografía
- Font: Plus Jakarta Sans (Google Fonts)
- Pesos: 400 (regular), 600 (semibold), 800 (black)

### Espaciado
- Padding modal: `p-6`
- Gap entre elementos: `gap-2` a `gap-4`
- Border radius: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px)

### Sombras
- Card: `shadow-lg`
- Modal: `shadow-2xl`
- Hover: `hover:shadow-xl`

---

## 🚀 INTEGRACIÓN EN page.tsx

### Imports Agregados:
```typescript
const PhoneRevealButton = dynamic(() => import('./components/PhoneRevealButton'))
const FullScreenSearchOverlay = dynamic(() => import('./components/FullScreenSearchOverlay'))
```

### Cambios en Worker Detail:
- Reemplazado `<a href="tel:">` por `<PhoneRevealButton>`
- Agregado campo `phone_revealed` a interfaz `ExpertDetail`
- Integrado con sistema de créditos

### Cambios en Search:
- Input de búsqueda ahora abre overlay fullscreen
- Búsqueda inteligente con backend `/api/v1/search`
- Highlight de matches en resultados

---

## 📱 RESPONSIVE & PERFORMANCE

### Mobile-First
- Todos los componentes diseñados para móvil primero
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly: botones min 44x44px

### Optimizaciones
- Lazy loading de avatares (Intersection Observer)
- Debounce en búsqueda (300ms)
- WebP compression (reduce 70-80% tamaño)
- Dynamic imports para code splitting

### Rural/3G Ready
- Imágenes max 1024px
- WebP 80% quality
- Lazy loading con rootMargin 50px
- Shimmer loading states

---

## 🧪 TESTING

### Phone Reveal
1. Login como pioneer → revelar gratis
2. Login como regular → consumir crédito
3. Sin créditos → modal error + planes
4. Revelar 2 veces → idempotente (no cobra 2x)

### Company Registration
1. Toggle empresa ON → campos aparecen
2. Ingresar RUT inválido → error
3. Ingresar RUT válido → checkmark verde
4. Submit sin campos → validación inline

### Credits Widget
1. Pioneer → modal con badge dorado
2. Regular → modal con planes
3. Click en plan → (pendiente integración pago)

### Lazy Avatar
1. Scroll rápido → shimmer loading
2. Imagen carga → fade-in suave
3. Error de imagen → fallback con iniciales

---

## 📦 ARCHIVOS CREADOS

### Componentes (5):
- `PhoneRevealButton.tsx` (215 líneas)
- `CompanyRegistrationModal.tsx` (285 líneas)
- `CreditsWidget.tsx` (195 líneas)
- `LazyAvatar.tsx` (75 líneas)
- `FullScreenSearchOverlay.tsx` (240 líneas)

### Utilidades (1):
- `imageCompression.ts` (70 líneas)

### Estilos:
- `globals.css` (animaciones agregadas)

### Modificados:
- `page.tsx` (integración PhoneRevealButton + FullScreenSearchOverlay)

---

## 🎯 PRÓXIMOS PASOS

### Alta Prioridad
1. **Integración de pagos** para compra de créditos
2. **Upload de avatar** con compresión WebP
3. **Reemplazar avatares** en mapa con LazyAvatar

### Media Prioridad
4. **Modal de planes** con pasarela de pago
5. **Dashboard de créditos** en perfil usuario
6. **Historial de revelaciones** (ContactReveal log)

### Baja Prioridad
7. **A/B testing** de planes y precios
8. **Analytics** de conversión reveal → solicitud
9. **Push notification** cuando se acaban créditos

---

## 💡 TIPS DE USO

### Para Desarrolladores
- Todos los componentes son `'use client'` (Next.js 13+)
- Usar `dynamic import` para optimizar bundle
- Animaciones CSS puras (no libraries)
- TypeScript strict mode compatible

### Para Diseñadores
- Colores en formato Tailwind (from-X to-Y)
- Gradientes con overlay pattern SVG
- Iconos: Heroicons (outline/solid)
- Emojis para badges especiales (👑💎📹)

### Para QA
- Testear en 3G throttling (DevTools)
- Verificar animaciones en dispositivos lentos
- Probar con imágenes grandes (5MB+)
- Validar RUT con casos edge (11111111-1, etc)

---

**Total Líneas de Código:** ~1,375 líneas premium
**Tiempo de Implementación:** 1 sesión
**Compatibilidad:** Chrome 90+, Safari 14+, Firefox 88+
