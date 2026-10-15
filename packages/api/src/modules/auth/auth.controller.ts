import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.register(req, res);
    res.status(201).json(data);
  }),
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.login(req, res);
    res.status(200).json(data);
  }),
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.refresh(req);
    res.status(200).json(data);
  }),
  logout: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.logout(req, res);
    res.status(200).json(data);
  }),
};
