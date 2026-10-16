import { Request, Response } from 'express';
import { assessmentService } from './assessment.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const assessmentController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.create(req);
    res.status(201).json(data);
  }),
  getByCohort: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.getByCohort(req.params.cohortId, req);
    res.status(200).json(data);
  }),
  submit: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.submit(req);
    res.status(201).json(data);
  }),
  grade: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.grade(req);
    res.status(200).json(data);
  }),
  getSubmissions: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.getSubmissions(req.params.assessmentId, req);
    res.status(200).json(data);
  }),
  // Entregas pendientes de calificar (panel del docente)
  getPendientes: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.getPendientes(req);
    res.status(200).json(data);
  }),
};
