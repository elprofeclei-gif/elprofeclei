import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const assessmentService = {
  // Crear evaluación (Instructor/Admin)
  async create(req: Request) {
    const { cohortId, title, type, maxScore, content } = req.body;
    return prisma.assessment.create({
      data: { cohortId, title, type, maxScore: Number(maxScore), content },
    });
  },

  // Listar evaluaciones de una cohorte (Estudiante/Instructor)
  async getByCohort(cohortId: string) {
    return prisma.assessment.findMany({ where: { cohortId } });
  },

  // Estudiante entrega tarea o quiz
  async submit(req: Request) {
    const { assessmentId, content } = req.body;
    const userId = req.user!.id;

    const existing = await prisma.submission.findUnique({
      where: { assessmentId_userId: { assessmentId, userId } },
    });
    if (existing) throw new AppError('Ya has enviado una respuesta para esta evaluación', 409);

    return prisma.submission.create({
      data: { assessmentId, userId, content },
    });
  },

  // Instructor califica la entrega
  async grade(req: Request) {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    return prisma.submission.update({
      where: { id: submissionId },
      data: { score: Number(score), feedback, status: 'GRADED' },
    });
  },

  // Listar entregas de una evaluación (Instructor)
  async getSubmissions(assessmentId: string) {
    return prisma.submission.findMany({
      where: { assessmentId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  },
};
