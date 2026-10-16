import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sesionService } from './sesion.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.register(req, res);
    res.status(201).json(data);
  }),
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await sesionService.iniciar(req, res);
    res.status(200).json(data);
  }),
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const data = await sesionService.renovar(req, res);
    res.status(200).json(data);
  }),
  logout: asyncHandler(async (req: Request, res: Response) => {
    const data = await sesionService.cerrar(req, res);
    res.status(200).json(data);
  }),
};
