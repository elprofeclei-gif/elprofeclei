import { Link } from 'react-router-dom';
import { formatCOP, formatFecha } from '../utils/format';
import type { CourseStatsView, CourseView } from '@elprofeclei/shared';

// El API viaja con el enum de duración; la tarjeta muestra horas
const HORAS_POR_DURACION: Record<string, number> = {
  EIGHT: 8,
  TEN: 10,
  SIXTEEN: 16,
  TWENTY: 20,
};

const ETIQUETA_MODALIDAD: Record<string, string> = {
  VIRTUAL: 'Virtual',
  ONSITE: 'Presencial',
  HYBRID: 'Híbrido',
};

// Color semántico distinto por modalidad: azul = en línea, verde = presencial,
// ámbar = mixto. En claro se usa la rampa legible sobre blanco; en oscuro, el
// token de marca sobre superficie tintada (ambos pares superan 4.5:1).
const ESTILO_MODALIDAD: Record<string, string> = {
  VIRTUAL:
    'border-blue-200 bg-blue-100 text-blue-800 dark:border-vs-blue/40 dark:bg-vs-blue/20 dark:text-blue-200',
  ONSITE:
    'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-vs-green/40 dark:bg-vs-green/20 dark:text-vs-green',
  HYBRID:
    'border-amber-200 bg-amber-100 text-amber-900 dark:border-vs-yellow/40 dark:bg-vs-yellow/20 dark:text-vs-yellow',
};

const ESTILO_MODALIDAD_POR_DEFECTO =
  'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-lms-text-dark';

// Tinte de avatar estable y derivado del nombre, nunca aleatorio por render
const PALETAS_AVATAR: string[] = [
  'bg-blue-100 text-blue-800 dark:bg-vs-blue/20 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-vs-green/20 dark:text-vs-green',
  'bg-orange-100 text-orange-800 dark:bg-vs-orange/20 dark:text-orange-200',
];

const colorAvatar = (semilla: string): string => {
  let suma = 0;

  for (const caracter of semilla) {
    suma += caracter.charCodeAt(0);
  }

  return PALETAS_AVATAR[suma % PALETAS_AVATAR.length];
};

const inicialesDe = (nombre: string, apellido: string): string =>
  `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || '·';

const textoDisponibilidad = (stats: CourseStatsView): string => {
  if (stats.openCohortCount === 0) return 'Sin cohortes abiertas por ahora';

  const cohortes =
    stats.openCohortCount === 1
      ? '1 cohorte abierta'
      : `${stats.openCohortCount} cohortes abiertas`;

  if (!stats.nextStartDate) return `${cohortes} · Fecha de inicio por confirmar`;

  return `${cohortes} · Próximo inicio: ${formatFecha(stats.nextStartDate)}`;
};

function IconoReloj() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CourseCard({ curso }: { curso: CourseView }) {
  const { stats } = curso;
  const horas = HORAS_POR_DURACION[curso.duration];
  const hayCohortesAbiertas = stats.openCohortCount > 0;
  const esGratis = Number(curso.price) === 0;
  const descripcion = curso.description.trim();
  const nombreInstructor = `${curso.instructor.firstName} ${curso.instructor.lastName}`.trim();

  return (
    <article className="group relative flex h-full w-full flex-col rounded-xl border border-lms-border bg-white p-5 shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-blue-700 focus-within:ring-offset-2 motion-safe:transition-shadow dark:border-gray-700 dark:bg-lms-dark-card dark:focus-within:ring-vs-blue dark:focus-within:ring-offset-lms-dark-bg">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            ESTILO_MODALIDAD[curso.modality] ?? ESTILO_MODALIDAD_POR_DEFECTO
          }`}
        >
          {ETIQUETA_MODALIDAD[curso.modality] ?? curso.modality}
        </span>

        {horas !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            <IconoReloj />
            {horas} h
          </span>
        )}
      </div>

      <h3 className="mt-3 break-words text-[17px] font-semibold leading-snug tracking-tight text-lms-text dark:text-lms-text-dark">
        {/* El enlace estira su área con ::after: toda la tarjeta navega y el
            nombre accesible del enlace es el título del curso */}
        <Link
          to={`/course/${curso.id}`}
          className="rounded-sm group-hover:text-blue-700 focus-visible:outline-none after:absolute after:inset-0 dark:group-hover:text-vs-blue"
        >
          {curso.title}
        </Link>
      </h3>

      {descripcion !== '' && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
          {descripcion}
        </p>
      )}

      <div className="mt-4 space-y-1">
        <p className="flex items-start gap-2 text-sm text-lms-text dark:text-lms-text-dark">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              hayCohortesAbiertas
                ? 'bg-emerald-600 dark:bg-vs-green'
                : 'bg-gray-400 dark:bg-gray-500'
            }`}
          />
          <span>{textoDisponibilidad(stats)}</span>
        </p>

        {stats.totalCapacity > 0 && (
          <p className="pl-4 text-xs text-gray-600 dark:text-gray-400">
            {stats.totalCapacity} cupos en total
          </p>
        )}
      </div>

      <footer className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-lms-border pt-4 dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colorAvatar(
                nombreInstructor,
              )}`}
            >
              {inicialesDe(curso.instructor.firstName, curso.instructor.lastName)}
            </span>
            <span className="min-w-0 truncate text-sm text-lms-text dark:text-lms-text-dark">
              <span className="sr-only">Instructor: </span>
              {nombreInstructor}
            </span>
          </div>

          {esGratis ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-vs-green/40 dark:bg-vs-green/20 dark:text-vs-green">
              Gratis
            </span>
          ) : (
            <span className="shrink-0 text-base font-semibold text-lms-text dark:text-lms-text-dark">
              {formatCOP(curso.price)}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
