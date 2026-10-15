import { z } from 'zod';

export const sessionSchema = z.object({
  cohortId: z.string().uuid(),
  title: z.string().min(3),
  type: z.enum(['VIRTUAL_SYNC', 'ONSITE', 'ASYNC_VIDEO']),
  videoUrl: z.string().url().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  startTime: z.string(),
  endTime: z.string(),
});

export type SessionInput = z.infer<typeof sessionSchema>;
