import { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

// Ruta solo accesible si estás autenticado
router.get('/me', authMiddleware, (req, res) => {
  res.json({ message: 'Perfil accedido', user: req.user });
});

// Ruta solo para ADMIN (ejemplo de RBAC)
router.get('/admin-panel', authMiddleware, roleMiddleware(['ADMIN']), (req, res) => {
  res.json({ message: 'Bienvenido al panel de administración' });
});

export default router;
