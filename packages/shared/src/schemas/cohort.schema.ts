import { z } from 'zod';

export const cohortSchema = z
  .object({
    courseId: z.string().uuid('ID de curso inválido'),
    name: z.string().min(1, 'El nombre de la cohorte es obligatorio'),
    startDate: z.string(),
    endDate: z.string(),
    capacity: z.number().int().positive('El cupo debe ser un entero positivo'),
    approvalMode: z.enum(['MANUAL', 'AUTO']),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['endDate'],
  });

export type CohortInput = z.infer<typeof cohortSchema>;
