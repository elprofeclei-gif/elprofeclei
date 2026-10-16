// Estados posibles de una matrícula a lo largo de su ciclo de vida
export type EnrollmentStatusView =
  'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

// Pago asociado a una matrícula de curso de pago (null si el curso es gratis)
export interface PaymentView {
  id: string;
  baseAmount: string; // Precio del curso al matricularse (Prisma Decimal llega como string)
  amount: string; // Total a pagar tras el cupón
  method: 'ONLINE' | 'NEQUI' | 'CASH';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  reference: string; // Código corto para el comprobante del estudiante
  couponCode?: string | null;
  confirmedAt?: string | null;
}

export interface EnrollmentView {
  id: string;
  userId: string;
  cohortId: string;
  status: EnrollmentStatusView;
  payment: PaymentView | null;
  cohort: {
    courseId: string;
    startDate: string;
    endDate: string;
    course: {
      title: string;
      modality: string;
      duration: string;
    };
  };
}

// Vista para Instructor/Admin al gestionar las matrículas de una cohorte
export interface EnrollmentAdminView {
  id: string;
  status: EnrollmentStatusView;
  user: { firstName: string; lastName: string; email: string };
  payment: PaymentView | null;
}
