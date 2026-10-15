import { Request, Response } from 'express';
import { couponService } from './coupon.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const couponController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await couponService.create(req);
    res.status(201).json(data);
  }),
  // Cambiamos 'req' por '_req'
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    const data = await couponService.getAll();
    res.status(200).json(data);
  }),
  validate: asyncHandler(async (req: Request, res: Response) => {
    const data = await couponService.validate(req);
    res.status(200).json(data);
  }),
  redeem: asyncHandler(async (req: Request, res: Response) => {
    const data = await couponService.redeem(req);
    res.status(200).json(data);
  }),
};
