import api from './api';
import type { CourseInput } from '@elprofeclei/shared';

// Definimos un tipo estricto para la actualización
export interface CourseUpdateInput {
  title?: string;
  description?: string;
  price?: number;
  status?: string;
}

export const coursesService = {
  getPublished: async () => {
    const res = await api.get('/courses');
    return res.data;
  },
  getMyCourses: async () => {
    const res = await api.get('/courses/mine');
    return res.data;
  },
  create: async (data: CourseInput) => {
    const res = await api.post('/courses', data);
    return res.data;
  },
  submitForReview: async (id: string) => {
    const res = await api.patch(`/courses/${id}/submit`);
    return res.data;
  },
  approve: async (id: string) => {
    const res = await api.patch(`/courses/${id}/approve`);
    return res.data;
  },
  // Sin 'any', usando la interfaz estricta
  update: async (id: string, data: CourseUpdateInput) =>
    (await api.patch(`/courses/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/courses/${id}`)).data,
};
