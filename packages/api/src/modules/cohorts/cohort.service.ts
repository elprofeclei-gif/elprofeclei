import { PrismaClient, CohortApprovalMode } from '@prisma/client';
import { cohortSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const cohortService = {
  // Crear cohorte
  async create(req: Request) {
    const validated = cohortSchema.parse(req.body);
    return prisma.cohort.create({
      data: {
        courseId: validated.courseId,
        name: validated.name, // <--- ESTA LÍNEA ES LA QUE FALTABA
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
      // Incluimos las sesiones ordenadas por fecha de inicio
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });
  },

  // Actualizar cohorte
  async update(req: Request) {
    const { id } = req.params;
    const { name, startDate, endDate, capacity, approvalMode } = req.body;

    const dataToUpdate: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      capacity?: number;
      approvalMode?: CohortApprovalMode;
    } = {};
    if (name !== undefined) dataToUpdate.name = name; // NUEVO
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);
    if (capacity !== undefined) dataToUpdate.capacity = Number(capacity);
    if (approvalMode) dataToUpdate.approvalMode = approvalMode as CohortApprovalMode;

    return prisma.cohort.update({
      where: { id },
      data: dataToUpdate,
    });
  },

  // Eliminar (lógico) cohorte y sus sesiones en cascada
  async delete(req: Request) {
    const { id } = req.params;

    // Usamos transacción para asegurar que se borren las sesiones Y se oculte la cohorte
    return prisma.$transaction([
      // 1. Eliminar todas las sesiones asociadas a esta cohorte (Hard delete)
      prisma.session.deleteMany({ where: { cohortId: id } }),
      // 2. Ocultar la cohorte (Soft delete)
      prisma.cohort.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  },
};
