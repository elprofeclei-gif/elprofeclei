import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET es requerido'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET es requerido'),

  // Orígenes permitidos separados por coma (ej. https://elprofeclei.netlify.app)
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Cookie del refresh token.
  // Si el frontend y la API quedan en dominios distintos hay que usar 'none' + secure.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  COOKIE_DOMAIN: z.string().optional(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Secreto propio para los tokens QR de asistencia (si falta, se usa el de acceso)
  QR_TOKEN_SECRET: z.string().min(10).optional(),

  // Base del frontend para armar los enlaces de correo (recuperación de contraseña)
  FRONTEND_URL: z.string().url().optional(),

  // Correo saliente. 'none' deja el contenido en el log (desarrollo y pruebas)
  MAIL_PROVIDER: z.enum(['none', 'resend', 'sendgrid']).default('none'),
  // Remitente verificado en el proveedor (ej. no-reply@tudominio.com)
  MAIL_FROM: z.string().email().optional(),
  MAIL_FROM_NAME: z.string().max(60).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  SENDGRID_API_KEY: z.string().min(10).optional(),

  // Número de proxies delante de la API (1 en Netlify/Render); afecta a req.ip
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // Rate limiting en memoria
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const { data, error } = envSchema.safeParse(process.env);

if (error) {
  console.error('❌ Error en variables de entorno:', error.flatten().fieldErrors);
  process.exit(1);
}

export const env = data;
