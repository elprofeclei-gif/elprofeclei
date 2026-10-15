import api from './api';

export interface CertificateView {
  id: string;
  verificationCode: string;
  issuedAt: string;
  enrollment: {
    user: { firstName: string; lastName: string; email: string };
    cohort: { course: { title: string; duration: string } };
  };
}

export const certificatesService = {
  getMine: async (): Promise<CertificateView[]> => (await api.get('/certificates/mine')).data,
  issue: async (enrollmentId: string) =>
    (await api.post('/certificates/issue', { enrollmentId })).data,
  verify: async (code: string): Promise<CertificateView> =>
    (await api.get(`/certificates/verify/${code}`)).data,
};
