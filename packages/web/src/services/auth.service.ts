import api from './api';
import { setAccessToken } from './api';
import type { RegisterInput, LoginInput } from '@elprofeclei/shared';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; role: string };
}

export const authService = {
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    setAccessToken(res.data.accessToken);
    return res.data;
  },
  login: async (data: LoginInput): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    setAccessToken(res.data.accessToken);
    return res.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    setAccessToken('');
  },
  getProfile: async (): Promise<{ user: { id: string; email: string; role: string } }> => {
    const res = await api.get('/users/me');
    return res.data;
  },
};
