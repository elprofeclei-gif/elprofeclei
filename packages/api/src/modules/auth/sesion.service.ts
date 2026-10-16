import bcrypt from 'bcrypt';
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/utils/tokens';
import { refreshCookieClearOptions, refreshCookieOptions } from '@/utils/cookies';
import { loginSchema } from '@elprofeclei/shared';
import type { Request, Response } from 'express';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * Inicio, renovación y cierre de sesión.
 *
 * Vive en su propio archivo para concentrar aquí la seguridad de la sesión:
 * - el refresh token se verifica (firma y caducidad) y **rota** en cada renovación;
 * - un usuario con borrado lógico no puede entrar ni renovar;
 * - el bloqueo por intentos fallidos se reinicia al bloquear para que dure lo previsto.
 * El registro (que sí escribe la contraseña) queda en `auth.service.ts`.
 */
export const sesionService = {
  // Login
  async iniciar(req: Request, res: Response) {
    const validated = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: validated.email } });

    // Usuarios eliminados lógicamente no pueden iniciar sesión
    if (!user || user.deletedAt) throw new AppError('Credenciales inválidas', 401);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Cuenta bloqueada. Intenta en ${minsLeft} minutos.`, 403);
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const isLockingOut = attempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: isLockingOut
          ? {
              failedLoginAttempts: 0,
              lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
            }
          : { failedLoginAttempts: attempts, lockedUntil: null },
      });

      throw new AppError('Credenciales inválidas', 401);
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Al guardar el refresh nuevo queda revocado el anterior (rotación)
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, refreshToken },
    });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  },

  // Renovación del access token con rotación del refresh
  async renovar(req: Request, res: Response) {
    const actual = req.cookies?.refreshToken as string | undefined;
    if (!actual) throw new AppError('No hay refresh token', 401);

    // 1. Firma y caducidad: antes solo se buscaba en la base, así que un token
    //    caducado seguía sirviendo mientras estuviera guardado
    let decoded: { id: string };
    try {
      decoded = verifyRefreshToken(actual);
    } catch {
      throw new AppError('Refresh token inválido o expirado', 403);
    }

    // 2. Debe seguir siendo el vigente (permite revocación real) y el usuario no
    //    puede estar eliminado lógicamente
    const user = await prisma.user.findFirst({
      where: { id: decoded.id, refreshToken: actual, deletedAt: null },
    });
    if (!user) throw new AppError('Refresh token revocado', 403);

    // 3. Rotación: nuevo access + nuevo refresh, y se revoca el anterior
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  },

  // Cierre de sesión: revoca el refresh guardado y borra la cookie
  async cerrar(req: Request, res: Response) {
    const actual = req.cookies?.refreshToken as string | undefined;

    if (actual) {
      await prisma.user.updateMany({
        where: { refreshToken: actual },
        data: { refreshToken: null },
      });
    }

    // Sin maxAge: si se enviara, el navegador conservaría la cookie
    res.clearCookie('refreshToken', refreshCookieClearOptions());
    return { message: 'Sesión cerrada correctamente' };
  },
};
