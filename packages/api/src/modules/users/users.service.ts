import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/AppError';
import { requireUser } from '@/utils/access';
import { z } from 'zod';
import type { Request } from 'express';

const rolSchema = z.object({
  rol: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT'], {
    message: 'El rol debe ser ADMIN, INSTRUCTOR o STUDENT',
  }),
});

const ROLES = ['ADMIN', 'INSTRUCTOR', 'STUDENT'] as const;
type RolValido = (typeof ROLES)[number];

export const usersService = {
  // Perfil del usuario autenticado, leído de la base (no del token),
  // para que un cambio de rol o una baja se reflejen de inmediato.
  async getMe(req: Request) {
    const user = requireUser(req);

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        consent: true,
        createdAt: true,
      },
    });

    if (!profile) throw new AppError('Usuario no encontrado', 404);
    return { user: profile };
  },

  // Listado de usuarios (solo ADMIN) con búsqueda por nombre o correo
  async listar(req: Request) {
    const { q, rol } = req.query as { q?: string; rol?: string };
    const filtroRol = rol && ROLES.includes(rol as RolValido) ? { role: rol as RolValido } : {};

    const usuarios = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...filtroRol,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        consent: true,
        createdAt: true,
        _count: { select: { enrollments: true, coursesAsInstructor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return usuarios;
  },

  // Cambiar el rol de alguien (solo ADMIN).
  // Así se da de alta a un docente sin crear cuentas con contraseñas temporales:
  // la persona se registra sola y el ADMIN la promueve.
  async cambiarRol(req: Request) {
    const user = requireUser(req);
    const { id } = req.params;
    const { rol } = rolSchema.parse(req.body);

    if (id === user.id) {
      throw new AppError('No puedes cambiar tu propio rol', 400);
    }

    const objetivo = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!objetivo) throw new AppError('Usuario no encontrado', 404);

    return prisma.user.update({
      where: { id },
      data: { role: rol },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  },
};
