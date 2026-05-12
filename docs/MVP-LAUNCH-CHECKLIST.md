# Checklist lanzamiento MVP — JobsHours (cliente + worker)

Marcar antes de abrir a usuarios reales. Prioridad: **pagos**, **soporte** y **datos**.

## Cliente — servicios (mapa / solicitudes)

- [ ] Publicar necesidad y recibir oferta o match según flujo actual.
- [ ] Estados del pedido legibles (pendiente, aceptado, en curso, completado, cancelado).
- [ ] Pago (Mercado Pago u otro) con pantalla de **éxito** y **error**; el usuario puede **volver a ver** el estado del pedido.
- [ ] Chat o canal acordado para coordinar (si aplica).
- [ ] Texto claro si el pago falla o queda pendiente (qué hacer después).

## Cliente — tienda

- [ ] Catálogo, carrito y checkout en móvil (Chrome/Safari).
- [ ] Páginas `/tienda/success`, `/tienda/pending`, `/tienda/failure` enlazan a inicio y muestran **soporte** si algo falla.
- [ ] Link público de tienda compartible y probado.

## Worker

- [ ] Perfil mínimo visible en mapa (nickname, categoría, zona).
- [ ] **Mis trabajos** coherente con API (montos y estados).
- [ ] **Mis ganancias** con periodos y texto que distingue app vs banco.
- [ ] Tienda propietario: pestaña Estadísticas accesible (incl. `?tab=stats`).

## Confianza (ambos)

- [ ] `/terminos` y `/privacidad` accesibles desde login, registro, ajustes y post-pago tienda.
- [ ] Correo de soporte visible (`contacto@jobshour.cl` o el definitivo del producto).
- [ ] Política breve de pagos / discrepancias (ver `MVP-PAGOS-Y-SOPORTE.md`).

## Operación

- [ ] Deploy documentado (`MVP-DEPLOY-RUNBOOK.md`).
- [ ] Variables `.env` / `NEXT_PUBLIC_*` alineadas en producción.
- [ ] API + inventario + front levantados; health-check manual tras deploy.
- [ ] Backup de base de datos y prueba de restauración (al menos documentada).

## Calidad (30 min antes de salir)

- [ ] Un flujo **servicio** de punta a punta con tarjeta de prueba o monto mínimo.
- [ ] Un flujo **tienda** idem.
- [ ] Worker ve el pedido y los montos esperados en trabajos / ganancias.

---

*Este archivo es vivo: añade ítems específicos de tu negocio (zonas, KYC, etc.).*
