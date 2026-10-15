import api from './api';
import type { CouponInput } from '@elprofeclei/shared';

export interface CouponView {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  usedCount: number;
}

export const couponsService = {
  // Cambiado 'any' por 'CouponInput'
  create: async (data: CouponInput) => (await api.post('/coupons', data)).data,
  getAll: async (): Promise<CouponView[]> => (await api.get('/coupons')).data,
  validate: async (code: string) => (await api.post('/coupons/validate', { code })).data,
  redeem: async (code: string) => (await api.post('/coupons/redeem', { code })).data,
};
