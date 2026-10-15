import { Request, Response } from 'express';
import { attendanceService } from './attendance.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const attendanceController = {
  generateQrToken: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.generateQrToken(req);
    res.status(200).json(data);
  }),
  registerAttendance: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.registerAttendance(req);
    res.status(201).json({ message: 'Asistencia registrada exitosamente', data });
  }),
};
