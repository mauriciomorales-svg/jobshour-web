# Tienda + JobsHours (demandas)

Guía API servidor (token, IPs, cURL): **`jobshour-api/docs/INTEGRACION-TIENDA-DEMANDA.md`** (repo backend).

Hay dos formas de encadenar un pedido de tienda con una **demanda en el mapa** de JobsHours:

1. **Navegador (cliente):** deep link `?pubdemanda=1&lat=…&lng=…` y parámetros opcionales (`q`, `tienda`, `source`, `return`, etc.). Implementación en `src/lib/integrateDemandFromUrl.ts` y `buildPubdemandaJobsHoursUrl`.
2. **Servidor (tienda):** tras pago o lógica propia, `POST` a la API con Bearer de integración. Documentación y cURL en el repo de la API: `jobshour-api/docs/INTEGRACION-TIENDA-DEMANDA.md`.

El flujo servidor no sustituye al deep link; son complementarios (webhook vs. usuario abriendo el sitio).
