import { Request, Response } from 'express';
import { courseService } from './course.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const courseController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.create(req);
    res.status(201).json(data);
  }),

  getPublished: asyncHandler(async (_req: Request, res: Response) => {
    const data = await courseService.getPublished();
    res.status(200).json(data);
  }),

  getMyCourses: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.getMyCourses(req);
    res.status(200).json(data);
  }),

  submitForReview: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.submitForReview(req);
    res.status(200).json(data);
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.approve(req);
    res.status(200).json(data);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.update(req);
    res.status(200).json(data);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    // Quitamos la asignación a 'data'
    await courseService.delete(req);
    res.status(200).json({ message: 'Curso eliminado lógicamente' });
  }),
};
