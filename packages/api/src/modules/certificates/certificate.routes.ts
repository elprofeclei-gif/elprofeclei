import { Router } from 'express';
import { certificateController } from './certificate.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

// Ruta pública de verificación (sin auth)
router.get('/verify/:code', certificateController.verify);

router.use(authMiddleware); // Las siguientes requieren login

router.post('/issue', roleMiddleware(['INSTRUCTOR', 'ADMIN']), certificateController.issue);
router.get('/mine', certificateController.getMine);

// Certificado propio por código, para la vista imprimible
router.get('/mine/:code', certificateController.getMioPorCodigo);

export default router;
