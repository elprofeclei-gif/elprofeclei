import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Capturar errores de validación de Zod y devolverlos como 400
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return res.status(400).json({
      status: 'error',
      message: message,
    });
  }

  // Capturar errores comunes de Prisma (ej. llave foránea inexistente)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return res.status(400).json({
        status: 'error',
        message: 'ID de referencia inválido (verifica que el Cohort ID exista).',
      });
    }
  }

  logger.error({ err }, 'Error no controlado');

  return res.status(500).json({
    status: 'error',
    message: 'Ocurrió un error interno en el servidor.',
  });
}
