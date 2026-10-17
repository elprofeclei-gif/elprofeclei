import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import { courseSchema, courseQuerySchema } from '@elprofeclei/shared';
import type { CourseStatsView } from '@elprofeclei/shared';
import { assertCourseAccess, requireUser } from '@/utils/access';
import { registrarAuditoria } from '@/utils/audit';
import type { Request } from 'express';

// Estados de matrícula que ocupan cupo a efectos del catálogo
const ENROLLED_STATUSES = ['ACTIVE', 'PENDING_APPROVAL', 'PENDING_PAYMENT'] as const;

// Cohorte tal como la devuelve la consulta del catálogo: solo lo que usan las métricas
interface CohortForStats {
  startDate: Date;
  endDate: Date;
  capacity: number;
  _count: { enrollments: number };
}

// Métricas del catálogo calculadas en memoria a partir de las cohortes no borradas
function buildStats(cohorts: readonly CohortForStats[], now: Date): CourseStatsView {
  const fechasDeInicio = cohorts
    .filter((cohorte) => cohorte.startDate >= now)
    .map((cohorte) => cohorte.startDate)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    cohortCount: cohorts.length,
    openCohortCount: cohorts.filter((cohorte) => cohorte.endDate >= now).length,
    enrolledCount: cohorts.reduce((total, cohorte) => total + cohorte._count.enrollments, 0),
    totalCapacity: cohorts.reduce((total, cohorte) => total + cohorte.capacity, 0),
    nextStartDate: fechasDeInicio.length > 0 ? fechasDeInicio[0].toISOString() : null,
  };
}

export const courseService = {
  // Crear curso (borrador) - Solo INSTRUCTOR/ADMIN
  async create(req: Request) {
    const validated = courseSchema.parse(req.body);
    const user = requireUser(req);

    return prisma.course.create({
      data: {
        ...validated,
        instructorId: user.id,
        status: 'DRAFT',
      },
    });
  },

  // Catálogo de cursos publicados con filtros, búsqueda, orden y paginación.
  // Devuelve los cursos con métricas reales (agregadas en memoria) y el total de
  // resultados para que la vista pueda paginar con las cabeceras X-*.
  async getPublished(req: Request) {
    const query = courseQuerySchema.parse(req.query);

    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(query.modality ? { modality: query.modality } : {}),
      ...(query.duration ? { duration: query.duration } : {}),
      ...(query.price === 'free'
        ? { price: 0 }
        : query.price === 'paid'
          ? { price: { gt: 0 } }
          : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CourseOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    // Un solo findMany con include (en vez de una consulta por curso) evita N+1:
    // traemos las cohortes no borradas con el conteo de matrículas que ocupan cupo.
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          instructor: { select: { firstName: true, lastName: true } },
          cohorts: {
            where: { deletedAt: null },
            include: {
              _count: {
                select: {
                  enrollments: {
                    where: { deletedAt: null, status: { in: [...ENROLLED_STATUSES] } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    // Misma referencia de "ahora" para todas las métricas de esta página
    const now = new Date();

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      courses: courses.map(({ cohorts, ...course }) => ({
        ...course,
        stats: buildStats(cohorts, now),
      })),
    };
  },

  // Listar cursos propios: el instructor solo ve los suyos, el ADMIN ve todos
  async getMyCourses(req: Request) {
    const user = requireUser(req);

    return prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(user.role === 'ADMIN' ? {} : { instructorId: user.id }),
      },
      include: { instructor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Detalle de curso publicado con sus cohortes (cualquier autenticado)
  async getById(req: Request) {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, deletedAt: null, status: 'PUBLISHED' },
      include: {
        instructor: { select: { firstName: true, lastName: true } },
        cohorts: {
          where: { deletedAt: null },
          orderBy: { startDate: 'asc' },
        },
      },
    });
    if (!course) throw new AppError('Curso no encontrado', 404);
    return course;
  },

  // Enviar a revisión - INSTRUCTOR dueño o ADMIN
  async submitForReview(req: Request) {
    const user = requireUser(req);
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw new AppError('Curso no encontrado', 404);

    await assertCourseAccess(course.id, user);
    if (course.status !== 'DRAFT') throw new AppError('El curso no está en estado borrador', 400);

    return prisma.course.update({
      where: { id: course.id },
      data: { status: 'PENDING_REVIEW' },
    });
  },

  // Aprobar curso - Solo ADMIN (rol validado en la ruta)
  async approve(req: Request) {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) throw new AppError('Curso no encontrado', 404);
    if (course.status !== 'PENDING_REVIEW') throw new AppError('El curso no está en revisión', 400);

    const cursoPublicado = await prisma.course.update({
      where: { id: course.id },
      data: { status: 'PUBLISHED' },
    });

    registrarAuditoria({
      actorId: requireUser(req).id,
      accion: 'CURSO_APROBADO',
      entidad: 'Course',
      entidadId: course.id,
      detalle: { titulo: course.title, instructorId: course.instructorId },
    });

    return cursoPublicado;
  },

  // Actualizar curso: solo el dueño (o ADMIN) y solo campos editables.
  // El estado NO se cambia por aquí: se cambia con /submit y /approve,
  // así un instructor no puede publicarse un curso saltándose al ADMIN.
  async update(req: Request) {
    const user = requireUser(req);
    await assertCourseAccess(req.params.id, user);

    const { title, description, price } = req.body as {
      title?: string;
      description?: string;
      price?: number | string;
    };

    const dataToUpdate: { title?: string; description?: string; price?: number } = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        throw new AppError('El precio debe ser un número mayor o igual a 0', 400);
      }
      dataToUpdate.price = numericPrice;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new AppError('No hay campos válidos para actualizar', 400);
    }

    return prisma.course.update({ where: { id: req.params.id }, data: dataToUpdate });
  },

  // Eliminar (lógico) curso - solo el dueño o ADMIN
  async delete(req: Request) {
    const user = requireUser(req);
    await assertCourseAccess(req.params.id, user);

    return prisma.course.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
  },
};
