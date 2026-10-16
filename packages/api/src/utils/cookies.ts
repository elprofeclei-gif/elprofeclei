import type { CookieOptions } from 'express';
import { env } from '@/config/env';

// El refresh token vive en una cookie httpOnly.
// En producción el frontend (Netlify) y la API viven en dominios distintos:
// con SameSite=strict el navegador NO envía la cookie, por eso se configura por entorno.
export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

// Al borrar la cookie no se envía maxAge: si se enviara, el navegador
// conservaría la cookie y el cierre de sesión no surtiría efecto.
export function refreshCookieClearOptions(): CookieOptions {
  return { ...refreshCookieOptions(), maxAge: undefined };
}
