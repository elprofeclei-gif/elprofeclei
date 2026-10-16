// Tipos y catálogos de presentación de la gestión de cohortes.
//
// Los contratos de la API de administración viven en `admin.service.ts` (ahí se
// extendió `SessionView` con `venueId`, que la API sí devuelve porque entrega
// filas completas de Prisma). Se reexportan aquí para que los componentes de
// esta carpeta importen todo lo compartido desde un solo módulo.
export type { CohorteAdminView, SessionAdminView, VenueView } from '../../services/admin.service';

export type ModoAprobacion = 'AUTO' | 'MANUAL';
export type TipoSesion = 'VIRTUAL_SYNC' | 'ONSITE' | 'ASYNC_VIDEO';

// Etiquetas textuales: el color nunca es el único portador del significado.
export const MODOS_APROBACION: { valor: ModoAprobacion; etiqueta: string }[] = [
  { valor: 'AUTO', etiqueta: 'Automática' },
  { valor: 'MANUAL', etiqueta: 'Manual' },
];

export const TIPOS_SESION: { valor: TipoSesion; etiqueta: string }[] = [
  { valor: 'ASYNC_VIDEO', etiqueta: 'Video asíncrono' },
  { valor: 'VIRTUAL_SYNC', etiqueta: 'Virtual en vivo' },
  { valor: 'ONSITE', etiqueta: 'Presencial' },
];

// Los tipos que llegan del backend son `string`: estos guards evitan castings y
// mantienen el formulario dentro de la unión que acepta el esquema compartido.
export const esModoAprobacion = (valor: string | undefined): valor is ModoAprobacion =>
  valor === 'AUTO' || valor === 'MANUAL';

export const esTipoSesion = (valor: string | undefined): valor is TipoSesion =>
  valor === 'ASYNC_VIDEO' || valor === 'VIRTUAL_SYNC' || valor === 'ONSITE';
