import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

// Genera Access Token de corta duración (15 min)
export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

// Genera Refresh Token de larga duración para rotación (7 días)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
