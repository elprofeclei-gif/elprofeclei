import api from './api';

export type RolUsuario = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface PerfilUsuario {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  consent: boolean;
  createdAt: string;
}

// Usuario en el listado de administración
export interface UsuarioAdminView extends PerfilUsuario {
  _count: { enrollments: number; coursesAsInstructor: number };
}

export const etiquetaRol = (rol: string): string =>
  ({ ADMIN: 'Administrador', INSTRUCTOR: 'Instructor', STUDENT: 'Estudiante' })[rol] ?? rol;

export const usersService = {
  getMe: async (): Promise<PerfilUsuario> => (await api.get('/users/me')).data.user,

  // Listado con búsqueda (solo ADMIN)
  listar: async (params?: { q?: string; rol?: RolUsuario }): Promise<UsuarioAdminView[]> =>
    (await api.get('/users', { params })).data,

  // Alta de docentes: promover a Instructor (solo ADMIN)
  cambiarRol: async (
    id: string,
    rol: RolUsuario,
  ): Promise<{ id: string; email: string; role: string }> =>
    (await api.patch(`/users/${id}/rol`, { rol })).data,
};
