import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enrollmentsService } from '../services/enrollments.service';
import { Skeleton } from '../components/Skeleton';
import { formatFecha } from '../utils/format';
import type { EnrollmentView } from '@elprofeclei/shared';

// Estado de la matrícula con su etiqueta y color
const ESTADOS: Record<string, { texto: string; clase: string }> = {
  ACTIVE: { texto: 'Activo', clase: 'bg-vs-green/10 text-vs-green' },
  PENDING_PAYMENT: { texto: 'Pendiente de pago', clase: 'bg-vs-yellow/10 text-vs-yellow' },
  PENDING_APPROVAL: { texto: 'Pendiente de aprobación', clase: 'bg-vs-blue/10 text-vs-blue' },
  COMPLETED: { texto: 'Completado', clase: 'bg-vs-blue/10 text-vs-blue' },
  REJECTED: { texto: 'Rechazado', clase: 'bg-vs-orange/10 text-vs-orange' },
  CANCELLED: { texto: 'Cancelado', clase: 'bg-lms-muted/10 text-lms-muted' },
};

export function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<EnrollmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    enrollmentsService
      .getMine()
      .then(setEnrollments)
      .catch(() => {
        const mensaje = 'No se pudieron cargar tus matrículas. Intenta recargar la página.';
        setError(mensaje);
        toast.error(mensaje);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-lms-text dark:text-lms-text-dark mb-8">
        Mi Campus Virtual
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : error ? (
          <p role="alert" className="text-red-500 col-span-full text-center py-10">
            {error}
          </p>
        ) : enrollments.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <p className="text-lms-muted mb-4">Aún no estás matriculado en ningún curso.</p>
            <Link
              to="/"
              className="bg-vs-blue text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
            >
              Explorar Marketplace
            </Link>
          </div>
        ) : (
          enrollments.map((en) => {
            const estado = ESTADOS[en.status] ?? {
              texto: en.status,
              clase: 'bg-lms-muted/10 text-lms-muted',
            };

            return (
              <div
                key={en.id}
                className="bg-white dark:bg-lms-dark-card rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="h-32 bg-gradient-to-br from-vs-blue to-vs-green flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-white opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark mb-2">
                    {en.cohort.course.title}
                  </h2>
                  <p className="text-lms-muted text-sm mb-4">
                    Inicio: {formatFecha(en.cohort.startDate)}
                  </p>

                  <div className="flex justify-between items-center gap-2">
                    <span
                      className={`${estado.clase} text-xs px-2 py-1 rounded-md font-semibold whitespace-nowrap`}
                    >
                      {estado.texto}
                    </span>

                    {en.status === 'ACTIVE' ? (
                      <div className="flex gap-2">
                        <Link
                          to={`/aula/${en.cohort.courseId}`}
                          className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition-colors dark:bg-vs-blue dark:text-vs-bg"
                        >
                          Entrar al aula
                        </Link>
                        <Link
                          to={`/course/${en.cohort.courseId}/assessments`}
                          className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-2 rounded-lg font-semibold hover:bg-lms-bg dark:hover:bg-gray-700 transition-colors"
                        >
                          Evaluaciones
                        </Link>
                      </div>
                    ) : en.status === 'PENDING_PAYMENT' ? (
                      <span className="text-xs text-lms-muted text-right">
                        Referencia: {en.payment?.reference ?? 'en trámite'}
                      </span>
                    ) : (
                      <span className="text-xs text-lms-muted text-right">Sin acceso aún</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
