import { Request, Response } from 'express';
import { cohortService } from './cohort.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const cohortController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await cohortService.create(req);
    res.status(201).json(data);
  }),

  getByCourse: asyncHandler(async (req: Request, res: Response) => {
    const data = await cohortService.getByCourse(req.params.courseId);
    res.status(200).json(data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await cohortService.update(req);
    res.status(200).json(data);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    // Quitamos la asignación a 'data' ya que no la usamos en la respuesta
    await cohortService.delete(req);
    res.status(200).json({ message: 'Cohorte eliminada lógicamente' });
  }),
};
