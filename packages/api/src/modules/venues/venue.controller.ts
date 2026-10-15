import { Request, Response } from 'express';
import { venueService } from './venue.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const venueController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await venueService.create(req);
    res.status(201).json(data);
  }),
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    const data = await venueService.getAll();
    res.status(200).json(data);
  }),
};
