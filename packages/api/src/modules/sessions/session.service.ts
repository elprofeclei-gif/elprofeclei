import { PrismaClient, SessionType } from '@prisma/client';
import { sessionSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const sessionService = {
  async create(req: Request) {
    const validated = sessionSchema.parse(req.body);

    return prisma.session.create({
      data: {
        cohortId: validated.cohortId,
        title: validated.title,
        type: validated.type,
        videoUrl: validated.videoUrl || null,
        venueId: validated.venueId || null,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
      },
    });
  },
  // Listar sesiones del instructor o admin
  async getMySessions(req: Request) {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Si es admin, ve todas. Si es instructor, solo las de sus cursos
    const whereClause = role === 'ADMIN' ? {} : { cohort: { course: { instructorId: userId } } };

    return prisma.session.findMany({
      where: whereClause,
      include: { cohort: { include: { course: true } } },
      orderBy: { startTime: 'asc' },
    });
  },

  // Listar sesiones de una cohorte
  async getByCohort(cohortId: string) {
    return prisma.session.findMany({ where: { cohortId } });
  },

  // Actualizar sesión
  async update(req: Request) {
    const { id } = req.params;
    const { title, type, videoUrl, venueId, startTime, endTime } = req.body;

    const dataToUpdate: {
      title?: string;
      type?: SessionType;
      videoUrl?: string | null;
      venueId?: string | null;
      startTime?: Date;
      endTime?: Date;
    } = {};

    if (title) dataToUpdate.title = title;
    if (type) dataToUpdate.type = type as SessionType;
    if (videoUrl !== undefined) dataToUpdate.videoUrl = videoUrl || null;
    if (venueId !== undefined) dataToUpdate.venueId = venueId || null;
    if (startTime) dataToUpdate.startTime = new Date(startTime);
    if (endTime) dataToUpdate.endTime = new Date(endTime);

    return prisma.session.update({
      where: { id },
      data: dataToUpdate,
    });
  },

  // Eliminar sesión
  async delete(req: Request) {
    const { id } = req.params;
    return prisma.session.delete({ where: { id } });
  },
};
