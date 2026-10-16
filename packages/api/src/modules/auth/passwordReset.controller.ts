import { Request, Response } from 'express';
import { passwordResetService } from './passwordReset.service';
import { asyncHandler } from '@/utils/asyncHandler';

// Recuperación de contraseña: el servicio vive aparte para no mezclarlo con el
// flujo de sesión (registro, login, refresh, logout).
export const passwordResetController = {
  solicitar: asyncHandler(async (req: Request, res: Response) => {
    const data = await passwordResetService.solicitar(String(req.body?.email ?? ''));
    res.status(200).json(data);
  }),

  restablecer: asyncHandler(async (req: Request, res: Response) => {
    const data = await passwordResetService.restablecer(
      String(req.body?.codigo ?? ''),
      String(req.body?.clave ?? ''),
    );
    res.status(200).json(data);
  }),
};
