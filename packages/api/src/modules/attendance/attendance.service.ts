import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { assertSessionAccess, requireUser } from '@/utils/access';
import type { Request } from 'express';

// Los QR de asistencia usan su propio secreto si está definido, para no
// compartir el mismo material de firma que los tokens de sesión.
const qrSigningKey = env.QR_TOKEN_SECRET ?? env.JWT_ACCESS_SECRET;
const QR_PURPOSE = 'attendance-qr';

export const attendanceService = {
  // Generar token QR (Instructor dueño o ADMIN)
  async generateQrToken(req: Request) {
    const { sessionId } = req.params;
    const user = requireUser(req);

    await assertSessionAccess(sessionId, user);

    // Vigencia corta: el instructor lo regenera cuando expira
    const signed = jwt.sign({ sessionId, purpose: QR_PURPOSE }, qrSigningKey, {
      expiresIn: '5m',
    });

    return { code: signed, expiresIn: 300 }; // 300 segundos
  },

  // Registrar asistencia (Estudiante)
  async registerAttendance(req: Request) {
    const user = requireUser(req);

    const scanned = String(req.body?.token ?? '');
    if (!scanned) throw new AppError('Código de asistencia requerido', 400);

    // Verificar firma, caducidad y que el código sea realmente un QR de asistencia
    let decoded: { sessionId?: string; purpose?: string };
    try {
      decoded = jwt.verify(scanned, qrSigningKey) as { sessionId?: string; purpose?: string };
    } catch {
      throw new AppError('Token inválido o expirado. Pide al instructor que regenere el QR.', 401);
    }

    if (decoded.purpose !== QR_PURPOSE || !decoded.sessionId) {
      throw new AppError('El código no corresponde a un QR de asistencia válido', 400);
    }

    const sessionId = decoded.sessionId;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { include: { enrollments: true } } },
    });
    if (!session) throw new AppError('La sesión no existe', 404);

    // Solo matrículas activas: antes bastaba una matrícula pendiente de pago
    const isEnrolled = session.cohort.enrollments.some(
      (enrollment) =>
        enrollment.userId === user.id &&
        enrollment.status === 'ACTIVE' &&
        enrollment.deletedAt === null,
    );
    if (!isEnrolled) throw new AppError('No tienes una matrícula activa en esta cohorte', 403);

    const existing = await prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId: user.id } },
    });
    if (existing) throw new AppError('Ya registraste asistencia para esta sesión', 409);

    return prisma.attendance.create({
      data: { sessionId, userId: user.id, attended: true },
    });
  },
};
