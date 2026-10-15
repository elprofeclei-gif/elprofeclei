import { z } from 'zod';

export const venueSchema = z.object({
  name: z.string().min(3, 'El nombre de la sede es muy corto'),
  address: z.string().min(5, 'La direccion es muy corta'),
  capacity: z.number().int().positive('El cupo debe ser positivo'),
});

export type VenueInput = z.infer<typeof venueSchema>;
