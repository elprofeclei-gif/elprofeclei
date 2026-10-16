import { describe, it, expect } from 'vitest';
import { Prisma, type Coupon } from '@prisma/client';
import {
  assertCouponActive,
  assertCouponAssignedTo,
  assertCouponUsable,
  calculateDiscountedAmount,
} from '@/utils/coupons';

const DAY = 24 * 60 * 60 * 1000;

// Cupón base de las pruebas; cada caso sobrescribe lo que necesita
function buildCoupon(overrides: Partial<Coupon> = {}): Coupon {
  const now = new Date();
  return {
    id: 'cup-prueba',
    code: 'CUPON-PRUEBA',
    discountType: 'PERCENTAGE',
    discountValue: new Prisma.Decimal(10),
    validFrom: new Date(now.getTime() - DAY),
    validUntil: new Date(now.getTime() + DAY),
    maxUses: 5,
    usedCount: 0,
    assignedToId: null,
    createdAt: now,
    ...overrides,
  };
}

describe('reglas de cupones', () => {
  it('aplica un descuento porcentual', () => {
    const total = calculateDiscountedAmount(new Prisma.Decimal(100000), buildCoupon());
    expect(total.toFixed(2)).toBe('90000.00');
  });

  it('aplica un descuento de monto fijo', () => {
    const coupon = buildCoupon({
      discountType: 'FIXED',
      discountValue: new Prisma.Decimal(25000),
    });
    const total = calculateDiscountedAmount(new Prisma.Decimal(100000), coupon);
    expect(total.toFixed(2)).toBe('75000.00');
  });

  it('nunca devuelve un total negativo', () => {
    const coupon = buildCoupon({
      discountType: 'FIXED',
      discountValue: new Prisma.Decimal(500000),
    });
    const total = calculateDiscountedAmount(new Prisma.Decimal(100000), coupon);
    expect(total.toFixed(2)).toBe('0.00');
  });

  it('redondea a dos decimales', () => {
    const coupon = buildCoupon({ discountValue: new Prisma.Decimal(33) });
    const total = calculateDiscountedAmount(new Prisma.Decimal(99999), coupon);
    expect(total.toFixed(2)).toBe('66999.33');
  });

  it('rechaza un cupón que todavía no está vigente', () => {
    const coupon = buildCoupon({ validFrom: new Date(Date.now() + DAY) });
    expect(() => assertCouponActive(coupon)).toThrow(/no está vigente/i);
  });

  it('rechaza un cupón expirado', () => {
    const coupon = buildCoupon({ validUntil: new Date(Date.now() - DAY) });
    expect(() => assertCouponActive(coupon)).toThrow(/expirado/i);
  });

  it('rechaza un cupón que agotó sus usos', () => {
    const coupon = buildCoupon({ maxUses: 3, usedCount: 3 });
    expect(() => assertCouponActive(coupon)).toThrow(/límite de usos/i);
  });

  it('rechaza un cupón nominal asignado a otra persona', () => {
    const coupon = buildCoupon({ assignedToId: 'otro-usuario' });
    expect(() => assertCouponAssignedTo(coupon, 'usuario-1')).toThrow(/asignado a otro usuario/i);
  });

  it('permite el cupón nominal a la persona asignada', () => {
    const coupon = buildCoupon({ assignedToId: 'usuario-1' });
    expect(() => assertCouponUsable(coupon, 'usuario-1')).not.toThrow();
  });

  it('rechaza un cupón inexistente', () => {
    expect(() => assertCouponUsable(null, 'usuario-1')).toThrow(/no existe/i);
  });
});
