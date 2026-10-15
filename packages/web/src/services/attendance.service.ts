import api from './api';

export const attendanceService = {
  generateQrToken: async (sessionId: string) => {
    const res = await api.post(`/attendance/qr/${sessionId}`);
    return res.data;
  },
  registerAttendance: async (token: string) => {
    const res = await api.post('/attendance/scan', { token });
    return res.data;
  },
};
