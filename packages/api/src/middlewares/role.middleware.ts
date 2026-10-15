import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError';

// Factory function para verificar roles permitidos
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('No tienes permisos para realizar esta acción', 403));
    }
    next();
  };
};
