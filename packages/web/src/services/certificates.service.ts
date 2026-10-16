import api from './api';

export interface CertificadoEntrega {
  id: string;
  verificationCode: string;
  issuedAt: string;
  enrollment: {
    cohortId: string;
    user: { firstName: string; lastName: string; email: string };
    cohort: {
      name: string;
      startDate: string;
      endDate: string;
      course: {
        title: string;
        duration: string;
        modality: string;
        instructor: { firstName: string; lastName: string };
      };
    };
  };
}

export interface CertificadoVerificado extends CertificadoEntrega {
  asistencia: { sesiones: number; asistidas: number; porcentaje: number };
  evaluaciones: { total: number; entregadas: number; calificadas: number; promedio: number | null };
}

export const certificatesService = {
  getMine: async (): Promise<CertificadoEntrega[]> => (await api.get('/certificates/mine')).data,

  // Certificado propio por código, para la vista imprimible
  getMioPorCodigo: async (code: string): Promise<CertificadoEntrega> =>
    (await api.get(`/certificates/mine/${code}`)).data,

  // Verificación pública (no requiere sesión)
  verify: async (code: string): Promise<CertificadoVerificado> =>
    (await api.get(`/certificates/verify/${code}`)).data,

  issue: async (enrollmentId: string, forzar = false) =>
    (await api.post('/certificates/issue', { enrollmentId, forzar })).data,
};
