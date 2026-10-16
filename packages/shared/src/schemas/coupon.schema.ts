import { z } from 'zod';

export const couponSchema = z
  .object({
    code: z
      .string()
      .min(4, 'El código debe tener al menos 4 caracteres')
      .max(20, 'El código no puede superar 20 caracteres')
      .toUpperCase(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive('El valor debe ser positivo'),
    validFrom: z.string(),
    validUntil: z.string(),
    maxUses: z.number().int().positive('Los usos máximos deben ser positivos'),
    assignedToId: z.string().uuid().optional().nullable(),
  })
  // Un descuento porcentual por encima de 100 generaría totales negativos
  .refine((data) => data.discountType !== 'PERCENTAGE' || data.discountValue <= 100, {
    message: 'Un descuento porcentual no puede superar el 100 %',
    path: ['discountValue'],
  })
  .refine((data) => new Date(data.validUntil) > new Date(data.validFrom), {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['validUntil'],
  });

export type CouponInput = z.infer<typeof couponSchema>;
