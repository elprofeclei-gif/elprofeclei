import { Router } from 'express';
import { progressController } from './progress.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

// Progreso propio dentro de una cohorte (estudiante; el dueño y el ADMIN también pueden)
router.get('/mine/:cohortId', progressController.getMine);

// Progreso de todo el grupo (instructor dueño o ADMIN)
router.get(
  '/cohort/:cohortId',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  progressController.getByCohort,
);

export default router;
