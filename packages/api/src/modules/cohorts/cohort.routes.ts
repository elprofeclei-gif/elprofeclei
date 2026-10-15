import { Router } from 'express';
import { cohortController } from './cohort.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['INSTRUCTOR', 'ADMIN']), cohortController.create);
router.get('/course/:courseId', cohortController.getByCourse);
router.patch('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), cohortController.update);
router.delete('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), cohortController.delete);

export default router;
