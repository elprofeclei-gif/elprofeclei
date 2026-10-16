# ADR 0004 — Progreso derivado y certificación verificable

- **Estado**: aceptado
- **Fecha**: 2026-10-16

## Contexto

La plataforma necesitaba responder dos preguntas con datos fiables: «¿cuánto ha avanzado este estudiante?» y «¿ya puede certificarse?». La opción evidente era una tabla de progreso que se fuera actualizando, pero eso añade un dato que puede desincronizarse con la realidad (una asistencia borrada, una entrega calificada de nuevo) y exige migración de base de datos.

## Decisión

- **El progreso no se guarda: se calcula** en `packages/api/src/utils/progress.ts` a partir de lo que ya existe: sesiones de la cohorte, asistencias registradas, evaluaciones, entregas y notas.
- **Requisitos de certificación** en un solo lugar, con valores explícitos: 80 % de asistencia, todas las evaluaciones entregadas **y calificadas**, nota media mínima del 70 % sobre la nota máxima de cada evaluación.
- Una cohorte **sin sesiones** no bloquea por asistencia, y una **sin evaluaciones** no bloquea por entregas ni por nota: no se exige lo que la cohorte no ofrece.
- La emisión del certificado (`POST /api/certificates/issue`) **verifica los requisitos** y devuelve el detalle de lo que falta; un ADMIN puede forzarla con `forzar: true` (queda registrado quién confirmó el pago y quién emitió).
- Al emitir el certificado, la matrícula pasa a `COMPLETED`.
- **El PDF lo genera el navegador**: la vista imprimible usa CSS de impresión (`@media print`, A4 horizontal) y `window.print()`. No se añade ninguna dependencia de generación de PDF ni se almacenan archivos.
- Los quizzes se **corrigen en el servidor** al enviarse (la respuesta correcta nunca viaja al navegador del estudiante) y quedan calificados en el acto.

## Consecuencias

- El avance que ve el estudiante, el que ve el instructor y el que decide la certificación salen del mismo cálculo: no pueden discrepar.
- Cambiar los umbrales es cambiar tres constantes, sin migración.
- Los quizzes corregidos automáticamente no permiten reclamo manual sin re-calificar (el instructor puede volver a calificar cualquier entrega con `PATCH /assessments/:id/grade`).
- Si más adelante se quiere un umbral distinto **por cohorte**, hará falta una columna: está anotado en `docs/pendiente-esquema-avanzado.md`.
