import { Link } from 'react-router-dom';
import type { ProgresoView } from '@elprofeclei/shared';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

const ESTADOS: Record<string, { etiqueta: string; clases: string }> = {
  SIN_EMPEZAR: {
    etiqueta: 'Sin empezar',
    clases: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
  EN_CURSO: {
    etiqueta: 'En curso',
    clases: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  ELEGIBLE: {
    etiqueta: 'Listo para certificar',
    clases: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300',
  },
  CERTIFICADO: {
    etiqueta: 'Certificado emitido',
    clases: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
};

function IconoCheck({ ok }: { ok: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 ${ok ? 'text-emerald-600 dark:text-vs-green' : 'text-gray-400 dark:text-gray-500'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {ok ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
      ) : (
        <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-lms-border dark:bg-gray-700"
      role="img"
      aria-label={`${porcentaje}% completado`}
    >
      <div
        className="h-full rounded-full bg-blue-700 transition-all motion-reduce:transition-none dark:bg-vs-blue"
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
      />
    </div>
  );
}

// Avance real del estudiante: asistencia, entregas y nota media, con los
// requisitos que faltan y el siguiente paso concreto.
export function PanelProgreso({ progreso }: { progreso: ProgresoView }) {
  const estado = ESTADOS[progreso.estado] ?? ESTADOS.EN_CURSO;
  const { asistencia, evaluaciones, requisitos, certificado } = progreso;

  const promedioTexto =
    evaluaciones.promedio === null ? 'sin calificar' : `${evaluaciones.promedio}%`;

  const siguientePaso = !requisitos.cumpleAsistencia
    ? `Asiste a las sesiones que faltan: llevas ${asistencia.asistidas} de ${asistencia.sesiones} (mínimo ${requisitos.asistenciaMinima}%).`
    : !requisitos.cumpleEntrega
      ? `Te faltan entregas: llevas ${evaluaciones.entregadas} de ${evaluaciones.total} evaluaciones.`
      : !requisitos.cumpleNota
        ? evaluaciones.calificadas < evaluaciones.entregadas
          ? 'Tus entregas están pendientes de calificación por el instructor.'
          : `Tu nota media es ${promedioTexto} y necesitas al menos ${requisitos.notaMinima}%.`
        : certificado
          ? 'Tu certificado está emitido y verificado.'
          : 'Ya cumples los requisitos: tu instructor puede emitir el certificado.';

  return (
    <section aria-labelledby="titulo-progreso" className={PANEL}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="titulo-progreso"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Tu avance en la cohorte
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.clases}`}>
          {estado.etiqueta}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-lms-text dark:text-lms-text-dark">Asistencia</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {asistencia.asistidas}/{asistencia.sesiones} sesiones · {asistencia.porcentaje}%
            </p>
          </div>
          <div className="mt-2">
            <Barra porcentaje={asistencia.porcentaje} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-lms-text dark:text-lms-text-dark">
              Evaluaciones
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {evaluaciones.entregadas}/{evaluaciones.total} entregadas · nota media {promedioTexto}
            </p>
          </div>
          <div className="mt-2">
            <Barra
              porcentaje={
                evaluaciones.total === 0
                  ? 100
                  : Math.round((evaluaciones.entregadas / evaluaciones.total) * 100)
              }
            />
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <IconoCheck ok={requisitos.cumpleAsistencia} />
          <span>
            Asistencia mínima del {requisitos.asistenciaMinima}% — llevas {asistencia.porcentaje}%
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <IconoCheck ok={requisitos.cumpleEntrega} />
          <span>
            Entregar todas las evaluaciones — {evaluaciones.entregadas} de {evaluaciones.total}
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <IconoCheck ok={requisitos.cumpleNota} />
          <span>
            Nota media mínima del {requisitos.notaMinima}% — llevas {promedioTexto}
          </span>
        </li>
      </ul>

      <p className="mt-4 rounded-lg bg-lms-bg p-3 text-sm text-lms-text dark:bg-gray-800 dark:text-lms-text-dark">
        <strong className="font-semibold">Siguiente paso: </strong>
        {siguientePaso}
      </p>

      {certificado ? (
        <Link to={`/certificados/${certificado.codigo}`} className={`${BOTON_PRIMARIO} mt-4`}>
          Ver o imprimir mi certificado
        </Link>
      ) : requisitos.elegible ? (
        <Link to="/certificates" className={`${BOTON_SECUNDARIO} mt-4`}>
          Ver mis certificados
        </Link>
      ) : null}
    </section>
  );
}
