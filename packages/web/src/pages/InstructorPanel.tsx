import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { coursesService, type CourseUpdateInput } from '../services/courses.service';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';
import type { CourseInput, CourseView } from '@elprofeclei/shared';

export function InstructorPanel() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseView[]>([]);

  // Estado inicial del formulario limpio
  const emptyForm: CourseInput = {
    title: '',
    description: '',
    modality: 'VIRTUAL',
    duration: 'EIGHT',
    price: 0,
  };
  const [form, setForm] = useState<CourseInput>(emptyForm);

  // Estado para Modal de Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<CourseUpdateInput>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado para Modal de Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCourses = () => coursesService.getMyCourses().then(setCourses).catch(console.error);
  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await coursesService.create({ ...form, price: Number(form.price) });
      toast.success('Curso creado exitosamente');
      setForm(emptyForm); // LIMPIAR FORMULARIO
      loadCourses();
    } catch {
      toast.error('Error al crear curso');
    }
  };

  const handleApprove = (id: string) => coursesService.approve(id).then(loadCourses);

  const openEditModal = (course: CourseView) => {
    setEditForm({ title: course.title, description: course.description, price: course.price });
    setEditingId(course.id);
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await coursesService.update(editingId, { ...editForm, price: Number(editForm.price) });
      toast.success('Curso actualizado');
      setIsModalOpen(false);
      loadCourses();
    } catch {
      toast.error('Error al actualizar');
    }
  };

  // NUEVO: Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await coursesService.delete(deleteId);
      toast.success('Curso eliminado');
      setIsDeleteModalOpen(false);
      setDeleteId(null);
      loadCourses();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const inputClass =
    'bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue w-full';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Panel del Instructor
      </h1>

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col max-w-md gap-4 mb-8"
      >
        <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
          Crear Nuevo Curso
        </h2>
        <input
          className={inputClass}
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className={inputClass}
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <div className="flex gap-4">
          <select
            className={inputClass}
            value={form.modality}
            onChange={(e) =>
              setForm({ ...form, modality: e.target.value as CourseInput['modality'] })
            }
          >
            <option value="VIRTUAL">Virtual</option>
            <option value="ONSITE">Presencial</option>
            <option value="HYBRID">Híbrido</option>
          </select>
          <select
            className={inputClass}
            value={form.duration}
            onChange={(e) =>
              setForm({ ...form, duration: e.target.value as CourseInput['duration'] })
            }
          >
            <option value="EIGHT">8 horas</option>
            <option value="TEN">10 horas</option>
            <option value="SIXTEEN">16 horas</option>
            <option value="TWENTY">20 horas</option>
          </select>
        </div>
        <input
          type="number"
          className={inputClass}
          placeholder="Precio (COP)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          required
        />
        <button
          type="submit"
          className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
        >
          Crear Curso
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4 text-lms-text dark:text-lms-text-dark">Mis Cursos</h2>
      <div className="space-y-4">
        {courses.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-lms-dark-card p-4 rounded-xl border border-lms-border dark:border-gray-700 shadow-sm flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold text-lms-text dark:text-lms-text-dark">{c.title}</h3>
              <p className="text-sm text-lms-muted">
                Estado: <span className="font-semibold">{c.status}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {c.status === 'DRAFT' && (
                <button
                  onClick={() => coursesService.submitForReview(c.id).then(loadCourses)}
                  className="text-xs bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark px-3 py-2 rounded-lg border border-lms-border"
                >
                  Enviar a Revisión
                </button>
              )}
              {user?.role === 'ADMIN' && c.status === 'PENDING_REVIEW' && (
                <button
                  onClick={() => handleApprove(c.id)}
                  className="text-xs bg-vs-green text-white px-3 py-2 rounded-lg hover:bg-green-600"
                >
                  Aprobar
                </button>
              )}
              <button
                onClick={() => openEditModal(c)}
                className="text-xs bg-vs-yellow text-black px-3 py-2 rounded-lg hover:bg-yellow-500 font-semibold"
              >
                Editar
              </button>
              {/* BOTÓN ELIMINAR ABRE MODAL */}
              <button
                onClick={() => {
                  setDeleteId(c.id);
                  setIsDeleteModalOpen(true);
                }}
                className="text-xs bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-semibold"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EDICIÓN */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Curso">
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-lms-muted block mb-1">Título</label>
            <input
              className={inputClass}
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Descripción</label>
            <textarea
              className={inputClass}
              rows={3}
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-lms-muted block mb-1">Precio (COP)</label>
            <input
              type="number"
              className={inputClass}
              value={editForm.price || 0}
              onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
              required
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE ELIMINACIÓN */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Curso"
      >
        <div className="flex flex-col gap-6">
          <p className="text-lms-text dark:text-lms-text-dark">
            ¿Estás seguro de que quieres eliminar este curso? Se ocultará del sistema y no se podrán
            matricular nuevos estudiantes.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border py-2 rounded-lg font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
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
