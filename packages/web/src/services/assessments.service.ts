import api from './api';
import type { ArchivoEntregaInput } from '@elprofeclei/shared';

export interface PreguntaQuizView {
  enunciado: string;
  opciones: string[];
}

export interface QuizView {
  preguntas: PreguntaQuizView[];
}

export interface EntregaContenido {
  texto?: string;
  archivos: ArchivoEntregaInput[];
  respuestas?: number[];
  /** Se envió después de la fecha límite de la tarea */
  fueraDePlazo?: boolean;
}

export interface EntregaView {
  id: string;
  score: number | string | null;
  status: string;
  feedback: string | null;
  createdAt: string;
  contenido: EntregaContenido;
}

export interface AssessmentView {
  id: string;
  title: string;
  type: string;
  maxScore: number | string;
  content: unknown;
  /** Fecha límite e instrucciones, ya interpretadas (solo estudiantes) */
  tarea?: { instrucciones?: string; dueAt?: string; archivos?: ArchivoEntregaInput[] };
  /** La fecha límite ya pasó (solo estudiantes) */
  vencida?: boolean;
  /** Solo para estudiantes: su propia entrega, si existe */
  miEntrega?: EntregaView | null;
  /** Solo para instructor/ADMIN: cuántas entregas hay */
  _count?: { submissions: number };
}

export interface SubmissionView {
  id: string;
  score: number | string | null;
  status: string;
  feedback: string | null;
  createdAt: string;
  contenido: EntregaContenido;
  user: { firstName: string; lastName: string; email: string };
}

// Entrega esperando calificación (panel del docente)
export interface EntregaPendienteView {
  id: string;
  createdAt: string;
  contenido: EntregaContenido;
  user: { firstName: string; lastName: string; email: string };
  assessment: {
    id: string;
    title: string;
    type: string;
    maxScore: number | string;
    cohort: { name: string; course: { title: string } };
  };
}

export interface EntregaPayload {
  assessmentId: string;
  texto?: string;
  archivos?: ArchivoEntregaInput[];
  respuestas?: number[];
}

// Lee el quiz de una evaluación sin depender del formato exacto guardado
export function leerPreguntas(content: unknown): PreguntaQuizView[] {
  if (content && typeof content === 'object' && 'preguntas' in content) {
    const preguntas = (content as QuizView).preguntas;
    if (Array.isArray(preguntas)) {
      return preguntas.filter(
        (pregunta) => typeof pregunta?.enunciado === 'string' && Array.isArray(pregunta?.opciones),
      );
    }
  }
  return [];
}

export const assessmentsService = {
  create: async (data: {
    cohortId: string;
    title: string;
    type: string;
    maxScore: number;
    content?: unknown;
  }) => (await api.post('/assessments', data)).data,

  getByCohort: async (cohortId: string): Promise<AssessmentView[]> =>
    (await api.get(`/assessments/cohort/${cohortId}`)).data,

  submit: async (entrega: EntregaPayload) => (await api.post('/assessments/submit', entrega)).data,

  grade: async (submissionId: string, score: number, feedback: string) =>
    (await api.patch(`/assessments/${submissionId}/grade`, { score, feedback })).data,

  getSubmissions: async (assessmentId: string): Promise<SubmissionView[]> =>
    (await api.get(`/assessments/${assessmentId}/submissions`)).data,

  // Entregas pendientes de calificar en los cursos del docente
  getPendientes: async (): Promise<EntregaPendienteView[]> =>
    (await api.get('/assessments/pending')).data,
};
