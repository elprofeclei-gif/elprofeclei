import api from './api';
import type { VenueInput, CohortInput, SessionInput, CohortView } from '@elprofeclei/shared';

// Tipos estrictos para actualización
export interface CohortUpdateInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  approvalMode?: 'MANUAL' | 'AUTO';
}

export interface SessionAdminView {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  videoUrl: string | null;
}

export const adminService = {
  createVenue: async (data: VenueInput) => (await api.post('/venues', data)).data,
  createCohort: async (data: CohortInput) => (await api.post('/cohorts', data)).data,
  createSession: async (data: SessionInput) => (await api.post('/sessions', data)).data,
  getCohortsByCourse: async (courseId: string): Promise<CohortView[]> =>
    (await api.get(`/cohorts/course/${courseId}`)).data,
  deleteCohort: async (id: string) => (await api.delete(`/cohorts/${id}`)).data,
  // Nueva función
  updateCohort: async (id: string, data: CohortUpdateInput) =>
    (await api.patch(`/cohorts/${id}`, data)).data,

  getSessionsByCohort: async (cohortId: string): Promise<SessionAdminView[]> =>
    (await api.get(`/sessions/cohort/${cohortId}`)).data,
  updateSession: async (id: string, data: Partial<SessionAdminView>) =>
    (await api.patch(`/sessions/${id}`, data)).data,
  deleteSession: async (id: string) => (await api.delete(`/sessions/${id}`)).data,
};
