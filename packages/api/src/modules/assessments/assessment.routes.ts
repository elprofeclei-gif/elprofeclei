import { Router } from 'express';
import { assessmentController } from './assessment.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['INSTRUCTOR', 'ADMIN']), assessmentController.create);

// Entregas pendientes de calificar: va antes de las rutas con :parámetro
router.get('/pending', roleMiddleware(['INSTRUCTOR', 'ADMIN']), assessmentController.getPendientes);

router.get('/cohort/:cohortId', assessmentController.getByCohort);
router.post('/submit', assessmentController.submit);
router.patch(
  '/:submissionId/grade',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  assessmentController.grade,
);
router.get(
  '/:assessmentId/submissions',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  assessmentController.getSubmissions,
);

export default router;
