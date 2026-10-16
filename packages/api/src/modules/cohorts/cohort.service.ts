import { prisma } from '@/config/prisma';
import { cohortSchema } from '@elprofeclei/shared';
import { assertCohortAccess, assertCourseAccess, requireUser } from '@/utils/access';
import type { CohortApprovalMode } from '@prisma/client';
import type { Request } from 'express';

export const cohortService = {
  // Crear cohorte - solo el instructor dueño del curso (o ADMIN)
  async create(req: Request) {
    const validated = cohortSchema.parse(req.body);
    const user = requireUser(req);

    await assertCourseAccess(validated.courseId, user);

    return prisma.cohort.create({
      data: {
        courseId: validated.courseId,
        name: validated.name,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        capacity: validated.capacity,
        approvalMode: validated.approvalMode,
      },
    });
  },

  async getByCourse(courseId: string) {
    return prisma.cohort.findMany({
      where: { courseId, deletedAt: null },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });
  },

  // Actualizar cohorte - solo el instructor dueño (o ADMIN)
  async update(req: Request) {
    const user = requireUser(req);
    await assertCohortAccess(req.params.id, user);

    const { name, startDate, endDate, capacity, approvalMode } = req.body;

    const dataToUpdate: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      capacity?: number;
      approvalMode?: CohortApprovalMode;
    } = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);
    if (capacity !== undefined) dataToUpdate.capacity = Number(capacity);
    if (approvalMode) dataToUpdate.approvalMode = approvalMode as CohortApprovalMode;

    return prisma.cohort.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });
  },

  // Eliminar (lógico) cohorte y sus sesiones en cascada - solo el dueño (o ADMIN)
  async delete(req: Request) {
    const user = requireUser(req);
    await assertCohortAccess(req.params.id, user);

    const { id } = req.params;

    return prisma.$transaction([
      // 1. Las sesiones se eliminan físicamente (no tienen borrado lógico)
      prisma.session.deleteMany({ where: { cohortId: id } }),
      // 2. La cohorte se oculta (soft delete)
      prisma.cohort.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  },
};
