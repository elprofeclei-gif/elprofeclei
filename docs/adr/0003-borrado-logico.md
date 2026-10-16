# ADR 0003 — Borrado lógico en usuarios, cursos, cohortes y matrículas

- **Estado**: aceptado
- **Fecha**: 2026-10-16

## Contexto

La plataforma maneja dinero, asistencia y certificados: borrar físicamente un curso o una matrícula destruiría historial que puede necesitarse para auditar pagos o resolver disputas. Al mismo tiempo, la Ley 1581 de 2012 obliga a poder retirar los datos de un usuario.

## Decisión

- `User`, `Course`, `Cohort` y `Enrollment` usan borrado lógico (`deletedAt`) en lugar de `DELETE`.
- Toda consulta de listado filtra `deletedAt: null`, incluidas las relaciones (por ejemplo, una matrícula cuya cohorte fue eliminada no se muestra en el campus).
- Las sesiones sí se eliminan físicamente al borrar su cohorte, porque sin cohorte no tienen significado propio.
- El borrado de una cohorte o un curso exige ser el instructor dueño o un ADMIN.

## Consecuencias

- No se pierde el historial de pagos, asistencia ni certificados ya emitidos.
- Las consultas deben recordar el filtro: se centraliza en los servicios para no repetirlo (y no olvidarlo) en cada controlador.
- La restricción única `(userId, cohortId)` sigue bloqueando re-matricularse en la misma cohorte; cuando se cancela o rechaza una matrícula, se reutiliza su registro en vez de crear otro.
