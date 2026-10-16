import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import { assertCohortAccess, requireUser } from '@/utils/access';
import { calcularProgreso, type DatosProgreso } from '@/utils/progress';
import type { ProgresoEstudianteView, ProgresoView } from '@elprofeclei/shared';
import type { Request } from 'express';

interface ContextoCohorte {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  sesiones: { id: string }[];
  evaluaciones: { id: string; maxScore: number }[];
  estudiantes: { userId: string }[];
  asistenciasPorUsuario: Map<string, number>;
  entregasPorUsuario: Map<string, { assessmentId: string; score: number | null }[]>;
  certificadosPorUsuario: Map<string, { id: string; codigo: string; emitidoEn: string }>;
}

// Carga todo lo necesario en pocas consultas (sin N+1) y lo deja listo para calcular
async function cargarContexto(cohortId: string): Promise<ContextoCohorte> {
  const [cohorte, asistencias, certificados] = await Promise.all([
    prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: { select: { id: true, title: true } },
        sessions: { select: { id: true } },
        assessments: {
          select: {
            id: true,
            maxScore: true,
            submissions: { select: { userId: true, score: true } },
          },
        },
        enrollments: {
          where: { deletedAt: null, status: { notIn: ['CANCELLED', 'REJECTED'] } },
          select: { userId: true },
        },
      },
    }),
    prisma.attendance.groupBy({
      by: ['userId'],
      where: { session: { cohortId } },
      _count: { _all: true },
    }),
    prisma.certificate.findMany({
      where: { enrollment: { cohortId } },
      select: {
        id: true,
        verificationCode: true,
        issuedAt: true,
        enrollment: { select: { userId: true } },
      },
    }),
  ]);

  if (!cohorte || cohorte.deletedAt) throw new AppError('Cohorte no encontrada', 404);

  const asistenciasPorUsuario = new Map<string, number>(
    asistencias.map((fila) => [fila.userId, fila._count._all]),
  );

  const entregasPorUsuario = new Map<string, { assessmentId: string; score: number | null }[]>();
  for (const evaluacion of cohorte.assessments) {
    for (const entrega of evaluacion.submissions) {
      const lista = entregasPorUsuario.get(entrega.userId) ?? [];
      lista.push({
        assessmentId: evaluacion.id,
        score: entrega.score === null ? null : Number(entrega.score),
      });
      entregasPorUsuario.set(entrega.userId, lista);
    }
  }

  const certificadosPorUsuario = new Map<string, { id: string; codigo: string; emitidoEn: string }>(
    certificados.map((certificado) => [
      certificado.enrollment.userId,
      {
        id: certificado.id,
        codigo: certificado.verificationCode,
        emitidoEn: certificado.issuedAt.toISOString(),
      },
    ]),
  );

  return {
    id: cohorte.id,
    name: cohorte.name,
    courseId: cohorte.course.id,
    courseTitle: cohorte.course.title,
    sesiones: cohorte.sessions,
    evaluaciones: cohorte.assessments.map((evaluacion) => ({
      id: evaluacion.id,
      maxScore: Number(evaluacion.maxScore),
    })),
    estudiantes: cohorte.enrollments,
    asistenciasPorUsuario,
    entregasPorUsuario,
    certificadosPorUsuario,
  };
}

function armarProgreso(contexto: ContextoCohorte, userId: string): ProgresoView {
  const entregas = contexto.entregasPorUsuario.get(userId) ?? [];

  const datos: DatosProgreso = {
    sesionesTotales: contexto.sesiones.length,
    sesionesAsistidas: contexto.asistenciasPorUsuario.get(userId) ?? 0,
    evaluacionesTotales: contexto.evaluaciones.length,
    entregas: entregas.map((entrega) => ({
      assessmentId: entrega.assessmentId,
      score: entrega.score,
      maxScore: contexto.evaluaciones.find((e) => e.id === entrega.assessmentId)?.maxScore ?? 0,
    })),
  };

  const calculado = calcularProgreso(datos);
  const certificado = contexto.certificadosPorUsuario.get(userId) ?? null;

  return {
    cohortId: contexto.id,
    cohortName: contexto.name,
    courseId: contexto.courseId,
    courseTitle: contexto.courseTitle,
    estado: certificado ? 'CERTIFICADO' : calculado.estadoBase,
    asistencia: calculado.asistencia,
    evaluaciones: calculado.evaluaciones,
    requisitos: calculado.requisitos,
    certificado,
  };
}

// Progreso de un estudiante concreto: lo usa la vista del estudiante y la emisión
// de certificados (que necesita saber si ya cumple los requisitos).
export async function progresoDeEstudiante(
  cohortId: string,
  userId: string,
): Promise<ProgresoView> {
  const contexto = await cargarContexto(cohortId);
  return armarProgreso(contexto, userId);
}

export const progressService = {
  // Progreso propio dentro de una cohorte
  async getMine(req: Request) {
    const user = requireUser(req);
    const { cohortId } = req.params;

    const matricula = await prisma.enrollment.findFirst({
      where: { userId: user.id, cohortId, deletedAt: null },
      select: { id: true },
    });

    if (!matricula) {
      // El instructor dueño y el ADMIN pueden consultar el progreso de la cohorte
      if (user.role === 'ADMIN') return progresoDeEstudiante(cohortId, user.id);
      await assertCohortAccess(cohortId, user);
    }

    return progresoDeEstudiante(cohortId, user.id);
  },

  // Progreso de todo el grupo (instructor dueño o ADMIN)
  async getByCohort(req: Request) {
    const user = requireUser(req);
    const { cohortId } = req.params;

    await assertCohortAccess(cohortId, user);

    const contexto = await cargarContexto(cohortId);

    const estudiantes = await prisma.user.findMany({
      where: { id: { in: contexto.estudiantes.map((estudiante) => estudiante.userId) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const porId = new Map(estudiantes.map((estudiante) => [estudiante.id, estudiante]));

    return contexto.estudiantes
      .map((estudiante) => {
        const datos = porId.get(estudiante.userId);
        if (!datos) return null;

        const progreso: ProgresoEstudianteView = {
          ...armarProgreso(contexto, estudiante.userId),
          estudiante: {
            id: datos.id,
            firstName: datos.firstName,
            lastName: datos.lastName,
            email: datos.email,
          },
        };

        return progreso;
      })
      .filter((progreso): progreso is ProgresoEstudianteView => progreso !== null)
      .sort((a, b) => a.estudiante.lastName.localeCompare(b.estudiante.lastName));
  },
};
