import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Guardamos el access token en memoria (no en localStorage por seguridad)
let accessToken = '';

export const setAccessToken = (token: string) => {
  accessToken = token;
};

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Necesario para enviar/recibir cookies httpOnly
});

// Interceptor de solicitud: adjunta el Bearer token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de respuesta: maneja expiración de token (401) y refresca
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh falla (ej. no hay sesión), limpiamos el token y rechazamos la promesa.
        // No redirigimos para evitar el bucle infinito. El hook useAuth manejará el estado nulo.
        setAccessToken('');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
