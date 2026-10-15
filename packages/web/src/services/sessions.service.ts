import api from './api';

export interface SessionView {
  id: string;
  title: string;
  startTime: string;
  cohort: { course: { title: string } };
}

export const sessionsService = {
  getMySessions: async (): Promise<SessionView[]> => (await api.get('/sessions/mine')).data,
};
