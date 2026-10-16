import api from './api';
import type { EnrollmentView, EnrollmentAdminView } from '@elprofeclei/shared';

export type PaymentMethodInput = 'ONLINE' | 'NEQUI' | 'CASH';

// Prematrícula esperando confirmación de pago (panel del docente y del ADMIN)
export interface PagoPendienteView {
  id: string;
  cohortId: string;
  estudiante: { firstName: string; lastName: string; email: string };
  cohorte: { id: string; name: string; courseTitle: string };
  pago: {
    reference: string;
    amount: number;
    baseAmount: number;
    method: string;
  } | null;
}

export const enrollmentsService = {
  // Matricularse: el método de pago y el cupón solo aplican para cursos de pago
  enroll: async (
    cohortId: string,
    paymentMethod?: PaymentMethodInput,
    couponCode?: string,
  ): Promise<EnrollmentView> =>
    (await api.post('/enrollments', { cohortId, paymentMethod, couponCode })).data,
  getMine: async (): Promise<EnrollmentView[]> => (await api.get('/enrollments/mine')).data,
  getByCohort: async (cohortId: string): Promise<EnrollmentAdminView[]> =>
    (await api.get(`/enrollments/cohort/${cohortId}`)).data,
  // Pagos pendientes de confirmar (instructor dueño o ADMIN)
  getPendientesDePago: async (): Promise<PagoPendienteView[]> =>
    (await api.get('/enrollments/pending-payments')).data,
  // Gestión (Instructor/Admin): el backend verifica la propiedad del curso
  approve: async (id: string) => (await api.patch(`/enrollments/${id}/approve`)).data,
  reject: async (id: string) => (await api.patch(`/enrollments/${id}/reject`)).data,
  confirmPayment: async (id: string) =>
    (await api.patch(`/enrollments/${id}/confirm-payment`)).data,
  // El estudiante cancela su propia matrícula
  cancel: async (id: string) => (await api.patch(`/enrollments/${id}/cancel`)).data,
};
