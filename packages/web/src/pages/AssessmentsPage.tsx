import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import {
  assessmentsService,
  type AssessmentView,
  type SubmissionView,
} from '../services/assessments.service';
import { enrollmentsService, type EnrollmentAdminView } from '../services/enrollments.service';
import { certificatesService } from '../services/certificates.service';
import { adminService } from '../services/admin.service';
import type { CohortView, EnrollmentView } from '@elprofeclei/shared';

export function AssessmentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [assessments, setAssessments] = useState<AssessmentView[]>([]);
  const [cohorts, setCohorts] = useState<CohortView[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [submissions, setSubmissions] = useState<Record<string, SubmissionView[]>>({});
  // NUEVO: Estado para matrículas
  const [enrollments, setEnrollments] = useState<EnrollmentAdminView[]>([]);

  const [form, setForm] = useState({ title: '', type: 'TASK', maxScore: 5, content: '' });
  const [submitForm, setSubmitForm] = useState<Record<string, string>>({});
  const [gradeForm, setGradeForm] = useState<Record<string, { score: string; feedback: string }>>(
    {},
  );

  useEffect(() => {
    if (!courseId) return;

    if (user?.role === 'STUDENT') {
      enrollmentsService.getMine().then((res: EnrollmentView[]) => {
        const enrollment = res.find(
          (e: EnrollmentView) => e.cohort.courseId === courseId && e.status === 'ACTIVE',
        );
        if (enrollment) {
          setSelectedCohortId(enrollment.cohortId);
          assessmentsService
            .getByCohort(enrollment.cohortId)
            .then(setAssessments)
            .catch(console.error);
        }
      });
    } else if (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
      adminService.getCohortsByCourse(courseId).then(setCohorts).catch(console.error);
    }
  }, [user, courseId]);

  const handleCohortChange = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    if (cohortId) {
      assessmentsService.getByCohort(cohortId).then(setAssessments).catch(console.error);
      // Cargar matrículas si es instructor
      if (user?.role !== 'STUDENT') {
        enrollmentsService.getByCohort(cohortId).then(setEnrollments).catch(console.error);
      }
    } else {
      setAssessments([]);
      setEnrollments([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohortId) return toast.error('Selecciona una cohorte primero');
    try {
      await assessmentsService.create({ ...form, cohortId: selectedCohortId });
      toast.success('Evaluación creada');
      setForm({ title: '', type: 'TASK', maxScore: 5, content: '' });
      assessmentsService.getByCohort(selectedCohortId).then(setAssessments);
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error')
        : 'Error';
      toast.error(msg);
    }
  };

  const handleLoadSubmissions = async (assessmentId: string) => {
    try {
      const data = await assessmentsService.getSubmissions(assessmentId);
      setSubmissions({ ...submissions, [assessmentId]: data });
    } catch {
      toast.error('Error al cargar entregas');
    }
  };

  const handleSubmit = async (assessmentId: string) => {
    try {
      await assessmentsService.submit(assessmentId, submitForm[assessmentId] || '');
      toast.success('Tarea entregada!');
      setSubmitForm({ ...submitForm, [assessmentId]: '' });
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error')
        : 'Error';
      toast.error(msg);
    }
  };

  const handleGrade = async (submissionId: string) => {
    const scoreVal = gradeForm[submissionId]?.score || '0';
    const feedbackVal = gradeForm[submissionId]?.feedback || '';
    try {
      await assessmentsService.grade(submissionId, Number(scoreVal), feedbackVal);
      toast.success('Calificación guardada');
    } catch {
      toast.error('Error al calificar');
    }
  };

  // NUEVO: Emitir certificado
  const handleIssueCert = async (enrollmentId: string) => {
    try {
      await certificatesService.issue(enrollmentId);
      toast.success('Certificado emitido con éxito');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error')
        : 'Error';
      toast.error(msg);
    }
  };

  const inputClass =
    'bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Evaluaciones del Curso
      </h1>

      {/* Selector de Cohorte para Instructor */}
      {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && (
        <div className="bg-white dark:bg-lms-dark-card p-4 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm mb-6">
          <label className="text-sm text-lms-muted mr-4">Gestionando Cohorte:</label>
          <select
            className={`${inputClass} max-w-xs`}
            value={selectedCohortId}
            onChange={(e) => handleCohortChange(e.target.value)}
          >
            <option value="">-- Seleccionar Cohorte --</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {new Date(c.startDate).toLocaleDateString()} (Cupo: {c.capacity})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de Estudiantes y Emisión de Certificados (Instructor) */}
      {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && selectedCohortId && (
        <div className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm mb-8">
          <h2 className="text-lg font-bold mb-4 text-lms-text dark:text-lms-text-dark">
            Estudiantes Matriculados
          </h2>
          <div className="space-y-3">
            {enrollments.map((en) => (
              <div
                key={en.id}
                className="flex justify-between items-center border-b border-lms-border pb-2"
              >
                <div>
                  <p className="font-semibold text-lms-text dark:text-lms-text-dark">
                    {en.user.firstName} {en.user.lastName}
                  </p>
                  <p className="text-xs text-lms-muted">{en.user.email}</p>
                </div>
                <button
                  onClick={() => handleIssueCert(en.id)}
                  className="bg-vs-green text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition-colors"
                >
                  Emitir Certificado
                </button>
              </div>
            ))}
            {enrollments.length === 0 && (
              <p className="text-lms-muted text-sm">No hay estudiantes matriculados.</p>
            )}
          </div>
        </div>
      )}

      {/* Formulario de Creación (Instructor) */}
      {(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') && selectedCohortId && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="text-sm text-lms-muted">Título</label>
            <input
              className={inputClass + ' w-full'}
              placeholder="Tarea 1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted">Tipo</label>
            <select
              className={inputClass + ' w-full'}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="TASK">Tarea</option>
              <option value="QUIZ">Quiz</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-lms-muted">Nota Máx</label>
            <input
              type="number"
              className={inputClass + ' w-full'}
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
          >
            Crear
          </button>
        </form>
      )}

      {/* Lista de Evaluaciones */}
      <div className="space-y-6">
        {assessments.map((a) => (
          <div
            key={a.id}
            className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
                  {a.title}
                </h3>
                <p className="text-sm text-lms-muted">
                  Tipo: {a.type} | Nota Máx: {a.maxScore}
                </p>
              </div>
              {user?.role !== 'STUDENT' && (
                <button
                  onClick={() => handleLoadSubmissions(a.id)}
                  className="text-sm bg-vs-yellow text-black px-3 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                >
                  Ver Entregas
                </button>
              )}
            </div>

            {/* Entrega Estudiante */}
            {user?.role === 'STUDENT' && (
              <div className="flex gap-2 mt-4">
                <input
                  className={inputClass + ' flex-1'}
                  placeholder="Pega aquí la URL de tu tarea o respuesta"
                  value={submitForm[a.id] || ''}
                  onChange={(e) => setSubmitForm({ ...submitForm, [a.id]: e.target.value })}
                />
                <button
                  onClick={() => handleSubmit(a.id)}
                  className="bg-vs-green text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                >
                  Entregar
                </button>
              </div>
            )}

            {/* Lista de Entregas Instructor */}
            {submissions[a.id]?.map((s) => (
              <div key={s.id} className="mt-4 pt-4 border-t border-lms-border flex flex-col gap-3">
                <p className="text-sm text-lms-text dark:text-lms-text-dark">
                  <strong>
                    {s.user.firstName} {s.user.lastName}
                  </strong>{' '}
                  entregó:
                  <a
                    href={s.content}
                    target="_blank"
                    rel="noreferrer"
                    className="text-vs-blue underline ml-1"
                  >
                    Ver archivo
                  </a>
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Nota"
                    className={inputClass + ' w-20'}
                    onChange={(e) =>
                      setGradeForm({
                        ...gradeForm,
                        [s.id]: {
                          score: e.target.value,
                          feedback: gradeForm[s.id]?.feedback || '',
                        },
                      })
                    }
                  />
                  <input
                    placeholder="Retroalimentación"
                    className={inputClass + ' flex-1'}
                    onChange={(e) =>
                      setGradeForm({
                        ...gradeForm,
                        [s.id]: { score: gradeForm[s.id]?.score || '', feedback: e.target.value },
                      })
                    }
                  />
                  <button
                    onClick={() => handleGrade(s.id)}
                    className="bg-vs-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
                  >
                    Calificar
                  </button>
                </div>
                {s.status === 'GRADED' && (
                  <p className="text-xs text-lms-muted">
                    Calificado: {s.score?.toString()} - {s.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}

        {assessments.length === 0 && (
          <p className="text-lms-muted text-center py-10">
            {user?.role === 'STUDENT'
              ? 'No tienes evaluaciones pendientes o no estás matriculado.'
              : 'Selecciona una cohorte para ver o crear evaluaciones.'}
          </p>
        )}
      </div>
    </div>
  );
}
