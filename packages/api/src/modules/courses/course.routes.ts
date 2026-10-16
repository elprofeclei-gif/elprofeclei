import { Router } from 'express';
import { courseController } from './course.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

// Catálogo público: cualquiera puede ver la oferta antes de crear una cuenta.
// (Antes todo el módulo exigía sesión, así que un visitante no veía nada.)
router.get('/', courseController.getPublished);

// Solo para instructores y admins: va antes de '/:id' para que no lo capture la ruta pública
router.get(
  '/mine',
  authMiddleware,
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  courseController.getMyCourses,
);

// Detalle de un curso publicado (público)
router.get('/:id', courseController.getById);

router.post('/', authMiddleware, roleMiddleware(['INSTRUCTOR', 'ADMIN']), courseController.create);
router.patch(
  '/:id/submit',
  authMiddleware,
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  courseController.submitForReview,
);
router.patch('/:id/approve', authMiddleware, roleMiddleware(['ADMIN']), courseController.approve);
router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  courseController.update,
);
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  courseController.delete,
);

export default router;
