# Pagos y soporte — texto operativo MVP

Objetivo: que **cliente y worker** sepan qué hacer si el dinero no cuadra con el banco o con la app.

## Principios

1. **La app muestra montos internos** (pedidos, estados, inventario). El extracto bancario o Mercado Pago puede diferir por comisiones, retenciones o nombre del comercio.
2. **Soporte** interviene con: correo del usuario, fecha/hora aproximada, ID de pedido o captura de pantalla.

## Respuesta tipo (soporte / FAQ)

> Los montos en JobsHours y en tu tienda reflejan los registros del sistema. Si ves un cargo que no reconoces, revisa el comprobante de Mercado Pago y escríbenos a **contacto@jobshour.cl** con el número de pedido o el link de la tienda.

## Worker — “Mis ganancias”

- Dejar claro: **histórico vs últimos 7/30/90 días** solo aplica a servicios JobsHours con fecha de cierre.
- Tienda: montos del **inventario**; detalle por producto en **Estadísticas** de la tienda.

## Cliente — tienda

- Tras pagar: **success / pending / failure** deben indicar el siguiente paso (esperar, reintentar, contactar).
- Incluir enlace a **términos**, **privacidad** y **correo** en esas pantallas.

## Disputas y reembolsos

- Definir internamente quién contacta a Mercado Pago (plataforma vs vendedor) según vuestro modelo legal.
- Hasta tener flujo automático: canal único de correo y plantilla de respuesta.

## Correo al confirmar pago (tienda)

- Cuando un pedido de tienda pasa de `pending` a `paid`, la API intenta enviar un correo al comprador (enlace al detalle) y un aviso corto al vendedor. Requiere `MAIL_*` y `FRONTEND_URL` correctos en el servidor Laravel.

---

Actualizar el correo si el definitivo no es `contacto@jobshour.cl`.
