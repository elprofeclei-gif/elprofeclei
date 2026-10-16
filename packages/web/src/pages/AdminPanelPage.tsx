import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type { CourseView } from '@elprofeclei/shared';
import { coursesService } from '../services/courses.service';
import { enrollmentsService, type PagoPendienteView } from '../services/enrollments.service';
import {
  usersService,
  etiquetaRol,
  type RolUsuario,
  type UsuarioAdminView,
} from '../services/users.service';
import { formatCOP } from '../utils/adminFormat';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

const ENTRADA_ADMIN =
  'mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

const mensajeDeError = (err: unknown, alterno: string) =>
  isAxiosError<{ message: string }>(err) ? (err.response?.data?.message ?? alterno) : alterno;

// Panel de administración: lo que solo el ADMIN puede resolver (aprobar cursos,
// confirmar pagos) más los accesos de gestión que ya existen.
export function AdminPanelPage() {
  const [cursos, setCursos] = useState<CourseView[]>([]);
  const [pagos, setPagos] = useState<PagoPendienteView[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdminView[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const [listaCursos, listaPagos] = await Promise.all([
        coursesService.getMyCourses() as Promise<CourseView[]>,
        enrollmentsService.getPendientesDePago().catch(() => [] as PagoPendienteView[]),
      ]);
      setCursos(Array.isArray(listaCursos) ? listaCursos : []);
      setPagos(listaPagos);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos cargar el panel.'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const porAprobar = cursos.filter((curso) => curso.status === 'PENDING_REVIEW');

  const aprobar = async (cursoId: string) => {
    setProcesando(cursoId);
    try {
      await coursesService.approve(cursoId);
      toast.success('Curso publicado');
      setCursos((previos) =>
        previos.map((curso) => (curso.id === cursoId ? { ...curso, status: 'PUBLISHED' } : curso)),
      );
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos aprobar el curso.'));
    } finally {
      setProcesando(null);
    }
  };

  const confirmarPago = async (enrollmentId: string) => {
    setProcesando(enrollmentId);
    try {
      await enrollmentsService.confirmPayment(enrollmentId);
      toast.success('Pago confirmado');
      setPagos((previos) => previos.filter((pago) => pago.id !== enrollmentId));
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos confirmar el pago.'));
    } finally {
      setProcesando(null);
    }
  };

  const cargarUsuarios = async (termino = '') => {
    setCargandoUsuarios(true);
    try {
      const lista = await usersService.listar(
        termino.trim() === '' ? undefined : { q: termino.trim() },
      );
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos cargar los usuarios.'));
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const cambiarRol = async (id: string, rol: RolUsuario) => {
    setProcesando(id);
    try {
      await usersService.cambiarRol(id, rol);
      toast.success(
        rol === 'INSTRUCTOR'
          ? 'Usuario promovido a instructor'
          : rol === 'ADMIN'
            ? 'Usuario promovido a administrador'
            : 'Usuario vuelto a estudiante',
      );
      setUsuarios((previos) => previos.map((u) => (u.id === id ? { ...u, role: rol } : u)));
    } catch (err) {
      toast.error(mensajeDeError(err, 'No pudimos cambiar el rol.'));
    } finally {
      setProcesando(null);
    }
  };

  useEffect(() => {
    void cargarUsuarios();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Administración
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {cargando
            ? 'Cargando el estado de la plataforma…'
            : `${porAprobar.length} ${porAprobar.length === 1 ? 'curso esperando aprobación' : 'cursos esperando aprobación'} · ${pagos.length} ${pagos.length === 1 ? 'pago pendiente' : 'pagos pendientes'}`}
        </p>
      </header>

      <section aria-labelledby="titulo-aprobar" className={PANEL}>
        <h2
          id="titulo-aprobar"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Cursos por aprobar
        </h2>

        {cargando ? (
          <p role="status" className="mt-3 text-sm text-lms-muted dark:text-gray-400">
            Cargando cursos…
          </p>
        ) : porAprobar.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            No hay cursos esperando revisión.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {porAprobar.map((curso) => (
              <li
                key={curso.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">{curso.title}</p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {curso.instructor.firstName} {curso.instructor.lastName} · {curso.modality} ·{' '}
                    {formatCOP(curso.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void aprobar(curso.id)}
                  disabled={procesando === curso.id}
                  className={BOTON_PRIMARIO}
                >
                  {procesando === curso.id ? 'Publicando…' : 'Aprobar y publicar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-pagos-admin" className={PANEL}>
        <h2
          id="titulo-pagos-admin"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Pagos por confirmar
        </h2>

        {pagos.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            No hay prematrículas esperando confirmación.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pagos.map((pago) => (
              <li
                key={pago.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">
                    {pago.estudiante.firstName} {pago.estudiante.lastName} ·{' '}
                    {pago.cohorte.courseTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {pago.cohorte.name}
                    {pago.pago
                      ? ` · ref. ${pago.pago.reference} · ${pago.pago.method} · ${formatCOP(pago.pago.amount)}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void confirmarPago(pago.id)}
                  disabled={procesando === pago.id}
                  className={BOTON_PRIMARIO}
                >
                  {procesando === pago.id ? 'Confirmando…' : 'Confirmar pago'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-gestion" className={PANEL}>
        <h2
          id="titulo-gestion"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Gestión
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/coupons" className={BOTON_SECUNDARIO}>
            Cupones y becas
          </Link>
          <Link to="/manage" className={BOTON_SECUNDARIO}>
            Cohortes y sesiones
          </Link>
          <Link to="/progreso" className={BOTON_SECUNDARIO}>
            Avance del grupo
          </Link>
          <Link to="/instructor" className={BOTON_SECUNDARIO}>
            Todos los cursos
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          Pendiente de interfaz: gestión de usuarios y de sedes (hoy solo por API). Los umbrales de
          certificación son globales; por cohorte necesitan la migración documentada en{' '}
          <span className="font-code">docs/pendiente-esquema-avanzado.md</span>.
        </p>
      </section>

      <section aria-labelledby="titulo-usuarios" className={PANEL}>
        <h2
          id="titulo-usuarios"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Usuarios y docentes
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Así se da de alta un docente: la persona crea su cuenta desde «Crear cuenta» del
          marketplace y aquí la promueves a Instructor.
        </p>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            void cargarUsuarios(busqueda);
          }}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="buscar-usuario"
              className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
            >
              Buscar por nombre o correo
            </label>
            <input
              id="buscar-usuario"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              className={ENTRADA_ADMIN}
              placeholder="ana@correo.com"
            />
          </div>
          <button type="submit" className={BOTON_SECUNDARIO}>
            Buscar
          </button>
        </form>

        {cargandoUsuarios ? (
          <p role="status" className="mt-4 text-sm text-lms-muted dark:text-gray-400">
            Cargando usuarios…
          </p>
        ) : usuarios.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            No hay usuarios que coincidan con la búsqueda.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {usuarios.map((usuario) => (
              <li
                key={usuario.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">
                    {usuario.firstName} {usuario.lastName}{' '}
                    <span className="text-xs font-normal text-lms-muted dark:text-gray-400">
                      ({usuario.email})
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {etiquetaRol(usuario.role)} · {usuario._count.enrollments} matrículas ·{' '}
                    {usuario._count.coursesAsInstructor} cursos como instructor
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {usuario.role !== 'INSTRUCTOR' && usuario.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => void cambiarRol(usuario.id, 'INSTRUCTOR')}
                      disabled={procesando === usuario.id}
                      className={BOTON_SECUNDARIO}
                    >
                      Hacer instructor
                    </button>
                  )}
                  {usuario.role !== 'STUDENT' && (
                    <button
                      type="button"
                      onClick={() => void cambiarRol(usuario.id, 'STUDENT')}
                      disabled={procesando === usuario.id}
                      className={BOTON_SECUNDARIO}
                    >
                      Volver a estudiante
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          Un cambio de rol aplica a la siguiente vez que la persona inicie sesión (el token en curso
          conserva el rol anterior hasta que se renueve).
        </p>
      </section>
    </div>
  );
}
