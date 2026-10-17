import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '@/utils/AppError';
import { prisma } from '@/config/prisma';
import { enrollmentSchema } from '@elprofeclei/shared';
import { assertCouponUsable, calculateDiscountedAmount } from '@/utils/coupons';
import { assertCohortAccess, requireUser } from '@/utils/access';
import { registrarAuditoria } from '@/utils/audit';
import { enviarCorreoSeguro, plantillaPagoConfirmado } from '@/utils/mailer';
import { env } from '@/config/env';
import type { Request } from 'express';

// Include estándar para devolver la matrícula con su pago y cohorte
const enrollmentInclude = {
  payment: { include: { coupon: { select: { code: true } } } },
  cohort: { include: { course: true } },
} satisfies Prisma.EnrollmentInclude;

// Generar código corto de referencia para el comprobante del estudiante
function generatePaymentReference(): string {
  return randomUUID()
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 8)
    .toUpperCase();
}

// Verificar que el usuario sea el instructor dueño del curso de la cohorte o ADMIN
async function assertCohortOwner(cohortId: string, req: Request) {
  // Regla centralizada en utils/access (la misma que usan cursos, cohortes y sesiones)
  return assertCohortAccess(cohortId, requireUser(req));
}

export const enrollmentService = {
  async enroll(req: Request) {
    const validated = enrollmentSchema.parse(req.body);
    const userId = req.user!.id;
    const { cohortId, paymentMethod, couponCode } = validated;

    return prisma.$transaction(
      async (tx) => {
        const cohort = await tx.cohort.findUnique({
          where: { id: cohortId },
          include: { course: true, sessions: true },
        });

        if (!cohort) throw new AppError('Cohorte no encontrada', 404);
        if (cohort.deletedAt) throw new AppError('Cohorte no disponible', 400);
        if (cohort.course.status !== 'PUBLISHED') {
          throw new AppError('El curso no está publicado', 400);
        }

        const existingEnrollment = await tx.enrollment.findUnique({
          where: { userId_cohortId: { userId, cohortId } },
        });
        if (existingEnrollment) throw new AppError('Ya estás matriculado en esta cohorte', 409);

        // Contar matrículas que ocupan cupo (incluye pendientes de pago/aprobación)
        const activeEnrollmentsCount = await tx.enrollment.count({
          where: {
            cohortId,
            status: { in: ['ACTIVE', 'PENDING_APPROVAL', 'PENDING_PAYMENT'] },
          },
        });
        if (activeEnrollmentsCount >= cohort.capacity) throw new AppError('Cupo lleno', 400);

        // Validar solapamiento de horarios con las matrículas actuales del estudiante
        const userEnrollments = await tx.enrollment.findMany({
          where: { userId, status: { in: ['ACTIVE', 'PENDING_APPROVAL', 'PENDING_PAYMENT'] } },
          include: { cohort: { include: { sessions: true } } },
        });
        const userSessions = userEnrollments.flatMap((e) => e.cohort.sessions);
        for (const newSession of cohort.sessions) {
          for (const userSession of userSessions) {
            // Condición lógica de solapamiento: InicioA < FinB && FinA > InicioB
            if (
              newSession.startTime < userSession.endTime &&
              newSession.endTime > userSession.startTime
            ) {
              throw new AppError(
                `Te matriculaste en sesiones que se solapan: ${newSession.title}`,
                400,
              );
            }
          }
        }

        const baseAmount = cohort.course.price;
        const isFree = baseAmount.toNumber() === 0;

        // Curso gratuito: no genera pago; entra directo al flujo de aprobación de la cohorte
        if (isFree) {
          const status = cohort.approvalMode === 'AUTO' ? 'ACTIVE' : 'PENDING_APPROVAL';
          return tx.enrollment.create({
            data: { userId, cohortId, status },
            include: enrollmentInclude,
          });
        }

        // Curso de pago: el método de pago es obligatorio
        if (!paymentMethod) {
          throw new AppError('Selecciona un método de pago para este curso', 400);
        }

        // Validar y aplicar el cupón dentro de la misma transacción
        let couponId: string | undefined;
        let amount = baseAmount;
        if (couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode.toUpperCase() },
          });
          // Reglas de cupón compartidas con coupon.service
          const usable = assertCouponUsable(coupon, userId);
          amount = calculateDiscountedAmount(baseAmount, usable);
          couponId = usable.id;
        }

        // La matrícula nace pendiente de pago hasta que el instructor/admin lo confirme
        const enrollment = await tx.enrollment.create({
          data: { userId, cohortId, status: 'PENDING_PAYMENT' },
        });

        await tx.payment.create({
          data: {
            enrollmentId: enrollment.id,
            baseAmount,
            amount,
            method: paymentMethod,
            reference: generatePaymentReference(),
            couponId,
          },
        });

        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        return tx.enrollment.findUnique({
          where: { id: enrollment.id },
          include: enrollmentInclude,
        });
      },
      {
        // Aislamiento serializable: el cupo no se sobrevende con matrículas simultáneas
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  },

  // Listar mis matrículas (Estudiante)
  async getMyEnrollments(req: Request) {
    return prisma.enrollment.findMany({
      // No mostramos matrículas de cohortes eliminadas lógicamente
      where: { userId: req.user!.id, deletedAt: null, cohort: { deletedAt: null } },
      include: enrollmentInclude,
    });
  },

  // Listar matrículas de una cohorte (Instructor/Admin)
  async getByCohort(cohortId: string) {
    return prisma.enrollment.findMany({
      where: { cohortId, deletedAt: null },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        payment: { include: { coupon: { select: { code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Prematrículas esperando confirmación de pago (panel del docente y del ADMIN)
  async getPendientesDePago(req: Request) {
    const user = requireUser(req);
    const filtroCurso = user.role === 'ADMIN' ? {} : { instructorId: user.id };

    const pendientes = await prisma.enrollment.findMany({
      where: {
        deletedAt: null,
        status: 'PENDING_PAYMENT',
        payment: { status: 'PENDING' },
        cohort: { deletedAt: null, course: filtroCurso },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        payment: {
          select: {
            reference: true,
            amount: true,
            baseAmount: true,
            method: true,
          },
        },
        cohort: { select: { id: true, name: true, course: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return pendientes.map((fila) => ({
      id: fila.id,
      cohortId: fila.cohortId,
      estudiante: fila.user,
      cohorte: {
        id: fila.cohort.id,
        name: fila.cohort.name,
        courseTitle: fila.cohort.course.title,
      },
      pago: fila.payment
        ? {
            reference: fila.payment.reference,
            amount: Number(fila.payment.amount),
            baseAmount: Number(fila.payment.baseAmount),
            method: fila.payment.method,
          }
        : null,
    }));
  },

  // Aprobar matrícula pendiente de aprobación (Instructor dueño/Admin)
  async approve(req: Request) {
    const { id } = req.params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { cohort: { include: { course: true } } },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    await assertCohortOwner(enrollment.cohortId, req);
    if (enrollment.status !== 'PENDING_APPROVAL') {
      throw new AppError('Solo se pueden aprobar matrículas pendientes de aprobación', 400);
    }

    return prisma.enrollment.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: enrollmentInclude,
    });
  },

  // Rechazar matrícula (Instructor dueño/Admin): sirve para las pendientes de
  // aprobación y también para las prematrículas que nunca se pagaron.
  async reject(req: Request) {
    const { id } = req.params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { payment: true, cohort: { include: { course: true } } },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    await assertCohortOwner(enrollment.cohortId, req);

    if (!['PENDING_APPROVAL', 'PENDING_PAYMENT'].includes(enrollment.status)) {
      throw new AppError(
        'Solo se pueden rechazar matrículas pendientes de pago o de aprobación',
        400,
      );
    }

    return prisma.$transaction(async (tx) => {
      // Si había un pago pendiente con cupón, se libera el uso del cupón
      if (enrollment.payment && enrollment.payment.status === 'PENDING') {
        await tx.payment.update({
          where: { id: enrollment.payment.id },
          data: { status: 'CANCELLED' },
        });

        if (enrollment.payment.couponId) {
          // No baja de cero aunque el cupón se haya canjeado a mano
          await tx.coupon.updateMany({
            where: { id: enrollment.payment.couponId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }

      return tx.enrollment.update({
        where: { id },
        data: { status: 'REJECTED' },
        include: enrollmentInclude,
      });
    });
  },

  // Confirmar recepción del pago (Instructor dueño/Admin).
  // Tras el pago: cohorte AUTO -> ACTIVE; cohorte MANUAL -> PENDING_APPROVAL
  async confirmPayment(req: Request) {
    const { id } = req.params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        payment: true,
        user: { select: { email: true, firstName: true } },
        cohort: { include: { course: true } },
      },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    await assertCohortOwner(enrollment.cohortId, req);
    if (enrollment.status !== 'PENDING_PAYMENT') {
      throw new AppError('La matrícula no está pendiente de pago', 400);
    }
    if (!enrollment.payment || enrollment.payment.status !== 'PENDING') {
      throw new AppError('El pago ya fue procesado', 400);
    }

    const nextStatus = enrollment.cohort.approvalMode === 'AUTO' ? 'ACTIVE' : 'PENDING_APPROVAL';

    const actualizada = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: enrollment.payment!.id },
        data: {
          status: 'PAID',
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });

      return tx.enrollment.update({
        where: { id },
        data: { status: nextStatus },
        include: enrollmentInclude,
      });
    });

    // Rastro de auditoría y aviso al estudiante (si el correo falla, el pago ya quedó confirmado)
    registrarAuditoria({
      actorId: req.user!.id,
      accion: 'PAGO_CONFIRMADO',
      entidad: 'Enrollment',
      entidadId: id,
      detalle: { estado: nextStatus, referencia: enrollment.payment?.reference ?? null },
    });

    const base = env.FRONTEND_URL ?? 'http://localhost:5173';
    await enviarCorreoSeguro({
      para: enrollment.user.email,
      ...plantillaPagoConfirmado({
        nombre: enrollment.user.firstName,
        curso: enrollment.cohort.course.title,
        cohorte: enrollment.cohort.name,
        estado: nextStatus === 'ACTIVE' ? 'activa' : 'pendiente de aprobación',
        url: `${base}/campus`,
      }),
    });

    return actualizada;
  },

  // Cancelar la propia matrícula (Estudiante): libera cupo y uso del cupón
  async cancel(req: Request) {
    const { id } = req.params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    if (enrollment.userId !== req.user!.id) {
      throw new AppError('Solo puedes cancelar tus propias matrículas', 403);
    }
    if (!['PENDING_PAYMENT', 'PENDING_APPROVAL', 'ACTIVE'].includes(enrollment.status)) {
      throw new AppError('La matrícula no se puede cancelar en su estado actual', 400);
    }

    return prisma.$transaction(async (tx) => {
      // Si había un pago pendiente con cupón, devolver el uso del cupón
      const payment = enrollment.payment;
      if (payment && payment.status === 'PENDING') {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'CANCELLED' },
        });
        if (payment.couponId) {
          await tx.coupon.update({
            where: { id: payment.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      }

      return tx.enrollment.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: enrollmentInclude,
      });
    });
  },
};
