import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

// Instancia única de Prisma para toda la aplicación.
// Crear un PrismaClient por módulo agota el pool de conexiones
// (especialmente con PostgreSQL gestionado tipo Neon/Supabase).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

// En desarrollo, tsx recarga el proceso: reutilizamos la instancia para no abrir conexiones nuevas
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
