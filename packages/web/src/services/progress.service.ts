import api from './api';
import type { ProgresoEstudianteView, ProgresoView } from '@elprofeclei/shared';

// Avance del estudiante calculado en el servidor con datos reales
// (asistencia, entregas y notas): no hay tabla de progreso que se desincronice.
export const progressService = {
  getMine: async (cohortId: string): Promise<ProgresoView> =>
    (await api.get(`/progress/mine/${cohortId}`)).data,

  getByCohort: async (cohortId: string): Promise<ProgresoEstudianteView[]> =>
    (await api.get(`/progress/cohort/${cohortId}`)).data,
};
