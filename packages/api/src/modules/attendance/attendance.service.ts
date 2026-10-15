import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const attendanceService = {
  // Generar token QR (Instructor)
  async generateQrToken(req: Request) {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Verificar que la sesión exista y el usuario sea instructor/admin de la cohorte
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { include: { course: true } } },
    });
    if (!session) throw new AppError('Sesión no encontrada', 404);
    if (session.cohort.course.instructorId !== userId && req.user!.role !== 'ADMIN') {
      throw new AppError('No tienes permiso sobre esta sesión', 403);
    }

    // Generar token JWT con vigencia de 5 minutos
    const token = jwt.sign({ sessionId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    return { token, expiresIn: 300 }; // 300 segundos
  },

  // Registrar asistencia (Estudiante)
  async registerAttendance(req: Request) {
    const { token } = req.body;
    const userId = req.user!.id;

    // Verificar token
    let decoded: { sessionId: string };
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sessionId: string };
    } catch (err) {
      throw new AppError('Token inválido o expirado. Pide al instructor que regenere el QR.', 401);
    }

    const { sessionId } = decoded;

    // Verificar que el estudiante esté matriculado y activo en la cohorte
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { include: { enrollments: true } } },
    });
    if (!session) throw new AppError('La sesión no existe', 404);

    const isEnrolled = session.cohort.enrollments.some(
      (e) => e.userId === userId && (e.status === 'ACTIVE' || e.status === 'PENDING_APPROVAL'),
    );
    if (!isEnrolled) throw new AppError('No estás matriculado en esta cohorte', 403);

    // Verificar si ya registró asistencia
    const existing = await prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing) throw new AppError('Ya registraste asistencia para esta sesión', 409);

    // Registrar asistencia
    return prisma.attendance.create({
      data: { sessionId, userId, attended: true },
    });
  },
};
