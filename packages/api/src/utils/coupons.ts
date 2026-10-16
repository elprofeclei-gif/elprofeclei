import { Prisma, type Coupon } from '@prisma/client';
import { AppError } from '@/utils/AppError';

// Reglas de cupones en un solo lugar: las usan la matrícula y la validación pública,
// así el descuento que ve el estudiante es el mismo que se aplica en la transacción.

// Vigencia y límite de usos
export function assertCouponActive(coupon: Coupon | null): Coupon {
  if (!coupon) throw new AppError('El cupón no existe', 404);

  const now = new Date();
  if (coupon.validFrom > now) throw new AppError('El cupón aún no está vigente', 400);
  if (coupon.validUntil < now) throw new AppError('El cupón ha expirado', 400);
  if (coupon.usedCount >= coupon.maxUses) {
    throw new AppError('El cupón alcanzó su límite de usos', 400);
  }

  return coupon;
}

// Beca/cupón nominal: solo lo puede usar la persona asignada
export function assertCouponAssignedTo(coupon: Coupon, userId: string): void {
  if (coupon.assignedToId && coupon.assignedToId !== userId) {
    throw new AppError('Este cupón está asignado a otro usuario', 403);
  }
}

export function assertCouponUsable(coupon: Coupon | null, userId: string): Coupon {
  const active = assertCouponActive(coupon);
  assertCouponAssignedTo(active, userId);
  return active;
}

// Total a pagar: nunca negativo y siempre con 2 decimales
export function calculateDiscountedAmount(base: Prisma.Decimal, coupon: Coupon): Prisma.Decimal {
  const discount =
    coupon.discountType === 'PERCENTAGE'
      ? base.mul(coupon.discountValue).div(100)
      : coupon.discountValue;

  const amount = base.sub(discount);
  return amount.lessThan(0) ? new Prisma.Decimal(0) : amount.toDecimalPlaces(2);
}
