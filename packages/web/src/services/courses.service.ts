import api from './api';
import type { CohortView, CourseInput, CourseStatsView, CourseView } from '@elprofeclei/shared';

// Detalle de curso publicado: el precio de Prisma Decimal llega como string en el JSON
export interface CourseDetailView {
  id: string;
  title: string;
  description: string;
  modality: string;
  duration: string;
  price: string;
  status: string;
  instructor: { firstName: string; lastName: string };
  cohorts: CohortView[];
}

// Contrato real del PATCH /courses/:id: el backend solo acepta título,
// descripción y precio (course.service.ts de la API ignora el resto de campos).
export interface CourseUpdateInput {
  title?: string;
  description?: string;
  price?: number;
}

// Catálogo publicado: contrato de GET /api/courses para el marketplace
export type ModalidadFiltro = 'VIRTUAL' | 'ONSITE' | 'HYBRID';
export type DuracionFiltro = 'EIGHT' | 'TEN' | 'SIXTEEN' | 'TWENTY';
export type PrecioFiltro = 'free' | 'paid';
export type OrdenCatalogo = 'recent' | 'price_asc' | 'price_desc';

export interface PublishedParams {
  q?: string;
  modality?: ModalidadFiltro;
  duration?: DuracionFiltro;
  price?: PrecioFiltro;
  sort?: OrdenCatalogo;
  page?: number;
  pageSize?: number;
}

export interface PublishedResult {
  cursos: CourseView[];
  total: number;
  page: number;
  pageSize: number;
}

// El backend del marketplace se despliega en paralelo: normalizamos stats para que
// la tarjeta nunca lea undefined y la vista no se rompa a mitad del despliegue.
type CursoPublicado = Omit<CourseView, 'stats'> & { stats?: Partial<CourseStatsView> };

const normalizarCurso = (curso: CursoPublicado): CourseView => ({
  ...curso,
  stats: {
    cohortCount: curso.stats?.cohortCount ?? 0,
    openCohortCount: curso.stats?.openCohortCount ?? 0,
    enrolledCount: curso.stats?.enrolledCount ?? 0,
    totalCapacity: curso.stats?.totalCapacity ?? 0,
    nextStartDate: curso.stats?.nextStartDate ?? null,
  },
});

// "Sin filtro" se representa omitiendo el parámetro, no enviando un valor vacío
const limpiarParams = (params: PublishedParams): Record<string, string | number> => {
  const consulta: Record<string, string | number> = {};

  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '') consulta[clave] = valor;
  }

  return consulta;
};

// La paginación llega en cabeceras (X-Total-Count, X-Page, X-Page-Size)
const aEnteroPositivo = (valor: unknown, reserva: number): number => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : Math.max(1, reserva);
};

async function getPublished(): Promise<CourseView[]>;
async function getPublished(params: PublishedParams): Promise<PublishedResult>;
async function getPublished(params?: PublishedParams): Promise<CourseView[] | PublishedResult> {
  const res = await api.get<CursoPublicado[]>('/courses', {
    params: params ? limpiarParams(params) : undefined,
  });
  const cursos = (Array.isArray(res.data) ? res.data : []).map(normalizarCurso);

  // Compatibilidad: sin argumentos sigue devolviendo el array, como antes
  if (!params) return cursos;

  return {
    cursos,
    // Si las cabeceras aún no existen, el contador muestra lo realmente recibido
    total: aEnteroPositivo(res.headers['x-total-count'], cursos.length),
    page: aEnteroPositivo(res.headers['x-page'], params.page ?? 1),
    pageSize: aEnteroPositivo(res.headers['x-page-size'], params.pageSize ?? cursos.length),
  };
}

export const coursesService = {
  getPublished,
  getCourse: async (id: string): Promise<CourseDetailView> =>
    (await api.get(`/courses/${id}`)).data,
  // GET /courses/mine devuelve filas completas de Prisma: el precio llega como
  // string (Decimal) y la respuesta no trae `stats`. Se tipa como CourseView
  // para no romper a los consumidores existentes; quien muestre price debe
  // normalizarlo con Number().
  getMyCourses: async (): Promise<CourseView[]> => {
    const res = await api.get<CourseView[]>('/courses/mine');
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
