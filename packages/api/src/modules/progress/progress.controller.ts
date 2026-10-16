import { Request, Response } from 'express';
import { progressService } from './progress.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const progressController = {
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const data = await progressService.getMine(req);
    res.status(200).json(data);
  }),

  getByCohort: asyncHandler(async (req: Request, res: Response) => {
    const data = await progressService.getByCohort(req);
    res.status(200).json(data);
  }),
};
