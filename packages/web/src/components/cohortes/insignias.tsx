import { IconoCamara, IconoSede, IconoVideo } from './iconos';

// Catálogos de presentación: cada tipo y modo lleva su etiqueta textual
// (nunca solo color), un icono distinto y su propia paleta.
const TIPOS_SESION: Record<
  string,
  { etiqueta: string; clases: string; icono: typeof IconoCamara }
> = {
  VIRTUAL_SYNC: {
    etiqueta: 'Virtual en vivo',
    clases: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    icono: IconoCamara,
  },
  ONSITE: {
    etiqueta: 'Presencial',
    clases: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    icono: IconoSede,
  },
  ASYNC_VIDEO: {
    etiqueta: 'Video asíncrono',
    clases: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    icono: IconoVideo,
  },
};

const MODOS_APROBACION: Record<string, { etiqueta: string; clases: string; punto: string }> = {
  AUTO: {
    etiqueta: 'Automática',
    clases: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    punto: 'bg-vs-green',
  },
  MANUAL: {
    etiqueta: 'Manual',
    clases: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    punto: 'bg-vs-yellow',
  },
};

const CLASES_FALLBACK = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

export function InsigniaTipo({ tipo }: { tipo: string }) {
  const info = TIPOS_SESION[tipo];
  const Icono = info?.icono;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        info?.clases ?? CLASES_FALLBACK
      }`}
    >
      {Icono ? <Icono className="h-3.5 w-3.5" /> : null}
      {info?.etiqueta ?? tipo}
    </span>
  );
}

export function InsigniaAprobacion({ modo }: { modo: string }) {
  const info = MODOS_APROBACION[modo];
  return (
    <span
      title="Modo de aprobación de la cohorte"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        info?.clases ?? CLASES_FALLBACK
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${info?.punto ?? 'bg-gray-500'}`}
      />
      Aprobación {info?.etiqueta.toLowerCase() ?? modo}
    </span>
  );
}
