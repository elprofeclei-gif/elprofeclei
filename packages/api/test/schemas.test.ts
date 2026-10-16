import { describe, it, expect } from 'vitest';
import {
  assessmentSchema,
  cohortSchema,
  couponSchema,
  gradeSchema,
  sessionSchema,
  submissionSchema,
} from '@elprofeclei/shared';

const UUID = '11111111-1111-1111-1111-111111111111';
const DIA = 24 * 60 * 60 * 1000;
const ahora = Date.now();
const iso = (offsetMs: number) => new Date(ahora + offsetMs).toISOString();

describe('validación de sesiones', () => {
  it('acepta una sesión presencial con sede', () => {
    const result = sessionSchema.safeParse({
      cohortId: UUID,
      title: 'Clase presencial',
      type: 'ONSITE',
      venueId: UUID,
      startTime: iso(0),
      endTime: iso(3600_000),
    });
    expect(result.success).toBe(true);
  });

  it('rechaza una sesión presencial sin sede', () => {
    const result = sessionSchema.safeParse({
      cohortId: UUID,
      title: 'Clase presencial',
      type: 'ONSITE',
      startTime: iso(0),
      endTime: iso(3600_000),
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una sesión virtual sin enlace', () => {
    const result = sessionSchema.safeParse({
      cohortId: UUID,
      title: 'Clase virtual',
      type: 'VIRTUAL_SYNC',
      startTime: iso(0),
      endTime: iso(3600_000),
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una sesión que termina antes de empezar', () => {
    const result = sessionSchema.safeParse({
      cohortId: UUID,
      title: 'Clase virtual',
      type: 'VIRTUAL_SYNC',
      videoUrl: 'https://meet.google.com/abc-defg-hij',
      startTime: iso(3600_000),
      endTime: iso(0),
    });
    expect(result.success).toBe(false);
  });
});

describe('validación de cohortes', () => {
  it('rechaza una cohorte que termina antes de empezar', () => {
    const result = cohortSchema.safeParse({
      courseId: UUID,
      name: 'Cohorte 1',
      startDate: iso(DIA),
      endDate: iso(0),
      capacity: 10,
      approvalMode: 'AUTO',
    });
    expect(result.success).toBe(false);
  });

  it('exige cupo positivo', () => {
    const result = cohortSchema.safeParse({
      courseId: UUID,
      name: 'Cohorte 1',
      startDate: iso(0),
      endDate: iso(DIA),
      capacity: 0,
      approvalMode: 'AUTO',
    });
    expect(result.success).toBe(false);
  });
});

describe('validación de cupones', () => {
  const base = {
    code: 'profe10',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    validFrom: iso(-DIA),
    validUntil: iso(DIA),
    maxUses: 5,
  };

  it('normaliza el código a mayúsculas', () => {
    const result = couponSchema.parse(base);
    expect(result.code).toBe('PROFE10');
  });

  it('rechaza un porcentaje mayor al 100 %', () => {
    const result = couponSchema.safeParse({ ...base, discountValue: 150 });
    expect(result.success).toBe(false);
  });

  it('acepta el 100 % (beca completa)', () => {
    const result = couponSchema.safeParse({ ...base, discountValue: 100 });
    expect(result.success).toBe(true);
  });

  it('rechaza una vigencia invertida', () => {
    const result = couponSchema.safeParse({ ...base, validFrom: iso(DIA), validUntil: iso(-DIA) });
    expect(result.success).toBe(false);
  });
});

describe('validación de evaluaciones y entregas', () => {
  it('convierte la nota máxima enviada como texto', () => {
    const result = assessmentSchema.parse({
      cohortId: UUID,
      title: 'Quiz 1',
      type: 'QUIZ',
      maxScore: '5',
    });
    expect(result.maxScore).toBe(5);
  });

  it('rechaza una nota máxima de cero', () => {
    const result = assessmentSchema.safeParse({
      cohortId: UUID,
      title: 'Quiz 1',
      type: 'QUIZ',
      maxScore: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza una entrega vacía', () => {
    const result = submissionSchema.safeParse({ assessmentId: UUID, content: '' });
    expect(result.success).toBe(false);
  });

  it('convierte la nota de la calificación enviada como texto', () => {
    const result = gradeSchema.parse({ score: '4' });
    expect(result.score).toBe(4);
  });
});
