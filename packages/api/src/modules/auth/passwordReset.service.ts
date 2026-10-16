import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/prisma';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';

const VIGENCIA = '15m';

// Huella del hash actual: cuando la contraseña cambia, el enlace deja de servir.
// Así el código es de un solo uso sin necesidad de una tabla nueva.
const huella = (hash: string) => createHash('sha256').update(hash).digest('hex').slice(0, 16);

export const passwordResetService = {
  // Paso 1: si el correo existe, se genera un enlace de un solo uso.
  // La respuesta es idéntica exista o no el correo (no revela quién está registrado).
  async solicitar(email: string) {
    const correo = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: correo } });

    if (!user || user.deletedAt) return { enviado: true };

    const codigo = jwt.sign(
      { id: user.id, purpose: 'reset', fp: huella(user.password) },
      env.JWT_ACCESS_SECRET,
      { expiresIn: VIGENCIA },
    );

    // Sin proveedor de correo configurado, el enlace queda en el log del servidor
    const base = env.FRONTEND_URL ?? 'http://localhost:5173';
    logger.info(
      { email: correo, url: `${base}/recuperar?codigo=${codigo}` },
      'Enlace de recuperación generado',
    );

    return { enviado: true };
  },

  // Paso 2: valida el código y guarda la nueva contraseña
  async restablecer(codigo: string, nueva: string) {
    if (nueva.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    let datos: { id: string; purpose?: string; fp: string };
    try {
      datos = jwt.verify(codigo, env.JWT_ACCESS_SECRET) as {
        id: string;
        purpose?: string;
        fp: string;
      };
    } catch {
      throw new AppError('El enlace no es válido o ya expiró', 400);
    }

    if (datos.purpose !== 'reset') throw new AppError('El enlace no es válido', 400);

    const user = await prisma.user.findUnique({ where: { id: datos.id } });
    if (!user || user.deletedAt) throw new AppError('El enlace no es válido', 400);
    if (huella(user.password) !== datos.fp) throw new AppError('Este enlace ya fue usado', 400);

    const hash = await bcrypt.hash(nueva, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        // Se cierran las sesiones abiertas al cambiar la contraseña
        refreshToken: null,
      },
    });

    return { actualizada: true };
  },
};
