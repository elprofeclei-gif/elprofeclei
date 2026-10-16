# ADR 0002 — Pago con confirmación manual y prematrícula

- **Estado**: aceptado
- **Fecha**: 2026-10-16

## Contexto

La pasarela de pago no está integrada todavía, pero los cursos de pago deben poder venderse sin que eso dé acceso gratuito: la primera versión activaba la matrícula cuando el navegador enviaba `paymentMethod: 'ONLINE'`, un dato que el usuario controla.

## Decisión

- Un curso de pago crea la matrícula en estado `PENDING_PAYMENT` junto a un registro `Payment` con monto base, monto con cupón, método elegido y una referencia corta única para el comprobante.
- El acceso se concede cuando el instructor dueño del curso (o un ADMIN) confirma el pago: `Payment` pasa a `PAID` y la matrícula a `ACTIVE`, o a `PENDING_APPROVAL` si la cohorte usa aprobación manual.
- El uso del cupón se descuenta al crear la prematrícula dentro de la misma transacción y se devuelve si la matrícula se cancela o se rechaza.
- Los cursos gratuitos no generan registro de pago y entran directo al flujo de aprobación de la cohorte.

## Consecuencias

- Nunca se otorga acceso sin una confirmación humana del pago.
- La conciliación es manual: alguien debe revisar la transferencia y confirmarla en la interfaz (por eso el estado `PENDING_PAYMENT` es visible para el estudiante con su referencia).
- Al integrar la pasarela, el modelo `Payment` se reutiliza: el webhook de la pasarela marca `PAID` en lugar de la confirmación manual.
