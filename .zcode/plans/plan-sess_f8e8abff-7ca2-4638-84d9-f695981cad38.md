# Matrícula y pagos: modelo Payment, cupones server-side y ciclo de vida completo de la matrícula

## Problema actual
- `paymentMethod` llega crudo de `req.body` (sin Zod) y **no se persiste**: solo decide el status inicial.
- Sin pasarela, cualquiera que envíe `paymentMethod: 'ONLINE'` en cohorte AUTO queda `ACTIVE` **sin pagar**.
- **Las matrículas PENDING_APPROVAL quedan atascadas para siempre**: no existe endpoint ni UI para aprobarlas/rechazarlas.
- El total se calcula en el cliente con precio hardcodeado (150000); el canje de cupón (`/coupons/redeem`) no está conectado a la matrícula y no revalida reglas.
- No se distingue "pendiente de pago" de "pendiente de aprobación".

## 1. Prisma (`packages/api/prisma/schema.prisma` + migración + seed)
- Enum `PaymentMethod { ONLINE NEQUI CASH }` y `PaymentStatus { PENDING PAID CANCELLED }`.
- Enum `EnrollmentStatus`: añadir `PENDING_PAYMENT`.
- Modelo `Payment` (1:1 con Enrollment): `baseAmount` (precio del curso al matricularse), `amount` (total tras cupón), `method`, `status`, `couponId?`, `reference` (código corto de 8 caracteres para el comprobante del estudiante), `confirmedById?`, `confirmedAt?`.
- Migración con `npx prisma migrate dev --name payments_model`.
- Seed: fechas de cohorte a futuro (hoy son 2024, ya vencidas), curso pago con cohorte AUTO + cohorte MANUAL, un curso gratis, y cupones de prueba (porcentual, monto fijo, beca 100% asignada al estudiante).

## 2. Shared (`packages/shared/src`)
- `enrollmentSchema`: + `paymentMethod: z.enum(['ONLINE','NEQUI','CASH']).optional()` y `couponCode: z.string().min(4).max(20).optional()`.
- Tipos: `PaymentView` y ampliación de `EnrollmentView`/vista admin con `payment`.

## 3. API — enrollments (service, controller, routes)
- `enroll()` rediseñado dentro de la MISMA transacción actual:
  - Precio real desde `cohort.course.price`.
  - **Curso gratis**: sin Payment; `AUTO → ACTIVE`, `MANUAL → PENDING_APPROVAL`.
  - **Curso pago**: Enrollment `PENDING_PAYMENT` + Payment `PENDING` con total calculado **en el servidor** y referencia.
  - **Cupón**: revalida vigencia/maxUses/asignación (beca), calcula descuento (PERCENTAGE o FIXED, mínimo 0), incrementa `usedCount` y enlaza `couponId` — atómico. El frontend ya no llama a `/coupons/redeem`.
  - Conteo de cupo incluye `PENDING_PAYMENT`.
- Métodos nuevos (permiso: instructor dueño del curso o ADMIN, mismo patrón de `attendance.service`):
  - `approve` (PENDING_APPROVAL→ACTIVE) — `PATCH /enrollments/:id/approve`
  - `reject` (→REJECTED) — `PATCH /enrollments/:id/reject`
  - `confirmPayment` (Payment→PAID con confirmado-por/fecha; Enrollment PENDING_PAYMENT→ACTIVE si AUTO, si no PENDING_APPROVAL) — `PATCH /enrollments/:id/confirm-payment`
  - `cancel` (el estudiante cancela su propia matrícula en estados PENDING_*/ACTIVE → CANCELLED; libera cupo y uso de cupón) — `PATCH /enrollments/:id/cancel`
- `getMyEnrollments` y `getByCohort` incluyen `payment` (con cupón) para pintar todo.

## 4. API — courses
- Nuevo `GET /courses/:id` (curso PUBLISHED con sus cohortes, cualquier autenticado). El detalle deja de usar el endpoint de cohortes de administración y obtiene el precio real.

## 5. Web
- `enrollments.service`: `enroll(cohortId, paymentMethod, couponCode?)`, `approve`, `reject`, `confirmPayment`, `cancel`; `courses.service.getCourse(id)`.
- `CourseDetailPage`: precio real de la API; curso gratis → botón "Matricularme (gratis)" sin checkout; curso pago → checkout con vista previa de cupón (solo preview), instrucciones por método (Nequi/efectivo/ONLINE con confirmación) mostrando la **referencia** generada, y mensajes post-matrícula correctos por estado.
- `StudentDashboard`: mapa correcto de los 6 estados con color y etiqueta ("Pendiente de pago" + monto, "Pendiente de aprobación", Activa, Rechazada, Cancelada, Completada) y botón "Cancelar" en estados pendientes.
- `ManageCohortsPage`: nueva sección por cohorte con la lista de matrículas (estudiante, estado, pago) y botones **Confirmar pago / Aprobar / Rechazar** — desbloquea el ciclo hoy atascado.

## 6. Verificación
- `npx tsc --noEmit` (api y web), `npm run lint`, migración aplicada y seed ejecutado.
- Prueba del flujo completo: pago con cupón → confirmar pago → aprobar; gratis+AUTO → ACTIVE directo; cancelación libera cupo.

## Fuera de alcance (futuro)
Pasarela real (Wompi/MercadoPago): el modelo `Payment` queda listo para que un webhook marque `PAID` sin cambios de esquema. Comentarios en español, sin `any`, MVC estricto.