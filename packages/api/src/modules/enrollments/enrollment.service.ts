import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { enrollmentSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const enrollmentService = {
  async enroll(req: Request) {
    const validated = enrollmentSchema.parse(req.body);
    const userId = req.user!.id;
    const { cohortId } = validated;

    // Transacción para evitar condiciones de carrera en el cupo
    return prisma.$transaction(async (tx) => {
      // 1. Verificar que la cohorte exista y tenga cupo
      const cohort = await tx.cohort.findUnique({
        where: { id: cohortId },
        include: { course: true, sessions: true },
      });

      if (!cohort) throw new AppError('Cohorte no encontrada', 404);
      if (cohort.deletedAt) throw new AppError('Cohorte no disponible', 400);
      if (cohort.course.status !== 'PUBLISHED')
        throw new AppError('El curso no está publicado', 400);

      // 2. Verificar que no esté ya matriculado
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { userId_cohortId: { userId, cohortId } },
      });
      if (existingEnrollment) throw new AppError('Ya estás matriculado en esta cohorte', 409);

      // 3. Contar matrículas activas/pendientes para verificar cupo
      const activeEnrollmentsCount = await tx.enrollment.count({
        where: { cohortId, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
      });
      if (activeEnrollmentsCount >= cohort.capacity) throw new AppError('Cupo lleno', 400);

      // 4. Validar solapamiento de horarios
      const userEnrollments = await tx.enrollment.findMany({
        where: { userId, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
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

      // 5. Crear matrícula según el modo de aprobación
      const status = cohort.approvalMode === 'MANUAL' ? 'PENDING_APPROVAL' : 'ACTIVE';
      return tx.enrollment.create({
        data: { userId, cohortId, status },
      });
    });
  },

  // Listar mis matrículas
  async getMyEnrollments(req: Request) {
    return prisma.enrollment.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      include: { cohort: { include: { course: true } } },
    });
  },
  // Listar matrículas de una cohorte (Instructor/Admin)
  async getByCohort(cohortId: string) {
    return prisma.enrollment.findMany({
      where: { cohortId, deletedAt: null },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  },
};
