import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { couponSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

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
    return prisma.coupon.findMany();
  },

  // Validar cupón (Estudiante)
  async validate(req: Request) {
    const { code } = req.body;
    const userId = req.user!.id;

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new AppError('Cupón inválido', 404);

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new AppError('El cupón está fuera de su vigencia', 400);
    }
    if (coupon.usedCount >= coupon.maxUses) {
      throw new AppError('El cupón ha alcanzado su límite de usos', 400);
    }
    if (coupon.assignedToId && coupon.assignedToId !== userId) {
      throw new AppError('Este cupón no está asignado a tu cuenta', 403);
    }

    return { valid: true, coupon };
  },

  // Aplicar cupón (marcar como usado)
  async redeem(req: Request) {
    const { code } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new AppError('Cupón inválido', 404);

    // Incrementar el contador de usos
    return prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  },
};
