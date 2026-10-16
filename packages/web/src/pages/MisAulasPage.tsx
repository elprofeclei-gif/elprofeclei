import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EnrollmentView } from '@elprofeclei/shared';
import { enrollmentsService } from '../services/enrollments.service';
import { Skeleton } from '../components/Skeleton';
import { formatFecha } from '../utils/format';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  ACTIVE: {
    texto: 'Activo',
    clase: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  PENDING_PAYMENT: {
    texto: 'Pendiente de pago',
    clase: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300',
  },
  PENDING_APPROVAL: {
    texto: 'Pendiente de aprobación',
    clase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  COMPLETED: {
    texto: 'Completado',
    clase: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  REJECTED: {
    texto: 'Rechazado',
    clase: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  CANCELLED: {
    texto: 'Cancelado',
    clase: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
};

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

// Mis aulas: entra a la clase o a las evaluaciones de cada cohorte en la que estás
export function MisAulasPage() {
  const [matriculas, setMatriculas] = useState<EnrollmentView[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    enrollmentsService
      .getMine()
      .then((datos) => {
        if (vigente) setMatriculas(Array.isArray(datos) ? datos : []);
      })
      .catch(() => {
        if (vigente) setError('No pudimos cargar tus cursos.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Mis aulas
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Cada curso en el que estás matriculado tiene su aula con materiales, evaluaciones y tu
          avance.
        </p>
      </header>

      {cargando ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Skeleton />
          <Skeleton />
        </div>
      ) : error !== '' ? (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : matriculas.length === 0 ? (
        <div className={`${PANEL} text-center`}>
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Todavía no estás matriculado en ningún curso
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-lms-muted dark:text-gray-400">
            Explora el catálogo y matrículate: el aula aparece en cuanto tu matrícula esté activa.
          </p>
          <Link to="/" className={`${BOTON_PRIMARIO} mt-5`}>
            Ver el catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {matriculas.map((matricula) => {
            const estado = ESTADOS[matricula.status] ?? ESTADOS.CANCELLED;

            return (
              <article key={matricula.id} className={PANEL}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-lms-text dark:text-lms-text-dark">
                    {matricula.cohort.course.title}
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                    {estado.texto}
                  </span>
                </div>

                <p className="mt-2 text-xs text-lms-muted dark:text-gray-400">
                  Inicio {formatFecha(matricula.cohort.startDate)} · Fin{' '}
                  {formatFecha(matricula.cohort.endDate)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {matricula.status === 'ACTIVE' ? (
                    <>
                      <Link to={`/aula/${matricula.cohort.courseId}`} className={BOTON_PRIMARIO}>
                        Entrar al aula
                      </Link>
                      <Link
                        to={`/course/${matricula.cohort.courseId}/assessments`}
                        className={BOTON_SECUNDARIO}
                      >
                        Evaluaciones
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {matricula.status === 'PENDING_PAYMENT'
                        ? `Prematrícula pendiente de pago${
                            matricula.payment?.reference
                              ? ` · referencia ${matricula.payment.reference}`
                              : ''
                          }`
                        : 'Tu matrícula aún no está activa.'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
