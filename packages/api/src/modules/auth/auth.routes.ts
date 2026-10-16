import { Router } from 'express';
import { authController } from './auth.controller';
import { passwordResetController } from './passwordReset.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Recuperación de contraseña: enlace de un solo uso, válido 15 minutos
router.post('/forgot-password', passwordResetController.solicitar);
router.post('/reset-password', passwordResetController.restablecer);

export default router;
