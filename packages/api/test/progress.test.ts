import { describe, it, expect } from 'vitest';
import { calcularProgreso, REQUISITOS } from '@/utils/progress';
import { corregirQuiz } from '@/modules/assessments/assessment.service';
import type { PreguntaQuizInput } from '@elprofeclei/shared';

describe('cálculo de progreso', () => {
  it('una cohorte sin sesiones ni evaluaciones no bloquea la certificación', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 0,
      sesionesAsistidas: 0,
      evaluacionesTotales: 0,
      entregas: [],
    });

    expect(progreso.elegible).toBe(true);
    expect(progreso.estadoBase).toBe('ELEGIBLE');
    expect(progreso.asistencia.porcentaje).toBe(100);
  });

  it('marca SIN_EMPEZAR cuando no hay asistencia ni entregas', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 4,
      sesionesAsistidas: 0,
      evaluacionesTotales: 2,
      entregas: [],
    });

    expect(progreso.estadoBase).toBe('SIN_EMPEZAR');
    expect(progreso.elegible).toBe(false);
  });

  it('acepta la asistencia justo en el mínimo', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 5,
      sesionesAsistidas: 4,
      evaluacionesTotales: 0,
      entregas: [],
    });

    expect(progreso.asistencia.porcentaje).toBe(REQUISITOS.asistenciaMinima);
    expect(progreso.requisitos.cumpleAsistencia).toBe(true);
  });

  it('rechaza la asistencia por debajo del mínimo', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 5,
      sesionesAsistidas: 3,
      evaluacionesTotales: 0,
      entregas: [],
    });

    expect(progreso.asistencia.porcentaje).toBe(60);
    expect(progreso.requisitos.cumpleAsistencia).toBe(false);
    expect(progreso.elegible).toBe(false);
  });

  it('exige entregar todas las evaluaciones', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 0,
      sesionesAsistidas: 0,
      evaluacionesTotales: 3,
      entregas: [
        { assessmentId: 'a', score: 5, maxScore: 5 },
        { assessmentId: 'b', score: 4, maxScore: 5 },
      ],
    });

    expect(progreso.evaluaciones.entregadas).toBe(2);
    expect(progreso.requisitos.cumpleEntrega).toBe(false);
    expect(progreso.estadoBase).toBe('EN_CURSO');
  });

  it('no certifica mientras queden entregas sin calificar', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 1,
      sesionesAsistidas: 1,
      evaluacionesTotales: 2,
      entregas: [
        { assessmentId: 'a', score: null, maxScore: 5 },
        { assessmentId: 'b', score: 5, maxScore: 5 },
      ],
    });

    expect(progreso.evaluaciones.calificadas).toBe(1);
    expect(progreso.requisitos.cumpleNota).toBe(false);
  });

  it('calcula el promedio en porcentaje y acepta el mínimo exacto', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 1,
      sesionesAsistidas: 1,
      evaluacionesTotales: 2,
      entregas: [
        { assessmentId: 'a', score: 7, maxScore: 10 },
        { assessmentId: 'b', score: 3.5, maxScore: 5 },
      ],
    });

    expect(progreso.evaluaciones.promedio).toBe(70);
    expect(progreso.requisitos.cumpleNota).toBe(true);
    expect(progreso.elegible).toBe(true);
    expect(progreso.estadoBase).toBe('ELEGIBLE');
  });

  it('rechaza un promedio por debajo del mínimo', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 0,
      sesionesAsistidas: 0,
      evaluacionesTotales: 1,
      entregas: [{ assessmentId: 'a', score: 6, maxScore: 10 }],
    });

    expect(progreso.evaluaciones.promedio).toBe(60);
    expect(progreso.requisitos.cumpleNota).toBe(false);
  });

  it('no exige nota cuando la cohorte no tiene evaluaciones', () => {
    const progreso = calcularProgreso({
      sesionesTotales: 2,
      sesionesAsistidas: 2,
      evaluacionesTotales: 0,
      entregas: [],
    });

    expect(progreso.requisitos.cumpleNota).toBe(true);
    expect(progreso.elegible).toBe(true);
  });
});

describe('corrección automática de quizzes', () => {
  const preguntas: PreguntaQuizInput[] = [
    { enunciado: '¿Qué es TypeScript?', opciones: ['Un lenguaje', 'Un editor'], correcta: 0 },
    { enunciado: '¿Qué es Zod?', opciones: ['Un ORM', 'Validador', 'Un bundler'], correcta: 1 },
    { enunciado: '¿Qué es Prisma?', opciones: ['Un ORM', 'Un test runner'], correcta: 0 },
  ];

  it('escala el resultado a la nota máxima', () => {
    const resultado = corregirQuiz(preguntas, [0, 1, 1], 5);
    expect(resultado.correctas).toBe(2);
    expect(resultado.total).toBe(3);
    expect(resultado.score).toBe(3.33);
  });

  it('devuelve la nota máxima con todo correcto', () => {
    expect(corregirQuiz(preguntas, [0, 1, 0], 5).score).toBe(5);
  });

  it('devuelve 0 sin ninguna respuesta correcta', () => {
    expect(corregirQuiz(preguntas, [1, 0, 1], 5).score).toBe(0);
  });

  it('cuenta como incorrectas las preguntas sin responder', () => {
    const resultado = corregirQuiz(preguntas, [0], 10);
    expect(resultado.correctas).toBe(1);
    expect(resultado.score).toBe(3.33);
  });

  it('respeta preguntas con puntaje propio', () => {
    const ponderadas: PreguntaQuizInput[] = [
      { enunciado: 'Pregunta difícil', opciones: ['A', 'B'], correcta: 0, puntos: 3 },
      { enunciado: 'Pregunta fácil', opciones: ['A', 'B'], correcta: 1, puntos: 1 },
    ];

    expect(corregirQuiz(ponderadas, [0, 1], 10).score).toBe(10);
    expect(corregirQuiz(ponderadas, [0, 0], 10).score).toBe(7.5);
  });
});
