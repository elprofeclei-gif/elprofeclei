import { z } from 'zod';

export const cohortSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(1, 'El nombre de la cohorte es obligatorio'), // NUEVO
  startDate: z.string(),
  endDate: z.string(),
  capacity: z.number().int().positive(),
  approvalMode: z.enum(['MANUAL', 'AUTO']),
});

export type CohortInput = z.infer<typeof cohortSchema>;
