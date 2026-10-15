import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

// Instructor genera QR
router.post(
  '/qr/:sessionId',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  attendanceController.generateQrToken,
);
// Estudiante registra asistencia
router.post('/scan', attendanceController.registerAttendance);

export default router;
