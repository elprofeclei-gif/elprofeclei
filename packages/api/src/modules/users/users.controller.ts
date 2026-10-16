import { Request, Response } from 'express';
import { usersService } from './users.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const usersController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const data = await usersService.getMe(req);
    res.status(200).json(data);
  }),

  listar: asyncHandler(async (req: Request, res: Response) => {
    const data = await usersService.listar(req);
    res.status(200).json(data);
  }),

  cambiarRol: asyncHandler(async (req: Request, res: Response) => {
    const data = await usersService.cambiarRol(req);
    res.status(200).json(data);
  }),
};
