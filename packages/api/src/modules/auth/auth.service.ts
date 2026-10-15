import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AppError } from '@/utils/AppError';
import { generateAccessToken, generateRefreshToken } from '@/utils/tokens';
import { registerSchema, loginSchema } from '@elprofeclei/shared';
import type { Request, Response } from 'express';
import { env } from '@/config/env';

const prisma = new PrismaClient();

export const authService = {
  async register(req: Request, res: Response) {
    const validated = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existingUser) throw new AppError('El correo electrónico ya está registrado', 409);

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: 'STUDENT',
        consent: validated.consent,
      },
    });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  },

  async login(req: Request, res: Response) {
    const validated = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: validated.email } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Cuenta bloqueada. Intenta en ${minsLeft} minutos.`, 403);
    }

    if (!user) throw new AppError('Credenciales inválidas', 401);

    const isPasswordValid = await bcrypt.compare(validated.password, user.password);
    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockoutTime = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockoutTime,
        },
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken,
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  },

  async refresh(req: Request) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError('No hay refresh token', 401);

    const user = await prisma.user.findFirst({ where: { refreshToken } });
    if (!user) throw new AppError('Refresh token inválido o revocado', 403);

    const newAccessToken = generateAccessToken(user.id, user.role);
    return { accessToken: newAccessToken };
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const user = await prisma.user.findFirst({ where: { refreshToken } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
      }
    }
    res.clearCookie('refreshToken');
    return { message: 'Sesión cerrada correctamente' };
  },
};
