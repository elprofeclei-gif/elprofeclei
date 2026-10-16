import { prisma } from '@/config/prisma';
import { venueSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

export const venueService = {
  // Crear sede - solo INSTRUCTOR/ADMIN (rol validado en la ruta)
  async create(req: Request) {
    const validated = venueSchema.parse(req.body);
    return prisma.venue.create({ data: validated });
  },

  // Listar sedes (el modelo Venue no tiene borrado lógico)
  async getAll() {
    return prisma.venue.findMany({ orderBy: { name: 'asc' } });
  },
};
