# Checklist — Prioridades post-retro experto (mayo 2026)

Marcá ítems según avances. Orden alineado con `RETRO-EXPERTO-MAYO-2026.md`.

## Crítico (antes de empujar tráfico fuerte)

- [ ] Webhooks Mercado Pago: **firma válida** + manejo **idempotente** (no doble acreditación / no procesar dos veces el mismo evento)
- [ ] Reverb (o WS) en **proceso separado** con supervisor; Redis como capa de broadcast/cola acorde al setup
- [ ] **Sentry** (o equivalente) en API + front crítico
- [ ] **Horizon** (o monitor visible de colas) si usás colas Redis en serio
- [ ] Deploy repetible: sin `.env` duplicados conflictivos; política clara de `config:cache` vs `.env` en prod
- [ ] VPS / recursos: RAM y DB no como cuello de botella obvio; cron `schedule:run` y workers verificados

## Producto y operación

- [ ] **Una zona piloto** elegida (ciudad/barrio) y criterio de “éxito” (p. ej. respuesta en X minutos)
- [ ] Comunidad semilla contactada (lista inicial workers + clientes)
- [ ] Soporte: canal humano respondiendo en horas (primeras semanas)
- [ ] SLAs y textos de producto **alineados** con lo que el sistema y la ops pueden cumplir

## Crecimiento y medición

- [ ] Dashboard o hoja semanal: demandas zona, completadas, tiempo respuesta, retención 30d, disputas, uso tienda/créditos
- [ ] Contenido / ads: historias reales, no solo capturas de features

## Recordatorio

Densidad local **antes** de optimizar segunda ciudad o muchas features nuevas.
