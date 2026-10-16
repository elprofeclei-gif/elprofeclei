import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

// Perfil del usuario autenticado
router.get('/me', authMiddleware, usersController.getMe);

// Listado y gestión de usuarios: solo ADMIN
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), usersController.listar);
router.patch('/:id/rol', authMiddleware, roleMiddleware(['ADMIN']), usersController.cambiarRol);

// Ruta solo para ADMIN (ejemplo de RBAC)
router.get('/admin-panel', authMiddleware, roleMiddleware(['ADMIN']), (_req, res) => {
  res.json({ message: 'Bienvenido al panel de administración' });
});

export default router;
