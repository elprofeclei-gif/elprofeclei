import { Request, Response } from 'express';
import { sessionService } from './session.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const sessionController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await sessionService.create(req);
    res.status(201).json(data);
  }),
  getMySessions: asyncHandler(async (req: Request, res: Response) => {
    const data = await sessionService.getMySessions(req);
    res.status(200).json(data);
  }),

  getByCohort: asyncHandler(async (req: Request, res: Response) => {
    const data = await sessionService.getByCohort(req.params.cohortId);
    res.status(200).json(data);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await sessionService.update(req);
    res.status(200).json(data);
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await sessionService.delete(req);
    res.status(200).json({ message: 'Sesión eliminada' });
  }),
};
