import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const certificateService = {
  // Emitir certificado (Instructor/Admin)
  async issue(req: Request) {
    const { enrollmentId } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { user: true, cohort: { include: { course: true } } },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada', 404);

    // Verificar si ya existe certificado
    const existing = await prisma.certificate.findFirst({ where: { enrollmentId } });
    if (existing) throw new AppError('El certificado ya fue emitido', 409);

    // Generar código único y crear
    const verificationCode = randomUUID().split('-')[0].toUpperCase(); // Código corto
    return prisma.certificate.create({
      data: { enrollmentId, verificationCode },
      include: { enrollment: { include: { user: true, cohort: { include: { course: true } } } } },
    });
  },

  // Obtener mis certificados (Estudiante)
  async getMine(req: Request) {
    return prisma.certificate.findMany({
      where: { enrollment: { userId: req.user!.id } },
      include: { enrollment: { include: { user: true, cohort: { include: { course: true } } } } },
    });
  },

  // Verificación pública
  async verify(code: string) {
    const cert = await prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: { enrollment: { include: { user: true, cohort: { include: { course: true } } } } },
    });
    if (!cert) throw new AppError('Certificado inválido o no encontrado', 404);
    return cert;
  },
};
