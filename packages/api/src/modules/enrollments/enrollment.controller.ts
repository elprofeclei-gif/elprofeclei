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
  getPendientesDePago: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.getPendientesDePago(req);
    res.status(200).json(data);
  }),
  approve: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.approve(req);
    res.status(200).json(data);
  }),
  reject: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.reject(req);
    res.status(200).json(data);
  }),
  confirmPayment: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.confirmPayment(req);
    res.status(200).json(data);
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    const data = await enrollmentService.cancel(req);
    res.status(200).json(data);
  }),
};
