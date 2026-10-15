import { Request, Response } from 'express';
import { enrollmentService } from './enrollment.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const enrollmentController = {
  enroll: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.enroll(req);
    res.status(201).json(data);
  }),
  getMyEnrollments: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.getMyEnrollments(req);
    res.status(200).json(data);
  }),
  getByCohort: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.getByCohort(req.params.cohortId);
    res.status(200).json(data);
  }),
};
