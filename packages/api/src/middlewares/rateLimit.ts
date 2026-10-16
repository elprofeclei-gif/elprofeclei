import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError';

// Limitador de ventana fija en memoria (sin dependencias externas).
// Limitación conocida: el conteo es por instancia del backend; con el despliegue
// de una sola instancia previsto (escala inicial ~100 usuarios) es suficiente.
type Bucket = { count: number; resetAt: number };

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip ?? 'sin-ip'}`;
    const bucket = buckets.get(key);

    // Limpieza perezosa para que el mapa no crezca sin control
    if (buckets.size > 10_000) {
      for (const [storedKey, stored] of buckets) {
        if (stored.resetAt <= now) buckets.delete(storedKey);
      }
    }

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      return next(new AppError('Demasiadas solicitudes. Intenta de nuevo en unos minutos.', 429));
    }

    bucket.count += 1;
    return next();
  };
}
