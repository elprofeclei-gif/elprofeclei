import { Router } from 'express';
import { couponController } from './coupon.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['ADMIN']), couponController.create);
router.get('/', roleMiddleware(['ADMIN']), couponController.getAll);

// Estudiantes validan y canjean
router.post('/validate', couponController.validate);
router.post('/redeem', couponController.redeem);

export default router;
