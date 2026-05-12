# Retro de experto — JobsHours (mayo 2026)

Documento de referencia: síntesis del consejo recibido tras revisión del stack técnico y la filosofía de producto (`FILOSOFIA-JOBSHOURS-EXITO.md`, brief técnico).

---

## Frase central

**El producto tiene alma y base técnica sólida. El riesgo número 1 no es la tecnología ni la idea: es fallar en ejecutar con densidad local y excelencia operativa desde el primer día.**

JobsHours no es “otra app de servicios”: es una apuesta contra la fricción injusta del mercado informal. Esa filosofía es ventaja competitiva, pero **la filosofía sola no paga facturas**. El éxito depende de que código, reglas de negocio y cada interacción **respiren la misma promesa** (mérito visible, no papel).

---

## Cinco prioridades (orden sugerido por el experto)

### 1. Hiper-local y densidad (la más importante)

- Elegir **una ciudad o barrio denso** donde haya comunidad o contactos iniciales y hacer que **funcione ahí** antes de expansión amplia.
- El éxito temprano no son descargas: es **liquidez local** (demandas + workers activos en radio viable).
- Objetivo de referencia: que un cliente publique y tenga **varios workers respondiendo en minutos** en esa zona. Hasta lograr eso, tienda / boost / créditos son secundarios.

### 2. Riesgos técnicos antes de escalar

- **Webhooks Mercado Pago:** idempotencia y validación de firma — prioridad alta (riesgo financiero y de reputación).
- **Reverb** como proceso separado (p. ej. Supervisor), Redis como broadcaster; no mezclar con el mismo proceso que la API sin criterio claro.
- **Observabilidad:** Sentry (errores / performance) + Laravel Horizon (colas) antes de que suba el tráfico.
- **Deploy:** flujo profesional (Forge, Docker Compose mínimo, etc.); evitar VPS insuficiente y `.env` duplicados o conflictivos.

### 3. Operación por encima de features

- Cron, colas y scheduler **monitoreados**.
- Soporte humano rápido en las primeras semanas.
- SLA y reputación: **cumplir lo prometido**; la confianza se gana o se pierde en los primeros días de cada usuario.

### 4. Primera experiencia y prueba social

- Onboarding **visual y emocional** (mapa, video currículum, formulario único coherente).
- Marketing con **historias reales** (workers sin título que consiguen trabajo; clientes que encuentran confianza cerca). Menos lista de features, más transformación.
- Cada pantalla debe reforzar: *“acá tu trabajo habla por vos”*.

### 5. Métricas que importan (no vanidad)

Ignorar solo descargas. Seguir semanalmente, entre otras:

- Demandas publicadas vs completadas **por zona**
- Tiempo medio de respuesta de workers
- Retención a 30 días (workers y clientes)
- % de disputas
- Uso real de tienda y créditos

Si mejoran, la filosofía “está viva” en el producto.

---

## Plan de acción sugerido (30–45 días)

| Fase | Enfoque |
|------|---------|
| Semanas 1–2 | Pagos (idempotencia/firma), Reverb separado, Sentry, Horizon, configuración estable (`config` / `.env`) |
| Semana 3 | Lanzamiento suave en **zona piloto** (invitación cerrada, comunidad semilla 50–100 personas) |
| Semanas 4–6 | Medir densidad y feedback; iterar solo lo que duele |
| Mes 2 | Si hay liquidez, **segunda zona**; si no, seguir profundizando la primera |

---

## Cierre del experto

No hace falta cambiar de stack: hay que **alinear cada decisión técnica y de producto con la promesa central** y ejecutar con rigor en lo operativo y lo local.

**Profundizaciones posibles (cuando el equipo decida):**

- Plan de lanzamiento piloto detallado  
- Checklist “antes de producción” ampliado  
- Estrategia de adquisición de los primeros usuarios reales  

---

*Texto integrado y archivado para el equipo JobsHours; convive con los informes en `docs/`.*
