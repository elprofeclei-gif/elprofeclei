import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type {
  ArchivoEntregaInput,
  CohortView,
  EnrollmentAdminView,
  EnrollmentView,
  TipoArchivo,
} from '@elprofeclei/shared';
import {
  assessmentsService,
  leerPreguntas,
  type AssessmentView,
  type PreguntaQuizView,
  type SubmissionView,
} from '../services/assessments.service';
import { enrollmentsService } from '../services/enrollments.service';
import { certificatesService } from '../services/certificates.service';
import { adminService } from '../services/admin.service';
import { useAuth } from '../hooks/useAuth';
import { formatFechaHora } from '../utils/format';
import { aUrlEmbebible, nombreDelProveedor } from '../utils/video';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const ENTRADA =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text placeholder:text-gray-500 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

const TIPOS_ARCHIVO: { valor: TipoArchivo; etiqueta: string }[] = [
  { valor: 'IMAGE', etiqueta: 'Imagen' },
  { valor: 'PDF', etiqueta: 'PDF' },
  { valor: 'VIDEO', etiqueta: 'Video' },
  { valor: 'DOC', etiqueta: 'Documento' },
  { valor: 'LINK', etiqueta: 'Otro enlace' },
];

const ICONO_ARCHIVO: Record<TipoArchivo, string> = {
  IMAGE: 'Imagen',
  PDF: 'PDF',
  VIDEO: 'Video',
  DOC: 'Documento',
  LINK: 'Enlace',
};

const ETIQUETA_TIPO: Record<string, string> = {
  IMAGE: 'Imagen',
  PDF: 'PDF',
  VIDEO: 'Video',
  DOC: 'Documento',
  LINK: 'Enlace',
};

const mensajeDeError = (err: unknown, alterno: string) =>
  isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? alterno) : alterno;

