import { PrismaClient } from '@prisma/client';
import { venueSchema } from '@elprofeclei/shared';
import type { Request } from 'express';

const prisma = new PrismaClient();

export const venueService = {
  async create(req: Request) {
    const validated = venueSchema.parse(req.body);
    return prisma.venue.create({ data: validated });
  },

  async getAll() {
    return prisma.venue.findMany({
      where: {/* Aquí no hay soft delete en schema, aplicamos filtro simple si es necesario */},
    });
  },
};
