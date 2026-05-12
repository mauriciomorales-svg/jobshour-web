# Estrategia “zona cero” y cercado geográfico (perspectiva experto / arquitectura + producto)

**Contexto:** complementa `RETRO-EXPERTO-MAYO-2026.md` y `FILOSOFIA-JOBSHOURS-EXITO.md`.  
**Idea central:** convertir la **limitación** (VPS pequeño, frío en el mapa) en **ventaja** (densidad y control).

---

## Tesis

**Aplicar un cercado geográfico estricto (geofencing) desde el día 1.**

Un VPS limitado con PostGIS + el problema del arranque en frío (pocos usuarios dispersos) tienen **la misma solución**: no escanear ni prometer “todo el país” hasta tener **liquidez** en un espacio acotado.

Si se lanza abierto:

1. **Riesgo técnico:** consultas espaciales sobre radios enormes, más RAM para índices/working set → presión sobre DB y API.
2. **Riesgo de producto:** mapa “vacío”, usuarios lejos unos de otros → sensación de app muerta y desinstalación. Se rompe la promesa de liquidez local en el **primer** uso.

---

## Ejecución del cercado

### Base de datos (PostGIS / Laravel)

- Consultas `nearby` / similares con **radio máximo acotado** (y/o polígono de “zona cero”) para que el conjunto candidato sea **pequeño y predecible**.
- Objetivo: costo de cada query acotado en RAM y tiempo, coherente con el hardware actual.

### Interfaz (Next.js)

- Si el GPS está **fuera** de la zona operativa: **no** mostrar mapa vacío como primera impresión.
- Mostrar pantalla clara tipo: *“Aún no estamos en tu zona; estamos barrio por barrio. Dejanos tu correo / lista de espera…”* — convierte la exclusión geográfica en **expectativa**, no en abandono.

### Negocio y marketing

- Concentrar energía (TikTok, calle, partnerships) en ese radio hasta que la herramienta sea **obvia** para ese pedazo de ciudad.

**Principio:** el marketplace gana por **fricción casi cero en un espacio controlado**, luego se replica el modelo.

---

## Métricas “luz verde” para abrir el siguiente barrio

No hay un número mágico universal; sirve **combinar** umbral operativo + sensación de producto. Ejemplos de criterios que el equipo puede fijar por escrito:

| Métrica | Ejemplo de umbral (ajustar a zona cero) | Para qué sirve |
|---------|----------------------------------------|----------------|
| **Tiempo hasta primera respuesta** | Mediana **≤ 15 min** entre publicación de demanda y primer contacto útil (mensaje o aceptación según flujo) | Liquidez real, no solo usuarios registrados |
| **Tasa de demandas con ≥1 respuesta** | **≥ 60–70%** en ventana de 14 días | Que no sea “radio muerto” |
| **Densidad de workers activos** | **≥ X workers con modo activo/listening** en el polígono en horario pico | Mapa que “respira” |
| **Sesiones que ven mapa útil** | **≥ 80%** de sesiones en zona con **≥ 3 pins** visibles en viewport típico | Evitar primera impresión vacía |
| **Retención local** | **≥ 25–30%** de usuarios (cliente o worker) que vuelven a abrir la app a **7 días** en esa zona | Hábito antes de expandir |
| **Estabilidad técnica** | **p95 latencia** consultas mapa/nearby por debajo de objetivo acordado; **sin colapsos** en picos | El cercado no sirve si la API cae |

**Regla práctica:** no ampliar geográficamente hasta que **tres–cuatro métricas de la tabla** se cumplan de forma estable **durante al menos 2–3 semanas** en la zona cero (para no confundir suerte con sistema).

La pregunta exacta del experto (*“¿volumen de demandas aceptadas en menos de 15 minutos o densidad por km²?”*) se responde así: **usá ambas** — tiempo de respuesta para liquidez; densidad de workers activos para capacidad del mapa; más retención para saber si ya hay hábito.

---

## Alineación con el otro retro

El primer experto insistió en **hiper-local y densidad**; este segundo lo **operacionaliza** con geofencing técnico + UX fuera de zona + métricas antes de escalar. Son **compatibles**.

---

*Documento interno JobsHours — mayo 2026.*
