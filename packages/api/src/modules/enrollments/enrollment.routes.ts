import { Router } from 'express';
import { enrollmentController } from './enrollment.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', enrollmentController.enroll);
router.get('/mine', enrollmentController.getMyEnrollments);

// Prematrículas esperando confirmación de pago (docente y ADMIN)
router.get(
  '/pending-payments',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  enrollmentController.getPendientesDePago,
);

router.get(
  '/cohort/:cohortId',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  enrollmentController.getByCohort,
);

// Gestión de matrículas (el servicio verifica que el instructor sea dueño del curso)
router.patch('/:id/approve', roleMiddleware(['INSTRUCTOR', 'ADMIN']), enrollmentController.approve);
router.patch('/:id/reject', roleMiddleware(['INSTRUCTOR', 'ADMIN']), enrollmentController.reject);
router.patch(
  '/:id/confirm-payment',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  enrollmentController.confirmPayment,
);

// El estudiante cancela su propia matrícula (el servicio valida la propiedad)
router.patch('/:id/cancel', enrollmentController.cancel);

export default router;
