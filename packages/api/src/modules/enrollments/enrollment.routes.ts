import { Router } from 'express';
import { enrollmentController } from './enrollment.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', enrollmentController.enroll);
router.get('/mine', enrollmentController.getMyEnrollments);
router.get(
  '/cohort/:cohortId',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  enrollmentController.getByCohort,
);

export default router;
