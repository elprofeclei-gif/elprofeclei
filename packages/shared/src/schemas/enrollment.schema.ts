import { z } from 'zod';

export const enrollmentSchema = z.object({
  cohortId: z.string().uuid('ID de cohorte inválido'),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
