import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type { CourseView, EnrollmentAdminView, ProgresoEstudianteView } from '@elprofeclei/shared';
import { coursesService } from '../services/courses.service';
import { adminService, type CohorteAdminView } from '../services/admin.service';
import { progressService } from '../services/progress.service';
import { enrollmentsService } from '../services/enrollments.service';
import { certificatesService } from '../services/certificates.service';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../components/cohortes/clases';
import { SelectorCurso } from '../components/cohortes/SelectorCurso';
import { EstadoVacio } from '../components/cohortes/EstadoVacio';
import { EstadoError } from '../components/cohortes/EstadoError';
import { EsqueletoCohortes } from '../components/cohortes/EsqueletoCohortes';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';

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

const mensajeDeError = (err: unknown, alterno: string) =>
  isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? alterno) : alterno;

// Avance del grupo por cohorte: quién cumple los requisitos y a quién se le puede
// emitir el certificado. Todo con datos reales de asistencia, entregas y notas.
export function CohortProgressPage() {
  const [cursos, setCursos] = useState<CourseView[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [cohortes, setCohortes] = useState<CohorteAdminView[]>([]);
  const [cohorteId, setCohorteId] = useState('');
  const [progresos, setProgresos] = useState<ProgresoEstudianteView[]>([]);
  const [matriculas, setMatriculas] = useState<EnrollmentAdminView[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);
  const [emitiendo, setEmitiendo] = useState<string | null>(null);

  // Cursos del instructor/admin
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');

    coursesService
      .getMyCourses()
      .then((datos: CourseView[]) => {
        if (!vigente) return;
        const lista = Array.isArray(datos) ? datos : [];
        setCursos(lista);
        setCursoId((actual) => actual || lista[0]?.id || '');
      })
      .catch((err) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar tus cursos.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [reintento]);

  // Cohortes del curso
  useEffect(() => {
    if (cursoId === '') {
      setCohortes([]);
      setCohorteId('');
      return undefined;
    }

    let vigente = true;

    adminService
      .getCohortsByCourse(cursoId)
      .then((lista) => {
        if (!vigente) return;
        setCohortes(lista);
        setCohorteId((actual) =>
          lista.some((c) => c.id === actual) ? actual : (lista[0]?.id ?? ''),
        );
      })
      .catch((err) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar las cohortes.'));
      });

    return () => {
      vigente = false;
    };
  }, [cursoId, reintento]);

  // Progreso del grupo y matrículas (para poder emitir el certificado)
  useEffect(() => {
    if (cohorteId === '') {
      setProgresos([]);
      setMatriculas([]);
      return undefined;
    }

    let vigente = true;
    setCargando(true);

    Promise.all([
      progressService.getByCohort(cohorteId),
      enrollmentsService.getByCohort(cohorteId).catch(() => [] as EnrollmentAdminView[]),
    ])
      .then(([listaProgresos, listaMatriculas]) => {
        if (!vigente) return;
        setProgresos(listaProgresos);
        setMatriculas(listaMatriculas);
      })
      .catch((err) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar el avance del grupo.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [cohorteId, reintento]);

  // El progreso llega con el usuario completo; buscamos su matrícula por email
  const matriculaDelEstudiante = (email: string) =>
    matriculas.find((matricula) => matricula.user.email === email) ?? null;

  const emitir = async (enrollmentId: string) => {
    setEmitiendo(enrollmentId);
    try {
      await certificatesService.issue(enrollmentId);
      toast.success('Certificado emitido');
      setReintento((valor) => valor + 1);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos emitir el certificado.'), { duration: 8000 });
    } finally {
      setEmitiendo(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Avance del grupo
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Requisitos para certificar: 80 % de asistencia, todas las evaluaciones entregadas y
          calificadas, y nota media mínima del 70 %.
        </p>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {cargando ? 'Cargando el avance del grupo…' : `${progresos.length} estudiantes cargados.`}
      </p>

      {error !== '' ? (
        <EstadoError mensaje={error} onReintentar={() => setReintento((valor) => valor + 1)} />
      ) : cursos.length === 0 && !cargando ? (
        <EstadoVacio
          titulo="Todavía no tienes cursos"
          descripcion="El avance se calcula por cohorte. Crea un curso y sus cohortes para ver el progreso de tus estudiantes."
        >
          <Link to="/instructor" className={BOTON_PRIMARIO}>
            Ir al panel de cursos
          </Link>
        </EstadoVacio>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <SelectorCurso cursos={cursos} valor={cursoId} onCambio={setCursoId} />

            {cohortes.length > 0 && (
              <div className="w-full max-w-xs">
                <label
                  htmlFor="cohorte-avance"
                  className="mb-1.5 block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                >
                  Cohorte
                </label>
                <select
                  id="cohorte-avance"
                  value={cohorteId}
                  onChange={(evento) => setCohorteId(evento.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
                >
                  {cohortes.map((cohorte) => (
                    <option key={cohorte.id} value={cohorte.id}>
                      {cohorte.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {cargando ? (
            <EsqueletoCohortes tarjetas={2} />
          ) : cohorteId === '' ? (
            <EstadoVacio
              titulo="Este curso no tiene cohortes"
              descripcion="Crea una cohorte para poder ver el avance de tus estudiantes."
            >
              <Link to="/manage" className={BOTON_PRIMARIO}>
                Ir a Cohortes y sesiones
              </Link>
            </EstadoVacio>
          ) : progresos.length === 0 ? (
            <EstadoVacio
              titulo="Sin estudiantes en esta cohorte"
              descripcion="Cuando alguien se matricule aparecerá aquí su asistencia, sus entregas y su nota media."
            />
          ) : (
            <section aria-labelledby="titulo-tabla" className={PANEL}>
              <h2
                id="titulo-tabla"
                className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
              >
                {progresos.length} {progresos.length === 1 ? 'estudiante' : 'estudiantes'}
              </h2>

              <ul className="mt-4 space-y-3">
                {progresos.map((progreso) => {
                  const estado = ESTADOS[progreso.estado] ?? ESTADOS.EN_CURSO;
                  const matricula = matriculaDelEstudiante(progreso.estudiante.email);

                  return (
                    <li
                      key={progreso.estudiante.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lms-bg p-4 dark:bg-gray-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-lms-text dark:text-lms-text-dark">
                          {progreso.estudiante.firstName} {progreso.estudiante.lastName}
                        </p>
                        <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                          Asistencia {progreso.asistencia.asistidas}/{progreso.asistencia.sesiones}{' '}
                          ({progreso.asistencia.porcentaje}%) · Entregas{' '}
                          {progreso.evaluaciones.entregadas}/{progreso.evaluaciones.total} ·
                          Calificadas {progreso.evaluaciones.calificadas} · Nota media{' '}
                          {progreso.evaluaciones.promedio === null
                            ? 'sin calificar'
                            : `${progreso.evaluaciones.promedio}%`}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${estado.clases}`}
                        >
                          {estado.etiqueta}
                        </span>

                        {progreso.certificado ? (
                          <span className="font-code text-xs text-gray-600 dark:text-gray-400">
                            {progreso.certificado.codigo}
                          </span>
                        ) : progreso.requisitos.elegible && matricula ? (
                          <button
                            type="button"
                            onClick={() => void emitir(matricula.id)}
                            disabled={emitiendo === matricula.id}
                            className={BOTON_SECUNDARIO}
                          >
                            {emitiendo === matricula.id ? 'Emitiendo…' : 'Emitir certificado'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
