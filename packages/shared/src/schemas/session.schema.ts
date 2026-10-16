import { z } from 'zod';

export const sessionSchema = z
  .object({
    cohortId: z.string().uuid('ID de cohorte inválido'),
    title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
    type: z.enum(['VIRTUAL_SYNC', 'ONSITE', 'ASYNC_VIDEO']),
    videoUrl: z.string().url('El enlace del video no es válido').optional().nullable(),
    venueId: z.string().uuid('ID de sede inválido').optional().nullable(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  })
  .refine((data) => data.type !== 'ONSITE' || Boolean(data.venueId), {
    message: 'Una sesión presencial requiere una sede',
    path: ['venueId'],
  })
  .refine((data) => data.type === 'ONSITE' || Boolean(data.videoUrl), {
    message: 'Una sesión virtual o asíncrona requiere el enlace del video',
    path: ['videoUrl'],
  });

export type SessionInput = z.infer<typeof sessionSchema>;
