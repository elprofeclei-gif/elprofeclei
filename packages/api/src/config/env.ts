import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET es requerido'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET es requerido'),
});

const { data, error } = envSchema.safeParse(process.env);

if (error) {
  console.error('❌ Error en variables de entorno:', error.flatten().fieldErrors);
  process.exit(1);
}

export const env = data;