// Enlaces compartidos: se muestran con su tipo y, si es un video incrustable,
// con el reproductor dentro de la página.
function ListaArchivos({ archivos }: { archivos: ArchivoEntregaInput[] }) {
  if (archivos.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {archivos.map((archivo, indice) => {
        const video = archivo.tipo === 'VIDEO' ? aUrlEmbebible(archivo.url) : null;

        return (
          <li key={`${archivo.url}-${indice}`}>
            <a
              href={archivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline dark:text-vs-blue"
            >
              <span className="rounded bg-lms-bg px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {ICONO_ARCHIVO[archivo.tipo] ?? ETIQUETA_TIPO[archivo.tipo] ?? 'Enlace'}
              </span>
              {archivo.nombre ?? nombreDelProveedor(archivo.url)}
            </a>
            {video ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-lms-border dark:border-gray-700">
                <iframe
                  src={video}
                  title={`Video entregado: ${archivo.nombre ?? archivo.url}`}
                  className="aspect-video w-full"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function AssessmentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [assessments, setAssessments] = useState<AssessmentView[]>([]);
  const [cohorts, setCohorts] = useState<CohortView[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [submissions, setSubmissions] = useState<Record<string, SubmissionView[]>>({});
  const [enrollments, setEnrollments] = useState<EnrollmentAdminView[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);

  // Crear evaluación (instructor)
  const [form, setForm] = useState({ title: '', type: 'TASK', maxScore: 5 });
  const [preguntas, setPreguntas] = useState<PreguntaQuizView[]>([
    { enunciado: '', opciones: ['', ''] },
  ]);
  const [correctas, setCorrectas] = useState<number[]>([0]);
  // Tarea: fecha límite e instrucciones (se guardan en el JSON de la evaluación)
  const [tareaForm, setTareaForm] = useState({ dueAt: '', instrucciones: '' });

  // Entrega (estudiante)
  const [textoEntrega, setTextoEntrega] = useState<Record<string, string>>({});
  const [archivosEntrega, setArchivosEntrega] = useState<
    Record<string, { url: string; tipo: TipoArchivo }[]>
  >({});
  const [respuestas, setRespuestas] = useState<Record<string, number[]>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  // Calificación (instructor)
  const [gradeForm, setGradeForm] = useState<Record<string, { score: string; feedback: string }>>(
    {},
  );

  const cargarPorCohorte = useCallback(async (cohortId: string) => {
    const datos = await assessmentsService.getByCohort(cohortId);
    setAssessments(Array.isArray(datos) ? datos : []);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    let vigente = true;
    setCargando(true);
    setError('');

    const iniciar = async () => {
      try {
        if (user?.role === 'STUDENT') {
          const misMatriculas = (await enrollmentsService.getMine()) as EnrollmentView[];
          const activa = misMatriculas.find(
            (fila) => fila.cohort.courseId === courseId && fila.status === 'ACTIVE',
          );
          if (!vigente) return;

          if (!activa) {
            setAssessments([]);
            return;
          }

          setSelectedCohortId(activa.cohortId);
          await cargarPorCohorte(activa.cohortId);
        } else if (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
          const lista = await adminService.getCohortsByCourse(courseId);
          if (!vigente) return;
          setCohorts(lista);
          if (lista.length > 0) {
            setSelectedCohortId(lista[0].id);
            await cargarPorCohorte(lista[0].id);
            setEnrollments(await enrollmentsService.getByCohort(lista[0].id));
          }
        }
      } catch (err) {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar las evaluaciones.'));
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void iniciar();

    return () => {
      vigente = false;
    };
  }, [user, courseId, cargarPorCohorte, reintento]);

  const cambiarCohorte = async (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setSubmissions({});

    if (!cohortId) {
      setAssessments([]);
      setEnrollments([]);
      return;
    }

    try {
      await cargarPorCohorte(cohortId);
      if (user?.role !== 'STUDENT') {
        setEnrollments(await enrollmentsService.getByCohort(cohortId));
      }
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos cargar las evaluaciones.'));
    }
  };

  const crearEvaluacion = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!selectedCohortId) {
      toast.error('Selecciona una cohorte primero.');
      return;
    }

    try {
      const contenido =
        form.type === 'QUIZ'
          ? {
              preguntas: preguntas.map((pregunta, indice) => ({
                enunciado: pregunta.enunciado,
                opciones: pregunta.opciones.filter((opcion) => opcion.trim() !== ''),
                correcta: correctas[indice] ?? 0,
              })),
            }
          : undefined;

      await assessmentsService.create({
        cohortId: selectedCohortId,
        title: form.title,
        type: form.type,
        maxScore: form.maxScore,
        content:
          contenido ??
          (form.type === 'TASK'
            ? {
                instrucciones: tareaForm.instrucciones.trim() || undefined,
                dueAt: tareaForm.dueAt ? new Date(tareaForm.dueAt).toISOString() : undefined,
              }
            : undefined),
      });

      toast.success(form.type === 'QUIZ' ? 'Quiz creado' : 'Tarea creada');
      setForm({ title: '', type: 'TASK', maxScore: 5 });
      setPreguntas([{ enunciado: '', opciones: ['', ''] }]);
      setCorrectas([0]);
      setTareaForm({ dueAt: '', instrucciones: '' });
      await cargarPorCohorte(selectedCohortId);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos crear la evaluación.'));
    }
  };

  const entregarTarea = async (assessmentId: string) => {
    setEnviando(assessmentId);

    try {
      const filas = archivosEntrega[assessmentId] ?? [];
      const archivos = filas
        .filter((fila) => fila.url.trim() !== '')
        .map((fila) => ({ url: fila.url.trim(), tipo: fila.tipo }));

      await assessmentsService.submit({
        assessmentId,
        texto: textoEntrega[assessmentId]?.trim() || undefined,
        archivos,
      });

      toast.success('Entrega registrada');
      setTextoEntrega((previo) => ({ ...previo, [assessmentId]: '' }));
      setArchivosEntrega((previo) => ({ ...previo, [assessmentId]: [] }));

      if (selectedCohortId) await cargarPorCohorte(selectedCohortId);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos registrar tu entrega.'));
    } finally {
      setEnviando(null);
    }
  };

  const enviarQuiz = async (assessmentId: string, totalPreguntas: number) => {
    const elegidas = respuestas[assessmentId] ?? [];

    if (elegidas.filter((valor) => valor >= 0).length === 0) {
      toast.error('Responde al menos una pregunta antes de enviar.');
      return;
    }

    setEnviando(assessmentId);

    try {
      const completas = Array.from(
        { length: totalPreguntas },
        (_, indice) => elegidas[indice] ?? -1,
      );
      await assessmentsService.submit({ assessmentId, respuestas: completas });
      toast.success('Quiz enviado y corregido');
      if (selectedCohortId) await cargarPorCohorte(selectedCohortId);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos enviar el quiz.'));
    } finally {
      setEnviando(null);
    }
  };

  const cargarEntregas = async (assessmentId: string) => {
    try {
      const datos = await assessmentsService.getSubmissions(assessmentId);
      setSubmissions((previo) => ({ ...previo, [assessmentId]: datos }));
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos cargar las entregas.'));
    }
  };

  const calificar = async (submissionId: string) => {
    const valores = gradeForm[submissionId];
    try {
      await assessmentsService.grade(
        submissionId,
        Number(valores?.score ?? 0),
        valores?.feedback ?? '',
      );
      toast.success('Calificación guardada');
      if (selectedCohortId) await cargarPorCohorte(selectedCohortId);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos guardar la calificación.'));
    }
  };

  const emitirCertificado = async (enrollmentId: string) => {
    try {
      await certificatesService.issue(enrollmentId);
      toast.success('Certificado emitido');
      if (selectedCohortId) setEnrollments(await enrollmentsService.getByCohort(selectedCohortId));
    } catch (err) {
      // El servidor explica qué requisito falta: se muestra tal cual
      toast.error(mensajeDeError(err, 'No pudimos emitir el certificado.'), { duration: 8000 });
    }
  };

  const esInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Evaluaciones y tareas
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {esInstructor
            ? 'Crea quizzes autocalificables y tareas, revisa las entregas y emite certificados cuando el estudiante cumple los requisitos.'
            : 'Entrega tus tareas compartiendo enlaces a PDF, imágenes o video, y responde los quizzes.'}
        </p>
      </header>

      {esInstructor && (
        <section aria-labelledby="titulo-cohorte" className={PANEL}>
          <h2
            id="titulo-cohorte"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Cohorte
          </h2>
          <div className="mt-3 max-w-md">
            <label
              htmlFor="cohorte-evaluaciones"
              className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
            >
              Gestionando la cohorte
            </label>
            <select
              id="cohorte-evaluaciones"
              value={selectedCohortId}
              onChange={(evento) => void cambiarCohorte(evento.target.value)}
              className={`mt-1.5 ${ENTRADA}`}
            >
              <option value="">-- Selecciona una cohorte --</option>
              {cohorts.map((cohorte) => (
                <option key={cohorte.id} value={cohorte.id}>
                  {cohorte.name}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {error !== '' ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-500/30 dark:bg-red-500/15"
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
      ) : cargando ? (
        <p role="status" className="py-10 text-center text-lms-muted dark:text-gray-400">
          Cargando evaluaciones…
        </p>
      ) : null}

      {/* Crear evaluación (instructor) */}
      {esInstructor && selectedCohortId && (
        <section aria-labelledby="titulo-crear" className={PANEL}>
          <h2
            id="titulo-crear"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Nueva evaluación
          </h2>

          <form onSubmit={crearEvaluacion} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="eval-titulo"
                  className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                >
                  Título
                </label>
                <input
                  id="eval-titulo"
                  value={form.title}
                  onChange={(evento) => setForm({ ...form, title: evento.target.value })}
                  className={`mt-1.5 ${ENTRADA}`}
                  placeholder="Tarea 1: maqueta del proyecto"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="eval-tipo"
                  className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                >
                  Tipo
                </label>
                <select
                  id="eval-tipo"
                  value={form.type}
                  onChange={(evento) => setForm({ ...form, type: evento.target.value })}
                  className={`mt-1.5 ${ENTRADA}`}
                >
                  <option value="TASK">Tarea (entrega archivos o enlaces)</option>
                  <option value="QUIZ">Quiz (se corrige solo)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="eval-nota"
                  className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                >
                  Nota máxima
                </label>
                <input
                  id="eval-nota"
                  type="number"
                  min={1}
                  max={100}
                  value={form.maxScore}
                  onChange={(evento) => setForm({ ...form, maxScore: Number(evento.target.value) })}
                  className={`mt-1.5 ${ENTRADA}`}
                  required
                />
              </div>
            </div>

            {form.type === 'TASK' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tarea-limite"
                    className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                  >
                    Fecha límite (opcional)
                  </label>
                  <input
                    id="tarea-limite"
                    type="datetime-local"
                    value={tareaForm.dueAt}
                    onChange={(evento) =>
                      setTareaForm({ ...tareaForm, dueAt: evento.target.value })
                    }
                    className={`mt-1.5 ${ENTRADA}`}
                  />
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Si se pasa la fecha, la entrega se acepta pero queda marcada como fuera de
                    plazo.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tarea-instrucciones"
                    className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                  >
                    Instrucciones para el estudiante
                  </label>
                  <textarea
                    id="tarea-instrucciones"
                    rows={3}
                    value={tareaForm.instrucciones}
                    onChange={(evento) =>
                      setTareaForm({ ...tareaForm, instrucciones: evento.target.value })
                    }
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
                    placeholder="Qué debe entregar, cómo y con qué criterios se evalúa"
                  />
                </div>
              </div>
            )}

            {form.type === 'QUIZ' && (
              <fieldset className="rounded-lg border border-lms-border p-4 dark:border-gray-700">
                <legend className="px-1 text-sm font-semibold text-lms-text dark:text-lms-text-dark">
                  Preguntas del quiz
                </legend>

                <div className="mt-2 space-y-4">
                  {preguntas.map((pregunta, indicePregunta) => (
                    <div key={indicePregunta} className="rounded-lg bg-lms-bg p-3 dark:bg-gray-800">
                      <label
                        htmlFor={`pregunta-${indicePregunta}`}
                        className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                      >
                        Pregunta {indicePregunta + 1}
                      </label>
                      <input
                        id={`pregunta-${indicePregunta}`}
                        value={pregunta.enunciado}
                        onChange={(evento) => {
                          const copia = [...preguntas];
                          copia[indicePregunta] = {
                            ...copia[indicePregunta],
                            enunciado: evento.target.value,
                          };
                          setPreguntas(copia);
                        }}
                        className={`mt-1.5 ${ENTRADA}`}
                        placeholder="¿Qué es un componente?"
                      />

                      <div className="mt-3 space-y-2">
                        {pregunta.opciones.map((opcion, indiceOpcion) => (
                          <div key={indiceOpcion} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correcta-${indicePregunta}`}
                              id={`correcta-${indicePregunta}-${indiceOpcion}`}
                              checked={(correctas[indicePregunta] ?? 0) === indiceOpcion}
                              onChange={() => {
                                const copia = [...correctas];
                                copia[indicePregunta] = indiceOpcion;
                                setCorrectas(copia);
                              }}
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor={`correcta-${indicePregunta}-${indiceOpcion}`}
                              className="sr-only"
                            >
                              Marcar la opción {indiceOpcion + 1} como correcta
                            </label>
                            <input
                              value={opcion}
                              onChange={(evento) => {
                                const copia = [...preguntas];
                                const opciones = [...copia[indicePregunta].opciones];
                                opciones[indiceOpcion] = evento.target.value;
                                copia[indicePregunta] = { ...copia[indicePregunta], opciones };
                                setPreguntas(copia);
                              }}
                              className={ENTRADA}
                              placeholder={`Opción ${indiceOpcion + 1}`}
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const copia = [...preguntas];
                          copia[indicePregunta] = {
                            ...copia[indicePregunta],
                            opciones: [...copia[indicePregunta].opciones, ''],
                          };
                          setPreguntas(copia);
                        }}
                        className="mt-2 text-xs font-semibold text-blue-700 hover:underline dark:text-vs-blue"
                      >
                        Añadir opción
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPreguntas([...preguntas, { enunciado: '', opciones: ['', ''] }]);
                      setCorrectas([...correctas, 0]);
                    }}
                    className={BOTON_SECUNDARIO}
                  >
                    Añadir pregunta
                  </button>
                  {preguntas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreguntas(preguntas.slice(0, -1));
                        setCorrectas(correctas.slice(0, -1));
                      }}
                      className={BOTON_SECUNDARIO}
                    >
                      Quitar la última
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Marca con el círculo de la izquierda cuál opción es la correcta: el quiz se
                  califica solo y el estudiante ve su nota al enviarlo.
                </p>
              </fieldset>
            )}

            <div>
              <button type="submit" className={BOTON_PRIMARIO}>
                Crear evaluación
              </button>
            </div>
          </form>
        </section>
      )}

      {esInstructor && selectedCohortId && (
        <section aria-labelledby="titulo-estudiantes" className={PANEL}>
          <h2
            id="titulo-estudiantes"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Estudiantes y certificación
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            El certificado se emite solo si el estudiante cumple asistencia, entregas y nota media.
            Ver el detalle en{' '}
            <Link
              to="/progreso"
              className="font-medium text-blue-700 hover:underline dark:text-vs-blue"
            >
              Avance del grupo
            </Link>
            .
          </p>

          <ul className="mt-4 space-y-3">
            {enrollments.map((matricula) => (
              <li
                key={matricula.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-lms-border pb-3 last:border-0 dark:border-gray-700"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">
                    {matricula.user.firstName} {matricula.user.lastName}
                  </p>
                  <p className="text-xs text-lms-muted dark:text-gray-400">
                    {matricula.user.email} · {matricula.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void emitirCertificado(matricula.id)}
                  className={BOTON_SECUNDARIO}
                >
                  Emitir certificado
                </button>
              </li>
            ))}
            {enrollments.length === 0 && (
              <li className="text-sm text-lms-muted dark:text-gray-400">
                No hay estudiantes matriculados en esta cohorte.
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Lista de evaluaciones */}
      <div className="space-y-6">
        {assessments.map((evaluacion) => {
          const esQuiz = evaluacion.type === 'QUIZ';
          const preguntasQuiz = esQuiz ? leerPreguntas(evaluacion.content) : [];
          const entrega = evaluacion.miEntrega ?? null;
          const maxScore = Number(evaluacion.maxScore);
          const filasArchivos = archivosEntrega[evaluacion.id] ?? [];

          return (
            <section
              key={evaluacion.id}
              aria-labelledby={`eval-${evaluacion.id}`}
              className={PANEL}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3
                    id={`eval-${evaluacion.id}`}
                    className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
                  >
                    {evaluacion.title}
                  </h3>
                  <p className="mt-1 text-xs text-lms-muted dark:text-gray-400">
                    {esQuiz ? 'Quiz autocalificable' : 'Tarea'} · hasta {maxScore} puntos
                    {esInstructor && evaluacion._count
                      ? ` · ${evaluacion._count.submissions} entregas`
                      : ''}
                  </p>
                </div>

                {esInstructor && (
                  <button
                    type="button"
                    onClick={() => void cargarEntregas(evaluacion.id)}
                    className={BOTON_SECUNDARIO}
                  >
                    Ver entregas
                  </button>
                )}

                {!esInstructor && entrega && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entrega.score === null
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    }`}
                  >
                    {entrega.score === null
                      ? 'Entregada, pendiente de calificar'
                      : `Calificada: ${Number(entrega.score)}/${maxScore}`}
                  </span>
                )}
              </div>

              {/* Estudiante: entrega de tarea */}
              {!esInstructor &&
                !esQuiz &&
                (evaluacion.tarea?.dueAt || evaluacion.tarea?.instrucciones) && (
                  <div className="mt-3 rounded-lg bg-lms-bg p-3 text-sm dark:bg-gray-800">
                    {evaluacion.tarea?.dueAt ? (
                      <p
                        className={
                          evaluacion.vencida
                            ? 'font-semibold text-red-700 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }
                      >
                        {evaluacion.vencida ? 'La fecha límite ya pasó: ' : 'Fecha límite: '}
                        {formatFechaHora(evaluacion.tarea.dueAt)}
                      </p>
                    ) : null}
                    {evaluacion.tarea?.instrucciones ? (
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {evaluacion.tarea.instrucciones}
                      </p>
                    ) : null}
                  </div>
                )}

              {!esInstructor && !esQuiz && !entrega && (
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <label
                      htmlFor={`texto-${evaluacion.id}`}
                      className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
                    >
                      Respuesta o comentario
                    </label>
                    <textarea
                      id={`texto-${evaluacion.id}`}
                      rows={3}
                      value={textoEntrega[evaluacion.id] ?? ''}
                      onChange={(evento) =>
                        setTextoEntrega({ ...textoEntrega, [evaluacion.id]: evento.target.value })
                      }
                      className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      placeholder="Escribe lo que quieras contarle a tu instructor"
                    />
                  </div>

                  <fieldset>
                    <legend className="text-sm font-medium text-lms-text dark:text-lms-text-dark">
                      Archivos compartidos (enlaces a PDF, imagen o video)
                    </legend>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Sube tu archivo a Drive, Cloudinary, YouTube o similar y pega aquí el enlace
                      público; así se conserva la calidad y no se llena el servidor.
                    </p>

                    <div className="mt-3 space-y-2">
                      {filasArchivos.map((fila, indice) => (
                        <div key={indice} className="flex flex-col gap-2 sm:flex-row">
                          <label htmlFor={`url-${evaluacion.id}-${indice}`} className="sr-only">
                            Enlace del archivo {indice + 1}
                          </label>
                          <input
                            id={`url-${evaluacion.id}-${indice}`}
                            value={fila.url}
                            onChange={(evento) => {
                              const copia = [...filasArchivos];
                              copia[indice] = { ...copia[indice], url: evento.target.value };
                              setArchivosEntrega({ ...archivosEntrega, [evaluacion.id]: copia });
                            }}
                            className={ENTRADA}
                            placeholder="https://drive.google.com/..."
                            type="url"
                          />
                          <label htmlFor={`tipo-${evaluacion.id}-${indice}`} className="sr-only">
                            Tipo del archivo {indice + 1}
                          </label>
                          <select
                            id={`tipo-${evaluacion.id}-${indice}`}
                            value={fila.tipo}
                            onChange={(evento) => {
                              const copia = [...filasArchivos];
                              copia[indice] = {
                                ...copia[indice],
                                tipo: evento.target.value as TipoArchivo,
                              };
                              setArchivosEntrega({ ...archivosEntrega, [evaluacion.id]: copia });
                            }}
                            className={`${ENTRADA} sm:w-44`}
                          >
                            {TIPOS_ARCHIVO.map((tipo) => (
                              <option key={tipo.valor} value={tipo.valor}>
                                {tipo.etiqueta}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const copia = filasArchivos.filter(
                                (_, posicion) => posicion !== indice,
                              );
                              setArchivosEntrega({ ...archivosEntrega, [evaluacion.id]: copia });
                            }}
                            className={BOTON_SECUNDARIO}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>

                    {filasArchivos.length < 10 && (
                      <button
                        type="button"
                        onClick={() =>
                          setArchivosEntrega({
                            ...archivosEntrega,
                            [evaluacion.id]: [...filasArchivos, { url: '', tipo: 'PDF' }],
                          })
                        }
                        className={`${BOTON_SECUNDARIO} mt-3`}
                      >
                        Añadir enlace
                      </button>
                    )}
                  </fieldset>

                  <div>
                    <button
                      type="button"
                      onClick={() => void entregarTarea(evaluacion.id)}
                      disabled={enviando === evaluacion.id}
                      className={BOTON_PRIMARIO}
                    >
                      {enviando === evaluacion.id ? 'Entregando…' : 'Entregar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Estudiante: responder quiz */}
              {!esInstructor && esQuiz && !entrega && (
                <div className="mt-4">
                  {preguntasQuiz.length === 0 ? (
                    <p className="text-sm text-lms-muted dark:text-gray-400">
                      Este quiz todavía no tiene preguntas.
                    </p>
                  ) : (
                    <form
                      onSubmit={(evento) => {
                        evento.preventDefault();
                        void enviarQuiz(evaluacion.id, preguntasQuiz.length);
                      }}
                      className="flex flex-col gap-5"
                    >
                      {preguntasQuiz.map((pregunta, indicePregunta) => (
                        <fieldset key={indicePregunta}>
                          <legend className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
                            {indicePregunta + 1}. {pregunta.enunciado}
                          </legend>
                          <div className="mt-2 space-y-2">
                            {pregunta.opciones.map((opcion, indiceOpcion) => (
                              <label
                                key={indiceOpcion}
                                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                              >
                                <input
                                  type="radio"
                                  name={`respuesta-${evaluacion.id}-${indicePregunta}`}
                                  checked={
                                    (respuestas[evaluacion.id]?.[indicePregunta] ?? -1) ===
                                    indiceOpcion
                                  }
                                  onChange={() => {
                                    const copia = [...(respuestas[evaluacion.id] ?? [])];
                                    copia[indicePregunta] = indiceOpcion;
                                    setRespuestas({ ...respuestas, [evaluacion.id]: copia });
                                  }}
                                  className="h-4 w-4"
                                />
                                {opcion}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ))}

                      <div>
                        <button
                          type="submit"
                          disabled={enviando === evaluacion.id}
                          className={BOTON_PRIMARIO}
                        >
                          {enviando === evaluacion.id ? 'Enviando…' : 'Enviar respuestas'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Estudiante: entrega ya registrada */}
              {!esInstructor && entrega && (
                <div className="mt-4 rounded-lg bg-lms-bg p-4 dark:bg-gray-800">
                  <p className="text-sm text-lms-text dark:text-lms-text-dark">
                    Entregado el {formatFechaHora(entrega.createdAt)}
                  </p>
                  {entrega.contenido.texto ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {entrega.contenido.texto}
                    </p>
                  ) : null}
                  <ListaArchivos archivos={entrega.contenido.archivos} />
                  {entrega.contenido.fueraDePlazo ? (
                    <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-400">
                      Entregada fuera de plazo
                    </p>
                  ) : null}
                  {entrega.contenido.respuestas ? (
                    <p className="mt-2 text-xs text-lms-muted dark:text-gray-400">
                      Respuestas enviadas:{' '}
                      {entrega.contenido.respuestas.filter((v) => v >= 0).length} de{' '}
                      {preguntasQuiz.length || entrega.contenido.respuestas.length}
                    </p>
                  ) : null}
                  {entrega.feedback ? (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <strong className="font-semibold">Retroalimentación: </strong>
                      {entrega.feedback}
                    </p>
                  ) : null}
                </div>
              )}

              {/* Instructor: entregas recibidas */}
              {esInstructor &&
                submissions[evaluacion.id]?.map((entrega: SubmissionView) => (
                  <div
                    key={entrega.id}
                    className="mt-4 rounded-lg border border-lms-border p-4 dark:border-gray-700"
                  >
                    <p className="text-sm text-lms-text dark:text-lms-text-dark">
                      <strong className="font-semibold">
                        {entrega.user.firstName} {entrega.user.lastName}
                      </strong>{' '}
                      · {formatFechaHora(entrega.createdAt)}
                    </p>

                    {entrega.contenido.texto ? (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {entrega.contenido.texto}
                      </p>
                    ) : null}
                    <ListaArchivos archivos={entrega.contenido.archivos} />

                    {entrega.contenido.respuestas ? (
                      <p className="mt-2 text-xs text-lms-muted dark:text-gray-400">
                        Respuestas:{' '}
                        {entrega.contenido.respuestas.map((valor) => valor + 1).join(', ')}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label htmlFor={`nota-${entrega.id}`} className="sr-only">
                        Nota
                      </label>
                      <input
                        id={`nota-${entrega.id}`}
                        type="number"
                        min={0}
                        max={Number(evaluacion.maxScore)}
                        step="0.1"
                        placeholder="Nota"
                        value={gradeForm[entrega.id]?.score ?? ''}
                        onChange={(evento) =>
                          setGradeForm({
                            ...gradeForm,
                            [entrega.id]: {
                              score: evento.target.value,
                              feedback: gradeForm[entrega.id]?.feedback ?? '',
                            },
                          })
                        }
                        className={`${ENTRADA} sm:w-24`}
                      />
                      <label htmlFor={`feedback-${entrega.id}`} className="sr-only">
                        Retroalimentación
                      </label>
                      <input
                        id={`feedback-${entrega.id}`}
                        placeholder="Retroalimentación para el estudiante"
                        value={gradeForm[entrega.id]?.feedback ?? ''}
                        onChange={(evento) =>
                          setGradeForm({
                            ...gradeForm,
                            [entrega.id]: {
                              score: gradeForm[entrega.id]?.score ?? '',
                              feedback: evento.target.value,
                            },
                          })
                        }
                        className={ENTRADA}
                      />
                      <button
                        type="button"
                        onClick={() => void calificar(entrega.id)}
                        className={BOTON_PRIMARIO}
                      >
                        Calificar
                      </button>
                    </div>

                    {entrega.status === 'GRADED' && (
                      <p className="mt-2 text-xs text-lms-muted dark:text-gray-400">
                        Calificada: {entrega.score?.toString()} · {entrega.feedback}
                      </p>
                    )}
                  </div>
                ))}
            </section>
          );
        })}

        {!cargando && assessments.length === 0 && (
          <p className="py-10 text-center text-lms-muted dark:text-gray-400">
            {user?.role === 'STUDENT'
              ? 'No tienes evaluaciones disponibles o no estás matriculado en una cohorte activa.'
              : 'Selecciona una cohorte para ver o crear evaluaciones.'}
          </p>
        )}
      </div>
    </div>
  );
}
