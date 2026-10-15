import { PrismaClient, CourseStatus } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { courseSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const courseService = {
  // Crear curso (borrador) - Solo INSTRUCTOR
  async create(req: Request) {
    const validated = courseSchema.parse(req.body);

    return prisma.course.create({
      data: {
        ...validated,
        instructorId: req.user!.id,
        status: 'DRAFT',
      },
    });
  },

  // Listar cursos publicados - Para STUDENT
  async getPublished() {
    return prisma.course.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      include: { instructor: { select: { firstName: true, lastName: true } } },
    });
  },
  // Listar cursos - Para INSTRUCTOR y ADMIN
  async getMyCourses(_req: Request) {
    // <-- Cambiamos req por _req
    return prisma.course.findMany({
      where: { deletedAt: null },
      include: { instructor: { select: { firstName: true, lastName: true } } },
    });
  },
  // Enviar a revisión - INSTRUCTOR
  async submitForReview(req: Request) {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw new AppError('Curso no encontrado', 404);
    if (course.instructorId !== req.user!.id && req.user!.role !== 'ADMIN')
      throw new AppError('No tienes permiso', 403);
    if (course.status !== 'DRAFT') throw new AppError('El curso no está en estado borrador', 400);

    return prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_REVIEW' },
    });
  },

  // Aprobar curso - ADMIN
  async approve(req: Request) {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw new AppError('Curso no encontrado', 404);
    if (course.status !== 'PENDING_REVIEW') throw new AppError('El curso no está en revisión', 400);

    return prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });
  },

  // Actualizar curso (seguro para actualizaciones parciales)
  async update(req: Request) {
    const { id } = req.params;
    const { title, description, price, status } = req.body;

    // Usamos el Enum de Prisma para el status
    const dataToUpdate: {
      title?: string;
      description?: string;
      price?: number;
      status?: CourseStatus;
    } = {};
    if (title) dataToUpdate.title = title;
    if (description) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (status) dataToUpdate.status = status as CourseStatus; // Hacemos cast al Enum

    return prisma.course.update({
      where: { id },
      data: dataToUpdate,
    });
  },
  // Eliminar (lógico) curso
  async delete(req: Request) {
    const { id } = req.params;
    return prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
