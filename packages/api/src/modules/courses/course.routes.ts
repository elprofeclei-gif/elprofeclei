import { Router } from 'express';
import { courseController } from './course.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { roleMiddleware } from '@/middlewares/role.middleware';

const router = Router();

router.use(authMiddleware); // Todas las rutas requieren login

// Permitimos que INSTRUCTOR y ADMIN puedan crear y ver sus cursos
router.post('/', roleMiddleware(['INSTRUCTOR', 'ADMIN']), courseController.create);
router.get('/', courseController.getPublished);
router.get('/mine', roleMiddleware(['INSTRUCTOR', 'ADMIN']), courseController.getMyCourses);
router.patch(
  '/:id/submit',
  roleMiddleware(['INSTRUCTOR', 'ADMIN']),
  courseController.submitForReview,
);
router.patch('/:id/approve', roleMiddleware(['ADMIN']), courseController.approve);
router.patch('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), courseController.update);
router.delete('/:id', roleMiddleware(['INSTRUCTOR', 'ADMIN']), courseController.delete);

export default router;
