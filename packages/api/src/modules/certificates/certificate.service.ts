import { prisma } from '@/config/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { randomUUID } from 'crypto';
import { assertCourseAccess, requireUser } from '@/utils/access';
import { progresoDeEstudiante } from '../progress/progress.service';
import type { Request } from 'express';

// Datos que necesita la vista imprimible: estudiante, curso, cohorte, instructor
// y fechas reales (el PDF se arma en el navegador con esta información).
const certificadoInclude = {
  enrollment: {
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      cohort: {
        include: {
          course: {
            select: {
              title: true,
              duration: true,
              modality: true,
              instructor: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CertificateInclude;

export const certificateService = {
  // Emitir certificado - INSTRUCTOR dueño del curso o ADMIN.
  // Exige los requisitos de la cohorte (asistencia, entregas y nota media);
  // un ADMIN puede forzarlo pasando `forzar: true`.
  async issue(req: Request) {
    const user = requireUser(req);
    const { enrollmentId, forzar } = req.body as { enrollmentId?: string; forzar?: boolean };
    if (!enrollmentId) throw new AppError('Falta el id de la matrícula', 400);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { cohort: { include: { course: true } } },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    // Un instructor no puede certificar cursos que no son suyos
    await assertCourseAccess(enrollment.cohort.courseId, user);

    if (!['ACTIVE', 'COMPLETED'].includes(enrollment.status)) {
      throw new AppError('Solo se certifican matrículas activas o completadas', 400);
    }

    const existente = await prisma.certificate.findFirst({ where: { enrollmentId } });
    if (existente) throw new AppError('El certificado ya fue emitido', 409);

    const progreso = await progresoDeEstudiante(enrollment.cohortId, enrollment.userId);
    const puedeForzar = forzar === true && user.role === 'ADMIN';

    if (!progreso.requisitos.elegible && !puedeForzar) {
      const promedio =
        progreso.evaluaciones.promedio === null
          ? 'sin calificar'
          : `${progreso.evaluaciones.promedio}%`;

      throw new AppError(
        'El estudiante aún no cumple los requisitos del certificado. ' +
          `Asistencia: ${progreso.asistencia.asistidas}/${progreso.asistencia.sesiones} sesiones ` +
          `(${progreso.asistencia.porcentaje}%, mínimo ${progreso.requisitos.asistenciaMinima}%). ` +
          `Evaluaciones entregadas: ${progreso.evaluaciones.entregadas}/${progreso.evaluaciones.total}. ` +
          `Nota media: ${promedio} (mínimo ${progreso.requisitos.notaMinima}%).`,
        400,
      );
    }

    // Código de verificación algo más largo que antes (menos colisiones)
    const verificationCode = randomUUID()
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 10)
      .toUpperCase();

    return prisma.$transaction(async (tx) => {
      const certificado = await tx.certificate.create({
        data: { enrollmentId, verificationCode },
        include: certificadoInclude,
      });

      // Al certificar, la matrícula queda completada
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED' },
      });

      return certificado;
    });
  },

  // Obtener mis certificados (Estudiante)
  async getMine(req: Request) {
    const user = requireUser(req);

    return prisma.certificate.findMany({
      where: { enrollment: { userId: user.id } },
      include: certificadoInclude,
      orderBy: { issuedAt: 'desc' },
    });
  },

  // Obtener un certificado propio por código (para la vista imprimible)
  async getMioPorCodigo(req: Request) {
    const user = requireUser(req);
    const { code } = req.params;

    const certificado = await prisma.certificate.findFirst({
      where: { verificationCode: code, enrollment: { userId: user.id } },
      include: certificadoInclude,
    });
    if (!certificado) throw new AppError('Certificado no encontrado', 404);
    return certificado;
  },

  // Verificación pública
  async verify(code: string) {
    const cert = await prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: certificadoInclude,
    });
    if (!cert) throw new AppError('Certificado inválido o no encontrado', 404);

    const progreso = await progresoDeEstudiante(cert.enrollment.cohortId, cert.enrollment.userId);

    return {
      ...cert,
      // Contexto útil para quien verifica: asistencia y evaluaciones reales
      asistencia: progreso.asistencia,
      evaluaciones: progreso.evaluaciones,
    };
  },
};
