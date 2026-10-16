import { Request, Response } from 'express';
import { courseService } from './course.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const courseController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.create(req);
    res.status(201).json(data);
  }),

  getPublished: asyncHandler(async (req: Request, res: Response) => {
    const { courses, total, page, pageSize } = await courseService.getPublished(req);
    // Paginación en cabeceras (expuestas por el CORS de app.ts); el cuerpo sigue
    // siendo un array porque así lo consume la web
    res.set('X-Total-Count', String(total));
    res.set('X-Page', String(page));
    res.set('X-Page-Size', String(pageSize));
    res.status(200).json(courses);
  }),

  getMyCourses: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.getMyCourses(req);
    res.status(200).json(data);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await courseService.getById(req);
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
