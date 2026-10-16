import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import { sessionsService, type SessionView } from '../services/sessions.service';
import { assessmentsService, type EntregaPendienteView } from '../services/assessments.service';
import { enrollmentsService, type PagoPendienteView } from '../services/enrollments.service';
import { formatFechaHora } from '../utils/format';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const ENLACE_TARJETA =
  'rounded-xl border border-lms-border bg-white p-4 text-left shadow-sm transition-colors hover:bg-lms-bg dark:border-gray-700 dark:bg-lms-dark-card dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

// Inicio del docente: lo que toca hoy (clases, entregas por calificar y pagos
// por confirmar) en vez de una pantalla vacía.
export function CampusDocentePage() {
  const { user } = useAuth();
  const [sesiones, setSesiones] = useState<SessionView[]>([]);
  const [entregas, setEntregas] = useState<EntregaPendienteView[]>([]);
  const [pagos, setPagos] = useState<PagoPendienteView[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    Promise.all([
      sessionsService.getMySessions().catch(() => [] as SessionView[]),
      assessmentsService.getPendientes().catch(() => [] as EntregaPendienteView[]),
      enrollmentsService.getPendientesDePago().catch(() => [] as PagoPendienteView[]),
    ])
      .then(([listaSesiones, listaEntregas, listaPagos]) => {
        if (!vigente) return;
        setSesiones(listaSesiones);
        setEntregas(listaEntregas);
        setPagos(listaPagos);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const ahora = Date.now();
  const proximas = sesiones
    .filter((sesion) => new Date(sesion.startTime).getTime() >= ahora)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  const confirmarPago = async (enrollmentId: string) => {
    setConfirmando(enrollmentId);
    try {
      await enrollmentsService.confirmPayment(enrollmentId);
      toast.success('Pago confirmado');
      setPagos((previos) => previos.filter((pago) => pago.id !== enrollmentId));
    } catch (err) {
      toast.error(
        isAxiosError<{ message: string }>(err)
          ? (err.response?.data?.message ?? 'No pudimos confirmar el pago.')
          : 'No pudimos confirmar el pago.',
      );
    } finally {
      setConfirmando(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Hola{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {cargando
            ? 'Cargando tu día…'
            : `${proximas.length} ${proximas.length === 1 ? 'clase próxima' : 'clases próximas'} · ${entregas.length} ${entregas.length === 1 ? 'entrega por calificar' : 'entregas por calificar'} · ${pagos.length} ${pagos.length === 1 ? 'pago por confirmar' : 'pagos por confirmar'}`}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/instructor" className={ENLACE_TARJETA}>
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">Mis cursos</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Crear, editar y enviar a revisión
          </p>
        </Link>
        <Link to="/manage" className={ENLACE_TARJETA}>
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Cohortes y sesiones
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Fechas, cupos y materiales de cada sesión
          </p>
        </Link>
        <Link to="/progreso" className={ENLACE_TARJETA}>
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Avance del grupo
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Quién puede certificarse y quién va atrasado
          </p>
        </Link>
        <Link to="/attendance" className={ENLACE_TARJETA}>
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Pasar asistencia
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Genera el código QR de la sesión
          </p>
        </Link>
      </div>

      <section aria-labelledby="titulo-clases" className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="titulo-clases"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Tus próximas clases
          </h2>
          <Link to="/attendance" className={BOTON_SECUNDARIO}>
            Pasar asistencia
          </Link>
        </div>

        {cargando ? (
          <p role="status" className="mt-3 text-sm text-lms-muted dark:text-gray-400">
            Cargando sesiones…
          </p>
        ) : proximas.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            No tienes sesiones programadas por delante. Puedes añadirlas en{' '}
            <Link
              to="/manage"
              className="font-medium text-blue-700 hover:underline dark:text-vs-blue"
            >
              Cohortes y sesiones
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {proximas.map((sesion) => (
              <li
                key={sesion.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">
                    {sesion.cohort.course.title} · {sesion.title}
                  </p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {formatFechaHora(sesion.startTime)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-entregas" className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="titulo-entregas"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Entregas por calificar
          </h2>
          <Link to="/instructor" className={BOTON_SECUNDARIO}>
            Elegir curso y calificar
          </Link>
        </div>

        {entregas.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Estás al día: no hay entregas pendientes de calificación.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entregas.slice(0, 8).map((entrega) => (
              <li
                key={entrega.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-lms-text dark:text-lms-text-dark">
                    {entrega.user.firstName} {entrega.user.lastName} · {entrega.assessment.title}
                  </p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {entrega.assessment.cohort.course.title} · entregada el{' '}
                    {formatFechaHora(entrega.createdAt)}
                  </p>
                </div>
                <Link to="/instructor" className={BOTON_SECUNDARIO}>
                  Calificar
                </Link>
              </li>
            ))}
            {entregas.length > 8 && (
              <li className="text-sm text-gray-600 dark:text-gray-400">
                y {entregas.length - 8} más…
              </li>
            )}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-pagos" className={PANEL}>
        <h2
          id="titulo-pagos"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Pagos por confirmar
        </h2>

        {pagos.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            No hay prematrículas esperando confirmación de pago.
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
                    {pago.estudiante.firstName} {pago.estudiante.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-lms-muted dark:text-gray-400">
                    {pago.cohorte.courseTitle} · {pago.cohorte.name}
                    {pago.pago ? ` · ref. ${pago.pago.reference} · ${pago.pago.method}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void confirmarPago(pago.id)}
                  disabled={confirmando === pago.id}
                  className={BOTON_PRIMARIO}
                >
                  {confirmando === pago.id ? 'Confirmando…' : 'Confirmar pago'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
