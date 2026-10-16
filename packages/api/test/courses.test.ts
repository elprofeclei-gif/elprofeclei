import { describe, it, expect, vi, beforeEach } from 'vitest';

// Doble de prueba de Prisma: aquí se verifican las métricas del catálogo, no el acceso a datos
const mocks = vi.hoisted(() => ({
  courseFindMany: vi.fn(),
  courseCount: vi.fn(),
}));

vi.mock('@/config/prisma', () => ({
  prisma: {
    course: { findMany: mocks.courseFindMany, count: mocks.courseCount },
  },
}));

import { courseQuerySchema } from '@elprofeclei/shared';
import { courseService } from '@/modules/courses/course.service';

const DAY = 24 * 60 * 60 * 1000;

// Curso con la forma que devuelve findMany; cada caso sobrescribe lo que necesita
function buildCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'curso-1',
    title: 'Guitarra desde cero',
    description: 'Curso para principiantes',
    modality: 'VIRTUAL',
    duration: 'EIGHT',
    price: 0,
    status: 'PUBLISHED',
    instructor: { firstName: 'Profe', lastName: 'Clei' },
    cohorts: [],
    ...overrides,
  };
}

// Cohorte con la forma que devuelve el include (solo lo que leen las métricas)
function buildCohort(overrides: Record<string, unknown> = {}) {
  const ahora = Date.now();
  return {
    id: 'cohorte-1',
    startDate: new Date(ahora),
    endDate: new Date(ahora + 30 * DAY),
    capacity: 10,
    deletedAt: null,
    _count: { enrollments: 0 },
    ...overrides,
  };
}

describe('esquema de consulta del catálogo (courseQuerySchema)', () => {
  it('acepta una consulta completa y convierte page/pageSize a entero', () => {
    const resultado = courseQuerySchema.parse({
      q: '  guitarra ',
      modality: 'VIRTUAL',
      duration: 'EIGHT',
      price: 'free',
      sort: 'price_asc',
      page: '2',
      pageSize: '24',
    });
    expect(resultado).toEqual({
      q: 'guitarra',
      modality: 'VIRTUAL',
      duration: 'EIGHT',
      price: 'free',
      sort: 'price_asc',
      page: 2,
      pageSize: 24,
    });
  });

  it('aplica los valores por defecto cuando no hay consulta', () => {
    expect(courseQuerySchema.parse({})).toEqual({ sort: 'recent', page: 1, pageSize: 12 });
  });

  it('trata una búsqueda vacía como ausente', () => {
    expect(courseQuerySchema.parse({ q: '   ' }).q).toBeUndefined();
  });

  it('acepta price free y paid', () => {
    expect(courseQuerySchema.safeParse({ price: 'free' }).success).toBe(true);
    expect(courseQuerySchema.safeParse({ price: 'paid' }).success).toBe(true);
  });

  it('rechaza pageSize fuera de rango', () => {
    expect(courseQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
    expect(courseQuerySchema.safeParse({ pageSize: '49' }).success).toBe(false);
  });

  it('rechaza una modalidad inválida', () => {
    expect(courseQuerySchema.safeParse({ modality: 'ONLINE' }).success).toBe(false);
  });

  it('rechaza una búsqueda de más de 80 caracteres', () => {
    expect(courseQuerySchema.safeParse({ q: 'x'.repeat(81) }).success).toBe(false);
    expect(courseQuerySchema.safeParse({ q: 'x'.repeat(80) }).success).toBe(true);
  });

  it('rechaza page menor que 1 o que no es numérico', () => {
    expect(courseQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(courseQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });
});

describe('métricas del catálogo (courseService.getPublished)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.courseFindMany.mockResolvedValue([]);
    mocks.courseCount.mockResolvedValue(0);
  });

  it('calcula cohortes abiertas, cupos, matriculados y la próxima fecha de inicio', async () => {
    const ahora = Date.now();
    mocks.courseFindMany.mockResolvedValue([
      buildCourse({
        cohorts: [
          buildCohort({
            // Cerrada: terminó ayer (no es abierta, pero suma al total de cohortes y cupos)
            startDate: new Date(ahora - 30 * DAY),
            endDate: new Date(ahora - DAY),
            capacity: 10,
            _count: { enrollments: 8 },
          }),
          buildCohort({
            // Abierta y la próxima en empezar
            startDate: new Date(ahora + DAY),
            endDate: new Date(ahora + 60 * DAY),
            capacity: 15,
            _count: { enrollments: 4 },
          }),
          buildCohort({
            // Abierta, pero empieza más adelante
            startDate: new Date(ahora + 7 * DAY),
            endDate: new Date(ahora + 90 * DAY),
            capacity: 20,
            _count: { enrollments: 11 },
          }),
        ],
      }),
    ]);
    mocks.courseCount.mockResolvedValue(1);

    const { courses, total } = await courseService.getPublished({ query: {} } as never);

    expect(total).toBe(1);
    expect(courses[0].stats).toEqual({
      cohortCount: 3,
      openCohortCount: 2,
      enrolledCount: 23,
      totalCapacity: 45,
      nextStartDate: new Date(ahora + DAY).toISOString(),
    });
  });

  it('devuelve nextStartDate null cuando todas las cohortes ya empezaron', async () => {
    const ahora = Date.now();
    mocks.courseFindMany.mockResolvedValue([
      buildCourse({
        cohorts: [
          buildCohort({
            // Terminada: ni abierta ni futura
            startDate: new Date(ahora - 30 * DAY),
            endDate: new Date(ahora - DAY),
          }),
          buildCohort({
            // En curso: abierta (todavía no termina) pero ya empezó
            startDate: new Date(ahora - 10 * DAY),
            endDate: new Date(ahora + 20 * DAY),
          }),
        ],
      }),
    ]);

    const { courses } = await courseService.getPublished({ query: {} } as never);

    expect(courses[0].stats.nextStartDate).toBeNull();
    expect(courses[0].stats.openCohortCount).toBe(1);
  });

  it('devuelve las métricas en cero para un curso sin cohortes', async () => {
    mocks.courseFindMany.mockResolvedValue([buildCourse()]);

    const { courses } = await courseService.getPublished({ query: {} } as never);

    expect(courses[0].stats).toEqual({
      cohortCount: 0,
      openCohortCount: 0,
      enrolledCount: 0,
      totalCapacity: 0,
      nextStartDate: null,
    });
  });

  it('aplica filtros, orden y paginación a la consulta de Prisma', async () => {
    await courseService.getPublished({
      query: {
        q: 'guitarra',
        modality: 'VIRTUAL',
        price: 'paid',
        sort: 'price_desc',
        page: '3',
        pageSize: '12',
      },
    } as never);

    expect(mocks.courseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PUBLISHED',
          deletedAt: null,
          modality: 'VIRTUAL',
          price: { gt: 0 },
          OR: [
            { title: { contains: 'guitarra', mode: 'insensitive' } },
            { description: { contains: 'guitarra', mode: 'insensitive' } },
          ],
        }),
        orderBy: { price: 'desc' },
        skip: 24,
        take: 12,
      }),
    );
    // El total se cuenta con los mismos filtros que el listado
    expect(mocks.courseCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ modality: 'VIRTUAL' }),
    });
  });
});
