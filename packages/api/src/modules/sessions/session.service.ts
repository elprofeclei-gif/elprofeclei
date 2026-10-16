import { prisma } from '@/config/prisma';
import { sessionSchema } from '@elprofeclei/shared';
import { assertCohortAccess, assertSessionAccess, requireUser } from '@/utils/access';
import type { SessionType } from '@prisma/client';
import type { Request } from 'express';

export const sessionService = {
  // Crear sesión - solo el instructor dueño del curso de la cohorte (o ADMIN)
  async create(req: Request) {
    const validated = sessionSchema.parse(req.body);
    const user = requireUser(req);

    await assertCohortAccess(validated.cohortId, user);

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
    const user = requireUser(req);

    // Si es admin, ve todas. Si es instructor, solo las de sus cursos
    const whereClause =
      user.role === 'ADMIN' ? {} : { cohort: { course: { instructorId: user.id } } };

    return prisma.session.findMany({
      where: whereClause,
      include: { cohort: { include: { course: true } } },
      orderBy: { startTime: 'asc' },
    });
  },

  // Listar sesiones de una cohorte
  async getByCohort(cohortId: string) {
    return prisma.session.findMany({ where: { cohortId }, orderBy: { startTime: 'asc' } });
  },

  // Actualizar sesión - solo el instructor dueño (o ADMIN)
  async update(req: Request) {
    const user = requireUser(req);
    await assertSessionAccess(req.params.id, user);

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
      where: { id: req.params.id },
      data: dataToUpdate,
    });
  },

  // Eliminar sesión - solo el instructor dueño (o ADMIN)
  async delete(req: Request) {
    const user = requireUser(req);
    await assertSessionAccess(req.params.id, user);

    return prisma.session.delete({ where: { id: req.params.id } });
  },
};
