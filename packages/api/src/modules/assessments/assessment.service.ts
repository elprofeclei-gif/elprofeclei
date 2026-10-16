import { prisma } from '@/config/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import {
  assessmentSchema,
  entregaSchema,
  gradeSchema,
  leerContenidoEntrega,
  leerTareaContenido,
  quizSchema,
  tareaContenidoSchema,
  type PreguntaQuizInput,
} from '@elprofeclei/shared';
import { assertAssessmentAccess, assertCohortAccess, requireUser } from '@/utils/access';
import type { Request } from 'express';

interface ResultadoQuiz {
  score: number;
  correctas: number;
  total: number;
}

// Corrección automática del quiz: suma los puntos de las respuestas correctas y
// escala el resultado a la nota máxima de la evaluación.
// Exportada para poder verificarla con pruebas unitarias.
export function corregirQuiz(
  preguntas: PreguntaQuizInput[],
  respuestas: number[],
  maxScore: number,
): ResultadoQuiz {
  const puntosPorPregunta = preguntas.map((pregunta) => pregunta.puntos ?? 1);
  const puntosTotales = puntosPorPregunta.reduce((total, puntos) => total + puntos, 0);

  let obtenidos = 0;
  let correctas = 0;

  preguntas.forEach((pregunta, indice) => {
    if (respuestas[indice] === pregunta.correcta) {
      obtenidos += puntosPorPregunta[indice];
      correctas += 1;
    }
  });

  const score =
    puntosTotales === 0 ? 0 : Math.round((obtenidos / puntosTotales) * maxScore * 100) / 100;

  return { score, correctas, total: preguntas.length };
}

// Normaliza el contenido del quiz guardado en Assessment.content (columna JSON)
function leerQuiz(contenido: Prisma.JsonValue | null): PreguntaQuizInput[] | null {
  const resultado = quizSchema.safeParse(contenido);
  return resultado.success ? resultado.data.preguntas : null;
}

// El estudiante recibe las preguntas y opciones, nunca cuál es la correcta
function contenidoQuizParaEstudiante(
  contenido: Prisma.JsonValue | null,
): Prisma.InputJsonValue | Prisma.JsonValue | null {
  const preguntas = leerQuiz(contenido);
  if (!preguntas) return contenido;

  return {
    preguntas: preguntas.map((pregunta) => ({
      enunciado: pregunta.enunciado,
      opciones: pregunta.opciones,
    })),
  };
}

// Fecha límite e instrucciones de una tarea, ya interpretadas para la vista
function datosDeTarea(evaluacion: { content: Prisma.JsonValue | null; type: string }): {
  tarea: ReturnType<typeof leerTareaContenido>;
  vencida: boolean;
} {
  if (evaluacion.type === 'QUIZ') return { tarea: {}, vencida: false };

  const tarea = leerTareaContenido(evaluacion.content);
  const limite = tarea.dueAt ? Date.parse(tarea.dueAt) : Number.NaN;

  return { tarea, vencida: Number.isNaN(limite) ? false : Date.now() > limite };
}

