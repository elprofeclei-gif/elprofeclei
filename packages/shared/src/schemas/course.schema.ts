import { z } from 'zod';

export const courseSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  modality: z.enum(['VIRTUAL', 'ONSITE', 'HYBRID']),
  duration: z.enum(['EIGHT', 'TEN', 'SIXTEEN', 'TWENTY']),
  price: z.number().min(0, 'El precio no puede ser negativo'),
});

export type CourseInput = z.infer<typeof courseSchema>;
