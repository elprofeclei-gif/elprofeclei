import { Request, Response, NextFunction } from 'express';

// Evita que los errores no capturados en funciones async tiren el servidor Express
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
