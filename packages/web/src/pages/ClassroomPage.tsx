import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type { EnrollmentView, ProgresoView } from '@elprofeclei/shared';
import { enrollmentsService } from '../services/enrollments.service';
import { assessmentsService, type AssessmentView } from '../services/assessments.service';
import { progressService } from '../services/progress.service';
import { sessionsService, type SessionCohorteView } from '../services/sessions.service';
import { adminService, type VenueView } from '../services/admin.service';
import { PanelProgreso } from '../components/progreso/PanelProgreso';
import { InsigniaTipo } from '../components/cohortes/insignias';
import { formatFechaHora } from '../utils/format';
import { aUrlEmbebible, nombreDelProveedor } from '../utils/video';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

const mensajeDeError = (err: unknown, alterno: string) =>
  isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? alterno) : alterno;

// Aula del estudiante: avance real, materiales con el video incrustado y las
// evaluaciones con su estado. Todo sale de datos que la API ya devuelve.
export function ClassroomPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);
  const [matricula, setMatricula] = useState<EnrollmentView | null>(null);
  const [sesiones, setSesiones] = useState<SessionCohorteView[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<AssessmentView[]>([]);
  const [progreso, setProgreso] = useState<ProgresoView | null>(null);
  const [sedes, setSedes] = useState<VenueView[]>([]);

  const cargar = useCallback(async () => {
    if (!courseId) return;

    setCargando(true);
    setError('');

    try {
      const misMatriculas = (await enrollmentsService.getMine()) as EnrollmentView[];
      const activa = misMatriculas.find(
        (fila) => fila.cohort.courseId === courseId && fila.status === 'ACTIVE',
      );
      const propia =
        activa ?? misMatriculas.find((fila) => fila.cohort.courseId === courseId) ?? null;
      setMatricula(propia);

      if (!propia) {
        setCargando(false);
        return;
      }

      const cohortId = propia.cohortId;

      const [listaSesiones, listaEvaluaciones, avance, listaSedes] = await Promise.all([
        sessionsService.getByCohort(cohortId).catch(() => [] as SessionCohorteView[]),
        assessmentsService.getByCohort(cohortId).catch(() => [] as AssessmentView[]),
        progressService.getMine(cohortId).catch(() => null),
        adminService.getVenues().catch(() => [] as VenueView[]),
      ]);

      setSesiones(listaSesiones);
      setEvaluaciones(listaEvaluaciones);
      setProgreso(avance);
      setSedes(listaSedes);
    } catch (err) {
      const mensaje = mensajeDeError(err, 'No pudimos cargar tu aula. Inténtalo de nuevo.');
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  }, [courseId]);

  useEffect(() => {
    void cargar();
  }, [cargar, reintento]);

  const nombreDeSede = (venueId: string | null) =>
    sedes.find((sede) => sede.id === venueId)?.name ?? 'Sede por confirmar';

  if (cargando) {
    return (
      <p role="status" className="py-16 text-center text-lms-muted dark:text-gray-400">
        Cargando tu aula…
      </p>
    );
  }

  if (error !== '') {
    return (
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/15"
      >
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => setReintento((valor) => valor + 1)}
          className={`${BOTON_PRIMARIO} mt-4`}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!matricula) {
    return (
      <div className={`${PANEL} mx-auto max-w-xl text-center`}>
        <h1 className="text-lg font-semibold text-lms-text dark:text-lms-text-dark">
          No estás matriculado en este curso
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          El aula reúne los materiales, el avance y las evaluaciones de tu cohorte. Primero realiza
          tu matrícula en el curso.
        </p>
        <Link to={`/course/${courseId}`} className={`${BOTON_PRIMARIO} mt-5`}>
          Ver el curso
        </Link>
      </div>
    );
  }

  const curso = matricula.cohort.course;

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <Link to={`/course/${courseId}`} className="hover:underline">
            {curso.title}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Aula del curso
        </h1>
      </header>

      {progreso ? (
        <PanelProgreso progreso={progreso} />
      ) : (
        <p role="status" className="text-sm text-lms-muted dark:text-gray-400">
          No pudimos cargar tu avance; el resto del aula sigue disponible.
        </p>
      )}

      <section aria-labelledby="titulo-materiales" className={PANEL}>
        <h2
          id="titulo-materiales"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Sesiones y materiales
        </h2>

        {sesiones.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Tu instructor todavía no ha publicado sesiones en esta cohorte.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {sesiones.map((sesion) => {
              const embebible = sesion.videoUrl ? aUrlEmbebible(sesion.videoUrl) : null;

              return (
                <li
                  key={sesion.id}
                  className="border-b border-lms-border pb-6 last:border-0 last:pb-0 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-lms-text dark:text-lms-text-dark">
                      {sesion.title}
                    </h3>
                    <InsigniaTipo tipo={sesion.type} />
                  </div>

                  <p className="mt-1 text-xs text-lms-muted dark:text-gray-400">
                    {formatFechaHora(sesion.startTime)}
                  </p>

                  {sesion.type === 'ONSITE' ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Lugar: {nombreDeSede(sesion.venueId)}
                    </p>
                  ) : null}

                  {sesion.videoUrl ? (
                    embebible ? (
                      <div className="mt-3">
                        <div className="overflow-hidden rounded-lg border border-lms-border dark:border-gray-700">
                          <iframe
                            src={embebible}
                            title={`Video de la sesión ${sesion.title}`}
                            className="aspect-video w-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <a
                          href={sesion.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline dark:text-vs-blue"
                        >
                          Abrir en {nombreDelProveedor(sesion.videoUrl)}
                        </a>
                      </div>
                    ) : (
                      <a
                        href={sesion.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-vs-blue"
                      >
                        Abrir la sesión en {nombreDelProveedor(sesion.videoUrl)}
                      </a>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-evaluaciones" className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="titulo-evaluaciones"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Evaluaciones y tareas
          </h2>
          <Link to={`/course/${courseId}/assessments`} className={BOTON_PRIMARIO}>
            Ir a evaluaciones
          </Link>
        </div>

        {evaluaciones.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Aún no hay evaluaciones en esta cohorte.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {evaluaciones.map((evaluacion) => {
              const entrega = evaluacion.miEntrega ?? null;
              const nota =
                entrega?.score === null || entrega?.score === undefined
                  ? null
                  : Number(entrega.score);
              const maxScore = Number(evaluacion.maxScore);

              const estado = entrega
                ? nota === null
                  ? 'Entregada, pendiente de calificar'
                  : `Calificada: ${nota}/${maxScore}`
                : 'Sin entregar';

              return (
                <li
                  key={evaluacion.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-lms-text dark:text-lms-text-dark">
                      {evaluacion.title}{' '}
                      <span className="text-xs font-normal text-lms-muted dark:text-gray-400">
                        ({evaluacion.type === 'QUIZ' ? 'Quiz autocalificable' : 'Tarea'} · hasta{' '}
                        {maxScore})
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">{estado}</p>
                    {entrega?.feedback ? (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Retroalimentación: {entrega.feedback}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
