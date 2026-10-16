import { Router } from 'express';
import { couponController } from './coupon.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['ADMIN']), couponController.create);
router.get('/', roleMiddleware(['ADMIN']), couponController.getAll);

// Estudiantes validan cupones antes de comprar
router.post('/validate', couponController.validate);

// Canje manual: solo ADMIN. Antes cualquier usuario autenticado podía
// incrementar el contador de cualquier cupón (incluidas becas ajenas).
router.post('/redeem', roleMiddleware(['ADMIN']), couponController.redeem);

export default router;
