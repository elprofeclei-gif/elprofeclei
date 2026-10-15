import { Request, Response } from 'express';
import { healthService } from './health.service';

// El controlador solo orquesta
export const healthController = {
  getHealth: (_req: Request, res: Response) => {
    const data = healthService.check();
    res.status(200).json(data);
  },
};