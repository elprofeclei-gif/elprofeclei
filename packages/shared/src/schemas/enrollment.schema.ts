import { z } from 'zod';

export const enrollmentSchema = z.object({
  cohortId: z.string().uuid('ID de cohorte inválido'),
  // Método de pago: requerido solo para cursos de pago (el backend lo valida)
  paymentMethod: z.enum(['ONLINE', 'NEQUI', 'CASH']).optional(),
  // Código de cupón opcional; el backend revalida y calcula el total
  couponCode: z
    .string()
    .min(4, 'El código del cupón debe tener al menos 4 caracteres')
    .max(20, 'El código del cupón no puede exceder 20 caracteres')
    .optional(),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
