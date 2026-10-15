import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().min(4, 'El código debe tener al menos 4 caracteres').toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive('El valor debe ser positivo'),
  validFrom: z.string(),
  validUntil: z.string(),
  maxUses: z.number().int().positive('Los usos máximos deben ser positivos'),
  assignedToId: z.string().uuid().optional().nullable(),
});

export type CouponInput = z.infer<typeof couponSchema>;
