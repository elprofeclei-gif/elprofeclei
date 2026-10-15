import { Request, Response } from 'express';
import { certificateService } from './certificate.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const certificateController = {
  issue: asyncHandler(async (req: Request, res: Response) => {
    const data = await certificateService.issue(req);
    res.status(201).json(data);
  }),
  getMine: asyncHandler(async (req: Request, res: Response) => {
    const data = await certificateService.getMine(req);
    res.status(200).json(data);
  }),
  verify: asyncHandler(async (req: Request, res: Response) => {
    const data = await certificateService.verify(req.params.code);
    res.status(200).json(data);
  }),
};
