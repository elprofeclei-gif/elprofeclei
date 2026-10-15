import { Router } from 'express';
import { venueController } from './venue.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['INSTRUCTOR', 'ADMIN']), venueController.create);
router.get('/', venueController.getAll);

export default router;