export const assessmentService = {
  // Crear evaluación - solo el instructor dueño del curso de la cohorte (o ADMIN)
  async create(req: Request) {
    const validated = assessmentSchema.parse(req.body);
    const user = requireUser(req);

    await assertCohortAccess(validated.cohortId, user);

    // Un quiz se guarda normalizado (y validado): así la corrección automática
    // siempre encuentra el mismo formato.
    let contenido: Prisma.InputJsonValue | undefined;
    if (validated.type === 'QUIZ') {
      const quiz = quizSchema.parse(validated.content ?? { preguntas: [] });
      contenido = quiz as unknown as Prisma.InputJsonValue;
    } else {
      // Tareas: instrucciones y fecha límite, normalizadas en la columna JSON
      const tarea = tareaContenidoSchema.parse(validated.content ?? {});
      contenido = tarea as unknown as Prisma.InputJsonValue;
    }

    return prisma.assessment.create({
      data: {
        cohortId: validated.cohortId,
        title: validated.title,
        type: validated.type,
        maxScore: validated.maxScore,
        ...(contenido === undefined ? {} : { content: contenido }),
      },
    });
  },

  // Listar evaluaciones de una cohorte: el estudiante ve además su propia entrega
  async getByCohort(cohortId: string, req: Request) {
    const user = requireUser(req);

    if (user.role === 'STUDENT') {
      const evaluaciones = await prisma.assessment.findMany({
        where: { cohortId },
        orderBy: { createdAt: 'asc' },
        include: {
          submissions: {
            where: { userId: user.id },
            select: {
              id: true,
              score: true,
              status: true,
              feedback: true,
              createdAt: true,
              content: true,
            },
          },
        },
      });

      // Se devuelve la entrega propia ya interpretada (texto, archivos y respuestas)
      // y el quiz SIN la respuesta correcta: el estudiante no debe poder leerla.
      return evaluaciones.map((evaluacion) => ({
        ...datosDeTarea(evaluacion),
        ...evaluacion,
        content:
          evaluacion.type === 'QUIZ'
            ? contenidoQuizParaEstudiante(evaluacion.content)
            : evaluacion.content,
        miEntrega:
          evaluacion.submissions.length === 0
            ? null
            : {
                id: evaluacion.submissions[0].id,
                score: evaluacion.submissions[0].score,
                status: evaluacion.submissions[0].status,
                feedback: evaluacion.submissions[0].feedback,
                createdAt: evaluacion.submissions[0].createdAt,
                contenido: leerContenidoEntrega(evaluacion.submissions[0].content),
              },
      }));
    }

    return prisma.assessment.findMany({
      where: { cohortId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { submissions: true } } },
    });
  },

  // Estudiante entrega tarea o quiz: requiere matrícula ACTIVA en la cohorte.
  // Los quizzes se corrigen solos y quedan calificados en el acto.
  async submit(req: Request) {
    const validated = entregaSchema.parse(req.body);
    const user = requireUser(req);

    const assessment = await prisma.assessment.findUnique({
      where: { id: validated.assessmentId },
      select: {
        id: true,
        cohortId: true,
        type: true,
        maxScore: true,
        content: true,
        cohort: { select: { deletedAt: true } },
      },
    });
    if (!assessment || assessment.cohort.deletedAt) {
      throw new AppError('Evaluación no encontrada', 404);
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        cohortId: assessment.cohortId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new AppError('No tienes una matrícula activa en esta cohorte', 403);
    }

    const existente = await prisma.submission.findUnique({
      where: { assessmentId_userId: { assessmentId: validated.assessmentId, userId: user.id } },
    });
    if (existente) throw new AppError('Ya has enviado una respuesta para esta evaluación', 409);

    const contenido: Prisma.InputJsonValue = {
      texto: validated.texto?.trim() ?? '',
      archivos: validated.archivos,
      ...(validated.respuestas === undefined ? {} : { respuestas: validated.respuestas }),
    };

    // Quizzes: corrección automática inmediata
    if (assessment.type === 'QUIZ') {
      const preguntas = leerQuiz(assessment.content);
      if (!preguntas) {
        throw new AppError('El quiz no tiene preguntas configuradas. Avisa a tu instructor.', 400);
      }

      const respuestas = validated.respuestas ?? [];
      if (respuestas.length === 0) {
        throw new AppError('Responde al menos una pregunta antes de enviar.', 400);
      }

      const correccion = corregirQuiz(preguntas, respuestas, Number(assessment.maxScore));

      return prisma.submission.create({
        data: {
          assessmentId: validated.assessmentId,
          userId: user.id,
          content: JSON.stringify(contenido),
          score: correccion.score,
          status: 'GRADED',
          feedback: `Corregido automáticamente: ${correccion.correctas} de ${correccion.total} respuestas correctas.`,
        },
      });
    }

    // Entrega fuera de plazo: se acepta (como en cualquier plataforma seria) pero
    // queda marcada para que el instructor lo vea al calificar.
    const tarea = leerTareaContenido(assessment.content);
    const limite = tarea.dueAt ? Date.parse(tarea.dueAt) : Number.NaN;
    const fueraDePlazo = !Number.isNaN(limite) && Date.now() > limite;

    return prisma.submission.create({
      data: {
        assessmentId: validated.assessmentId,
        userId: user.id,
        content: JSON.stringify({ ...contenido, fueraDePlazo }),
      },
    });
  },

  // Entregas pendientes de calificar en los cursos del instructor (o de todos si es ADMIN)
  async getPendientes(req: Request) {
    const user = requireUser(req);
    const filtroCurso = user.role === 'ADMIN' ? {} : { instructorId: user.id };

    const pendientes = await prisma.submission.findMany({
      where: {
        status: 'PENDING',
        assessment: { cohort: { course: filtroCurso } },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            maxScore: true,
            cohort: { select: { name: true, course: { select: { title: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return pendientes.map((entrega) => ({
      ...entrega,
      contenido: leerContenidoEntrega(entrega.content),
    }));
  },

  // Instructor califica la entrega - solo el dueño del curso (o ADMIN)
  async grade(req: Request) {
    const { score, feedback } = gradeSchema.parse(req.body);
    const user = requireUser(req);

    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      select: { id: true, assessmentId: true, assessment: { select: { maxScore: true } } },
    });
    if (!submission) throw new AppError('Entrega no encontrada', 404);

    await assertAssessmentAccess(submission.assessmentId, user);

    const maxScore = Number(submission.assessment.maxScore);
    if (score > maxScore) {
      throw new AppError(`La nota no puede superar la nota máxima (${maxScore})`, 400);
    }

    return prisma.submission.update({
      where: { id: submission.id },
      data: { score, feedback, status: 'GRADED' },
    });
  },

  // Listar entregas de una evaluación - solo el dueño del curso (o ADMIN)
  async getSubmissions(assessmentId: string, req: Request) {
    const user = requireUser(req);
    await assertAssessmentAccess(assessmentId, user);

    const entregas = await prisma.submission.findMany({
      where: { assessmentId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Se entrega el contenido interpretado: el instructor ve los enlaces y las respuestas
    return entregas.map((entrega) => ({
      ...entrega,
      contenido: leerContenidoEntrega(entrega.content),
    }));
  },
};
