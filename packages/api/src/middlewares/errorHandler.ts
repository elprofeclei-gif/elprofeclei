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

  // Validación de Zod: mensaje legible + detalle por campo para el formulario
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: err.errors.map((issue) => issue.message).join(', '),
      errors: err.flatten().fieldErrors,
    });
  }

  // Errores conocidos de Prisma que hoy se convertían en 500 genéricos
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target =
        err.meta && Array.isArray(err.meta.target)
          ? (err.meta.target as string[]).join(', ')
          : 'valor único';
      return res.status(409).json({
        status: 'error',
        message: `Ya existe un registro con ese valor (${target}).`,
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'El registro solicitado no existe.',
      });
    }

    if (err.code === 'P2003') {
      return res.status(400).json({
        status: 'error',
        message: 'ID de referencia inválido (verifica que el registro relacionado exista).',
      });
    }

    // Conflicto de escritura de una transacción serializable
    if (err.code === 'P2034') {
      return res.status(409).json({
        status: 'error',
        message: 'No se pudo completar la operación por un conflicto simultáneo. Intenta de nuevo.',
      });
    }
  }

  // Parámetros inválidos para Prisma (ej. un id que no es UUID)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos o parámetros inválidos para la operación.',
    });
  }

  logger.error({ err }, 'Error no controlado');

  return res.status(500).json({
    status: 'error',
    message: 'Ocurrió un error interno en el servidor.',
  });
}
