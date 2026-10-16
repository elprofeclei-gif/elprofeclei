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

// Sede tal como la devuelve GET /api/venues (Venue no tiene borrado lógico)
export interface VenueView {
  id: string;
  name: string;
  address: string;
  capacity: number;
}

// Cohorte para gestión: la API incluye sus sesiones en otra llamada, así que aquí
// se omite esa relación para no mezclar dos fuentes de datos.
export type CohorteAdminView = Omit<CohortView, 'sessions'>;

// La API entrega filas completas de la sesión: incluye venueId (sede de las
// sesiones presenciales) que antes no estaba tipado.
export interface SessionAdminView {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  videoUrl: string | null;
  venueId: string | null;
}

export const adminService = {
  createVenue: async (data: VenueInput) => (await api.post('/venues', data)).data,
  createCohort: async (data: CohortInput) => (await api.post('/cohorts', data)).data,
  createSession: async (data: SessionInput) => (await api.post('/sessions', data)).data,
  getCohortsByCourse: async (courseId: string): Promise<CohortView[]> =>
    (await api.get(`/cohorts/course/${courseId}`)).data,
  deleteCohort: async (id: string) => (await api.delete(`/cohorts/${id}`)).data,
  updateCohort: async (id: string, data: CohortUpdateInput) =>
    (await api.patch(`/cohorts/${id}`, data)).data,

  getVenues: async (): Promise<VenueView[]> => (await api.get('/venues')).data,

  getSessionsByCohort: async (cohortId: string): Promise<SessionAdminView[]> =>
    (await api.get(`/sessions/cohort/${cohortId}`)).data,
  updateSession: async (id: string, data: Partial<SessionAdminView>) =>
    (await api.patch(`/sessions/${id}`, data)).data,
  deleteSession: async (id: string) => (await api.delete(`/sessions/${id}`)).data,
};
