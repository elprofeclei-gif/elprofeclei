import api from './api';

export interface SessionView {
  id: string;
  title: string;
  startTime: string;
  cohort: { course: { title: string } };
}

// Sesión de una cohorte concreta: la API devuelve la fila completa
export interface SessionCohorteView {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  videoUrl: string | null;
  venueId: string | null;
}

export const sessionsService = {
  getMySessions: async (): Promise<SessionView[]> => (await api.get('/sessions/mine')).data,

  getByCohort: async (cohortId: string): Promise<SessionCohorteView[]> =>
    (await api.get(`/sessions/cohort/${cohortId}`)).data,
};
