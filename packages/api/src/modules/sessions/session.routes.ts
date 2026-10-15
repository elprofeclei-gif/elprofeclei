import { Router } from 'express';
import { sessionController } from './session.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['INSTRUCTOR', 'ADMIN']), sessionController.create);
router.get('/mine', roleMiddleware(['INSTRUCTOR', 'ADMIN']), sessionController.getMySessions);
router.get('/cohort/:cohortId', sessionController.getByCohort);
router.patch('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), sessionController.update);
router.delete('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), sessionController.delete);

export default router;
