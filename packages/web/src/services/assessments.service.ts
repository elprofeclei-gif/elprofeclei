import api from './api';

export interface AssessmentView {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  content: unknown; // Cambiado de 'any' a 'unknown'
}

export interface SubmissionView {
  id: string;
  content: string;
  score: number | null;
  feedback: string | null;
  status: string;
  user: { firstName: string; lastName: string; email: string };
}

export const assessmentsService = {
  create: async (data: {
    cohortId: string;
    title: string;
    type: string;
    maxScore: number;
    content: unknown;
  }) => (await api.post('/assessments', data)).data,
  getByCohort: async (cohortId: string): Promise<AssessmentView[]> =>
    (await api.get(`/assessments/cohort/${cohortId}`)).data,
  submit: async (assessmentId: string, content: string) =>
    (await api.post('/assessments/submit', { assessmentId, content })).data,
  grade: async (submissionId: string, score: number, feedback: string) =>
    (await api.patch(`/assessments/${submissionId}/grade`, { score, feedback })).data,
  getSubmissions: async (assessmentId: string): Promise<SubmissionView[]> =>
    (await api.get(`/assessments/${assessmentId}/submissions`)).data,
};
