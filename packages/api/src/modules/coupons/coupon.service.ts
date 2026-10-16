import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import { couponSchema } from '@elprofeclei/shared';
import { assertCouponActive, assertCouponUsable } from '@/utils/coupons';
import { requireUser } from '@/utils/access';
import { z } from 'zod';
import type { Request } from 'express';

const couponCodeSchema = z.object({
  code: z.string().min(1, 'El código del cupón es obligatorio'),
});

export const couponService = {
  // Crear cupón o beca (Admin)
  async create(req: Request) {
    const validated = couponSchema.parse(req.body);
    return prisma.coupon.create({
      data: {
        ...validated,
        validFrom: new Date(validated.validFrom),
        validUntil: new Date(validated.validUntil),
        discountValue: Number(validated.discountValue),
      },
    });
  },

  // Listar todos (Admin)
  async getAll() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  },

  // Validar cupón (Estudiante): devuelve solo lo necesario para la compra
  async validate(req: Request) {
    const { code } = couponCodeSchema.parse(req.body);
    const user = requireUser(req);

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const usable = assertCouponUsable(coupon, user.id);

    return {
      valid: true,
      coupon: {
        code: usable.code,
        discountType: usable.discountType,
        discountValue: Number(usable.discountValue),
        validUntil: usable.validUntil,
      },
    };
  },

  // Canjear cupón: solo ADMIN (ajuste manual).
  // En las matrículas el uso lo descuenta enrollment.service dentro de su transacción.
  async redeem(req: Request) {
    const { code } = couponCodeSchema.parse(req.body);

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const active = assertCouponActive(coupon);

    // Incremento condicional: evita superar el límite con canjes simultáneos
    const updated = await prisma.coupon.updateMany({
      where: { id: active.id, usedCount: { lt: active.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new AppError('El cupón alcanzó su límite de usos', 400);
    }

    return { message: 'Cupón canjeado', code: active.code, usedCount: active.usedCount + 1 };
  },
};
