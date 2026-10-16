import { describe, it, expect, vi, beforeEach } from 'vitest';

// Doble de prueba de Prisma: aquí se verifica la regla de permisos, no el acceso a datos
const mocks = vi.hoisted(() => ({
  courseFindFirst: vi.fn(),
  cohortFindUnique: vi.fn(),
  sessionFindUnique: vi.fn(),
  assessmentFindUnique: vi.fn(),
}));

vi.mock('@/config/prisma', () => ({
  prisma: {
    course: { findFirst: mocks.courseFindFirst },
    cohort: { findUnique: mocks.cohortFindUnique },
    session: { findUnique: mocks.sessionFindUnique },
    assessment: { findUnique: mocks.assessmentFindUnique },
  },
}));

import {
  assertAssessmentAccess,
  assertCohortAccess,
  assertCourseAccess,
  assertSessionAccess,
  requireUser,
} from '@/utils/access';

const ADMIN = { id: 'admin-1', role: 'ADMIN' };
const DUENO = { id: 'profe-1', role: 'INSTRUCTOR' };
const AJENO = { id: 'profe-2', role: 'INSTRUCTOR' };

describe('permisos por dueño (utils/access)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requireUser corta con 401 cuando no hay usuario', () => {
    expect(() => requireUser({} as never)).toThrow(/no autenticado/i);
  });

  it('requireUser devuelve el usuario del request', () => {
    const req = { user: DUENO } as never;
    expect(requireUser(req)).toEqual(DUENO);
  });

  describe('cursos', () => {
    it('deja pasar al ADMIN sin consultar la base', async () => {
      await expect(assertCourseAccess('curso-1', ADMIN)).resolves.toBeUndefined();
      expect(mocks.courseFindFirst).not.toHaveBeenCalled();
    });

    it('deja pasar al instructor dueño', async () => {
      mocks.courseFindFirst.mockResolvedValue({ instructorId: DUENO.id });
      await expect(assertCourseAccess('curso-1', DUENO)).resolves.toBeUndefined();
    });

    it('bloquea a un instructor ajeno', async () => {
      mocks.courseFindFirst.mockResolvedValue({ instructorId: DUENO.id });
      await expect(assertCourseAccess('curso-1', AJENO)).rejects.toThrow(/permiso/i);
    });

    it('responde 404 si el curso no existe o está eliminado', async () => {
      mocks.courseFindFirst.mockResolvedValue(null);
      await expect(assertCourseAccess('curso-x', DUENO)).rejects.toThrow(/no encontrado/i);
    });
  });

  describe('cohortes', () => {
    it('deja pasar al instructor dueño del curso de la cohorte', async () => {
      mocks.cohortFindUnique.mockResolvedValue({ course: { instructorId: DUENO.id } });
      await expect(assertCohortAccess('cohorte-1', DUENO)).resolves.toBeUndefined();
    });

    it('bloquea a un instructor ajeno', async () => {
      mocks.cohortFindUnique.mockResolvedValue({ course: { instructorId: DUENO.id } });
      await expect(assertCohortAccess('cohorte-1', AJENO)).rejects.toThrow(/permiso/i);
    });

    it('responde 404 si la cohorte no existe', async () => {
      mocks.cohortFindUnique.mockResolvedValue(null);
      await expect(assertCohortAccess('cohorte-x', DUENO)).rejects.toThrow(/no encontrada/i);
    });
  });

  describe('sesiones', () => {
    it('deja pasar al instructor dueño', async () => {
      mocks.sessionFindUnique.mockResolvedValue({
        cohort: { course: { instructorId: DUENO.id } },
      });
      await expect(assertSessionAccess('sesion-1', DUENO)).resolves.toBeUndefined();
    });

    it('bloquea a un instructor ajeno', async () => {
      mocks.sessionFindUnique.mockResolvedValue({
        cohort: { course: { instructorId: DUENO.id } },
      });
      await expect(assertSessionAccess('sesion-1', AJENO)).rejects.toThrow(/permiso/i);
    });
  });

  describe('evaluaciones', () => {
    it('deja pasar al ADMIN sin consultar la base', async () => {
      await expect(assertAssessmentAccess('eval-1', ADMIN)).resolves.toBeUndefined();
      expect(mocks.assessmentFindUnique).not.toHaveBeenCalled();
    });

    it('bloquea a un instructor ajeno', async () => {
      mocks.assessmentFindUnique.mockResolvedValue({
        cohort: { course: { instructorId: DUENO.id } },
      });
      await expect(assertAssessmentAccess('eval-1', AJENO)).rejects.toThrow(/permiso/i);
    });

    it('responde 404 si la evaluación no existe', async () => {
      mocks.assessmentFindUnique.mockResolvedValue(null);
      await expect(assertAssessmentAccess('eval-x', DUENO)).rejects.toThrow(/no encontrada/i);
    });
  });
});
