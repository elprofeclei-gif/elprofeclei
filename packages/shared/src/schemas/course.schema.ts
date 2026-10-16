import { z } from 'zod';

export const courseSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  modality: z.enum(['VIRTUAL', 'ONSITE', 'HYBRID']),
  duration: z.enum(['EIGHT', 'TEN', 'SIXTEEN', 'TWENTY']),
  price: z.number().min(0, 'El precio no puede ser negativo'),
});

export type CourseInput = z.infer<typeof courseSchema>;

// Consulta del catálogo público (GET /api/courses): filtros, búsqueda, orden y paginación.
// `page` y `pageSize` llegan como texto en el query string y se convierten a entero.
export const courseQuerySchema = z.object({
  // Búsqueda libre en título y descripción (insensible a mayúsculas en la BD)
  q: z
    .string()
    .trim()
    .max(80, 'La búsqueda no puede superar 80 caracteres')
    .optional()
    .transform((valor) => (valor === '' ? undefined : valor)),
  modality: z.enum(['VIRTUAL', 'ONSITE', 'HYBRID']).optional(),
  duration: z.enum(['EIGHT', 'TEN', 'SIXTEEN', 'TWENTY']).optional(),
  // free = price 0, paid = price > 0
  price: z.enum(['free', 'paid']).optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
  page: z.coerce.number().int().min(1, 'La página debe ser un entero mayor o igual a 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize debe ser un entero mayor o igual a 1')
    .max(48, 'pageSize no puede superar 48')
    .default(12),
});

export type CourseQuery = z.infer<typeof courseQuerySchema>;
