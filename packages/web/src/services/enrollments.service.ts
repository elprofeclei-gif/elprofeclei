import api from './api';

export interface EnrollmentAdminView {
  id: string;
  status: string;
  user: { firstName: string; lastName: string; email: string };
}

export const enrollmentsService = {
  enroll: async (cohortId: string) => (await api.post('/enrollments', { cohortId })).data,
  getMine: async () => (await api.get('/enrollments/mine')).data,
  // Nueva función para obtener matrículas de una cohorte
  getByCohort: async (cohortId: string): Promise<EnrollmentAdminView[]> =>
    (await api.get(`/enrollments/cohort/${cohortId}`)).data,
};
