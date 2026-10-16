import type { Request } from 'express';
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';

// Usuario autenticado que inyecta authMiddleware (sin acoplar los servicios a Request)
export interface AuthUser {
  id: string;
  role: string;
}

// Extrae el usuario del request o corta con 401
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new AppError('No autenticado', 401);
  return req.user;
}

// Un instructor solo gestiona sus cursos; el ADMIN gestiona todo.
// Regla centralizada para no repetirla (y no olvidarla) en cada servicio.
export async function assertCourseAccess(courseId: string, user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { instructorId: true },
  });
  if (!course) throw new AppError('Curso no encontrado', 404);
  if (course.instructorId !== user.id) {
    throw new AppError('No tienes permiso sobre este curso', 403);
  }
}

export async function assertCohortAccess(cohortId: string, user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { course: { select: { instructorId: true } } },
  });
  if (!cohort) throw new AppError('Cohorte no encontrada', 404);
  if (cohort.course.instructorId !== user.id) {
    throw new AppError('No tienes permiso sobre esta cohorte', 403);
  }
}

export async function assertSessionAccess(sessionId: string, user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { cohort: { select: { course: { select: { instructorId: true } } } } },
  });
  if (!session) throw new AppError('Sesión no encontrada', 404);
  if (session.cohort.course.instructorId !== user.id) {
    throw new AppError('No tienes permiso sobre esta sesión', 403);
  }
}

export async function assertAssessmentAccess(assessmentId: string, user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { cohort: { select: { course: { select: { instructorId: true } } } } },
  });
  if (!assessment) throw new AppError('Evaluación no encontrada', 404);
  if (assessment.cohort.course.instructorId !== user.id) {
    throw new AppError('No tienes permiso sobre esta evaluación', 403);
  }
}
