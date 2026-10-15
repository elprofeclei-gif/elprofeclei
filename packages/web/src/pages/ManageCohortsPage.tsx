import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { adminService, type CohortUpdateInput } from '../services/admin.service';
import { coursesService } from '../services/courses.service';
import { Modal } from '../components/Modal';
import type { CohortInput, SessionInput, CourseView, CohortView } from '@elprofeclei/shared';

export function ManageCohortsPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [cohorts, setCohorts] = useState<CohortView[]>([]);

  const [cohortForm, setCohortForm] = useState<CohortInput>({
    courseId: '',
    name: '',
    startDate: '',
    endDate: '',
    capacity: 10,
    approvalMode: 'AUTO',
  });

  // Modales de Cohorte
  const [isCohortEditOpen, setIsCohortEditOpen] = useState(false);
  const [editCohortForm, setEditCohortForm] = useState<CohortUpdateInput>({});
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [isCohortDeleteOpen, setIsCohortDeleteOpen] = useState(false);
  const [deleteCohortId, setDeleteCohortId] = useState<string | null>(null);

  // Modales de Sesión
  const [isSessionCreateOpen, setIsSessionCreateOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionInput>({
    cohortId: '',
    title: '',
    type: 'ASYNC_VIDEO',
    videoUrl: null,
    venueId: null,
    startTime: '',
    endTime: '',
  });

  const [isSessionEditOpen, setIsSessionEditOpen] = useState(false);
  const [editSessionForm, setEditSessionForm] = useState<Partial<SessionInput>>({});
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [isSessionDeleteOpen, setIsSessionDeleteOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  useEffect(() => {
    coursesService.getMyCourses().then(setCourses).catch(console.error);
  }, []);

  const handleCourseChangeForCohort = async (courseId: string) => {
    setCohortForm({ ...cohortForm, courseId });
    if (courseId) {
      try {
        const data = await adminService.getCohortsByCourse(courseId);
        setCohorts(data);
      } catch (err) {
        console.error(err);
        setCohorts([]);
      }
    } else {
      setCohorts([]);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createCohort({
        ...cohortForm,
        startDate: new Date(cohortForm.startDate).toISOString(),
        endDate: new Date(cohortForm.endDate).toISOString(),
      });
      toast.success('Cohorte creada!');
      setCohortForm({
        courseId: cohortForm.courseId,
        name: '',
        startDate: '',
        endDate: '',
        capacity: 10,
        approvalMode: 'AUTO',
      });
      handleCourseChangeForCohort(cohortForm.courseId);
    } catch (err) {
      toast.error(
        isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? 'Error') : 'Error',
      );
    }
  };

  const openCohortModal = (cohort: CohortView) => {
    setEditCohortForm({
      name: cohort.name,
      capacity: cohort.capacity,
      approvalMode: cohort.approvalMode as 'MANUAL' | 'AUTO',
    });
    setEditingCohortId(cohort.id);
    setIsCohortEditOpen(true);
  };

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCohortId) return;
    try {
      await adminService.updateCohort(editingCohortId, editCohortForm);
      toast.success('Cohorte actualizada');
      setIsCohortEditOpen(false);
      handleCourseChangeForCohort(cohortForm.courseId);
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleConfirmDeleteCohort = async () => {
    if (!deleteCohortId) return;
    try {
      await adminService.deleteCohort(deleteCohortId);
      toast.success('Cohorte eliminada');
      setIsCohortDeleteOpen(false);
      setDeleteCohortId(null);
      handleCourseChangeForCohort(cohortForm.courseId);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openSessionCreateModal = (cohortId: string) => {
    setSessionForm({
      cohortId,
      title: '',
      type: 'ASYNC_VIDEO',
      videoUrl: null,
      venueId: null,
      startTime: '',
      endTime: '',
    });
    setIsSessionCreateOpen(true);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createSession({
        ...sessionForm,
        startTime: new Date(sessionForm.startTime).toISOString(),
        endTime: new Date(sessionForm.endTime).toISOString(),
      });
      toast.success('Sesión creada!');
      setIsSessionCreateOpen(false);
      handleCourseChangeForCohort(cohortForm.courseId);
    } catch (err) {
      toast.error(
        isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? 'Error') : 'Error',
      );
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionId) return;
    try {
      await adminService.updateSession(editingSessionId, {
        ...editSessionForm,
        startTime: editSessionForm.startTime
          ? new Date(editSessionForm.startTime).toISOString()
          : undefined,
        endTime: editSessionForm.endTime
          ? new Date(editSessionForm.endTime).toISOString()
          : undefined,
      });
      toast.success('Sesión actualizada');
      setIsSessionEditOpen(false);
      handleCourseChangeForCohort(cohortForm.courseId);
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const inputClass =
    'bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue w-full';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Gestión de Cohortes y Sesiones
      </h1>

      {/* Formulario Crear Cohorte */}
      <form
        onSubmit={handleCreateCohort}
        className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col gap-4 mb-8 max-w-2xl"
      >
        <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
          Crear Nueva Cohorte
        </h2>
        <select
          className={inputClass}
          value={cohortForm.courseId}
          onChange={(e) => handleCourseChangeForCohort(e.target.value)}
          required
        >
          <option value="">-- Seleccionar Curso --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <div>
          <label className="text-sm text-lms-muted block mb-1">
            Nombre de la Cohorte (Ej: T1 2026)
          </label>
          <input
            className={inputClass}
            placeholder="Ej: T1 2026"
            value={cohortForm.name}
            onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-lms-muted block mb-1">Fecha de Inicio</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={cohortForm.startDate}
              onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Fecha de Fin</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={cohortForm.endDate}
              onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            className={inputClass}
            placeholder="Cupo"
            value={cohortForm.capacity}
            onChange={(e) => setCohortForm({ ...cohortForm, capacity: Number(e.target.value) })}
            required
          />
          <select
            className={inputClass}
            value={cohortForm.approvalMode}
            onChange={(e) =>
              setCohortForm({
                ...cohortForm,
                approvalMode: e.target.value as CohortInput['approvalMode'],
              })
            }
          >
            <option value="AUTO">Aprobación Automática</option>
            <option value="MANUAL">Aprobación Manual</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
        >
          Crear Cohorte
        </button>
      </form>

      {/* LISTADO JERÁRQUICO DE COHORTES Y SESIONES */}
      {cohortForm.courseId && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-lms-text dark:text-lms-text-dark">
            Cohortes actuales del curso:
          </h2>
          {cohorts.length === 0 ? (
            <p className="text-lms-muted">No hay cohortes creadas para este curso.</p>
          ) : (
            cohorts.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-lms-dark-card p-5 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm"
              >
                {/* Cabecera de la Cohorte */}
                <div className="flex justify-between items-center pb-4 border-b border-lms-border dark:border-gray-700">
                  <div>
                    <h3 className="font-bold text-lms-text dark:text-lms-text-dark">{c.name}</h3>
                    <p className="text-sm text-lms-muted">
                      {new Date(c.startDate).toLocaleDateString()} -{' '}
                      {new Date(c.endDate).toLocaleDateString()} | Cupo: {c.capacity}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCohortModal(c)}
                      className="text-xs bg-vs-yellow text-black px-2 py-1 rounded-md font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setDeleteCohortId(c.id);
                        setIsCohortDeleteOpen(true);
                      }}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded-md font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Sesiones de la Cohorte */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-lms-muted uppercase tracking-wider">
                      Sesiones
                    </h4>
                    <button
                      onClick={() => openSessionCreateModal(c.id)}
                      className="text-xs bg-vs-green text-white px-3 py-1 rounded-md font-bold hover:bg-green-600 transition-colors"
                    >
                      + Añadir Sesión
                    </button>
                  </div>
                  {c.sessions.length === 0 ? (
                    <p className="text-xs text-lms-muted text-center py-4 bg-lms-bg dark:bg-gray-800 rounded-lg">
                      No hay sesiones en esta cohorte.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {c.sessions.map((s) => (
                        <div
                          key={s.id}
                          className="bg-lms-bg dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center text-sm"
                        >
                          <div>
                            <p className="font-semibold text-lms-text dark:text-lms-text-dark">
                              {s.title}
                            </p>
                            <p className="text-xs text-lms-muted">
                              {new Date(s.startTime).toLocaleString()} ({s.type})
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditSessionForm({
                                  title: s.title,
                                  startTime: new Date(s.startTime).toISOString().slice(0, 16),
                                  endTime: new Date(s.endTime).toISOString().slice(0, 16),
                                  videoUrl: s.videoUrl,
                                });
                                setEditingSessionId(s.id);
                                setIsSessionEditOpen(true);
                              }}
                              className="text-xs bg-vs-yellow text-black px-2 py-1 rounded-md font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setDeleteSessionId(s.id);
                                setIsSessionDeleteOpen(true);
                              }}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded-md font-semibold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL CREAR SESIÓN */}
      <Modal
        isOpen={isSessionCreateOpen}
        onClose={() => setIsSessionCreateOpen(false)}
        title="Crear Sesión"
      >
        <form onSubmit={handleCreateSession} className="flex flex-col gap-4">
          <input
            className={inputClass}
            placeholder="Título"
            value={sessionForm.title}
            onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
            required
          />
          <select
            className={inputClass}
            value={sessionForm.type}
            onChange={(e) =>
              setSessionForm({ ...sessionForm, type: e.target.value as SessionInput['type'] })
            }
          >
            <option value="ASYNC_VIDEO">Video Asíncrono</option>
            <option value="VIRTUAL_SYNC">Videollamada</option>
            <option value="ONSITE">Presencial</option>
          </select>
          <input
            className={inputClass}
            placeholder="URL Video"
            value={sessionForm.videoUrl || ''}
            onChange={(e) => setSessionForm({ ...sessionForm, videoUrl: e.target.value })}
          />
          <input
            type="datetime-local"
            className={inputClass}
            value={sessionForm.startTime}
            onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            className={inputClass}
            value={sessionForm.endTime}
            onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
            required
          />
          <button
            type="submit"
            className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600"
          >
            Crear
          </button>
        </form>
      </Modal>

      {/* MODAL EDITAR COHORTE */}
      <Modal
        isOpen={isCohortEditOpen}
        onClose={() => setIsCohortEditOpen(false)}
        title="Editar Cohorte"
      >
        <form onSubmit={handleSaveCohort} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-lms-muted block mb-1">Nombre de la Cohorte</label>
            <input
              className={inputClass}
              placeholder="Ej: T1 2026"
              value={editCohortForm.name || ''}
              onChange={(e) => setEditCohortForm({ ...editCohortForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Cupo</label>
            <input
              type="number"
              className={inputClass}
              value={editCohortForm.capacity || 0}
              onChange={(e) =>
                setEditCohortForm({ ...editCohortForm, capacity: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Modo de Aprobación</label>
            <select
              className={inputClass}
              value={editCohortForm.approvalMode || 'AUTO'}
              onChange={(e) =>
                setEditCohortForm({
                  ...editCohortForm,
                  approvalMode: e.target.value as 'MANUAL' | 'AUTO',
                })
              }
            >
              <option value="AUTO">Automática</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setIsCohortEditOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR SESIÓN */}
      <Modal
        isOpen={isSessionEditOpen}
        onClose={() => setIsSessionEditOpen(false)}
        title="Editar Sesión"
      >
        <form onSubmit={handleSaveSession} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-lms-muted block mb-1">Título</label>
            <input
              className={inputClass}
              value={editSessionForm.title || ''}
              onChange={(e) => setEditSessionForm({ ...editSessionForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">URL Video (opcional)</label>
            <input
              className={inputClass}
              value={editSessionForm.videoUrl || ''}
              onChange={(e) => setEditSessionForm({ ...editSessionForm, videoUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Hora de Inicio</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={editSessionForm.startTime || ''}
              onChange={(e) =>
                setEditSessionForm({ ...editSessionForm, startTime: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Hora de Fin</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={editSessionForm.endTime || ''}
              onChange={(e) => setEditSessionForm({ ...editSessionForm, endTime: e.target.value })}
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setIsSessionEditOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL ELIMINAR COHORTE */}
      <Modal
        isOpen={isCohortDeleteOpen}
        onClose={() => setIsCohortDeleteOpen(false)}
        title="Eliminar Cohorte"
      >
        <div className="flex flex-col gap-6">
          <p className="text-lms-text dark:text-lms-text-dark">
            ¿Eliminar cohorte? Se eliminarán también todas sus sesiones.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsCohortDeleteOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDeleteCohort}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600"
            >
              Sí, Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL ELIMINAR SESIÓN */}
      <Modal
        isOpen={isSessionDeleteOpen}
        onClose={() => setIsSessionDeleteOpen(false)}
        title="Eliminar Sesión"
      >
        <div className="flex flex-col gap-6">
          <p className="text-lms-text dark:text-lms-text-dark">¿Eliminar esta sesión?</p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsSessionDeleteOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (deleteSessionId) {
                  await adminService.deleteSession(deleteSessionId);
                  toast.success('Eliminada');
                  setIsSessionDeleteOpen(false);
                  handleCourseChangeForCohort(cohortForm.courseId);
                }
              }}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600"
            >
              Sí, Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
