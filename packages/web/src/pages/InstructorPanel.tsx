import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { CourseView } from '@elprofeclei/shared';
import { coursesService } from '../services/courses.service';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';
import { CourseFormModal } from '../components/CourseFormModal';
import { formatCOP } from '../utils/format';

// --- Catálogos de presentación (el texto siempre acompaña al color) ---------

const ETIQUETAS_ESTADO: Record<string, { etiqueta: string; clases: string; punto: string }> = {
  DRAFT: {
    etiqueta: 'Borrador',
    clases: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    punto: 'bg-gray-500 dark:bg-gray-300',
  },
  PENDING_REVIEW: {
    etiqueta: 'En revisión',
    clases: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    punto: 'bg-vs-yellow',
  },
  PUBLISHED: {
    etiqueta: 'Publicado',
    clases: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    punto: 'bg-vs-green',
  },
};

const MODALIDADES: Record<string, string> = {
  VIRTUAL: 'Virtual',
  ONSITE: 'Presencial',
  HYBRID: 'Híbrido',
};

const DURACION_HORAS: Record<string, number> = {
  EIGHT: 8,
  TEN: 10,
  SIXTEEN: 16,
  TWENTY: 20,
};

const plural = (n: number, singular: string, formaPlural = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : formaPlural}`;

const mensajeDeError = (err: unknown, inesperado: string): string => {
  if (isAxiosError<{ message: string }>(err)) {
    return (
      err.response?.data?.message ??
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
  }
  return inesperado;
};

// --- Clases compartidas ------------------------------------------------------

const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-lms-bg ' +
  'dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-card';

const BOTON_PRIMARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:brightness-110 ${FOCO}`;

const BOTON_SECUNDARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-lms-border bg-white px-5 text-sm font-medium text-lms-text transition-colors motion-reduce:transition-none hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`;

const BOTON_DESTRUCTIVO =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-lms-dark-card';

const claseBotonTarjeta = (variante: string): string =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 ${FOCO} ${variante}`;

const TARJETA_NEUTRO =
  'border-lms-border bg-white text-lms-text hover:bg-lms-bg dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark dark:hover:bg-gray-700';
const TARJETA_APROBAR =
  'border-green-600/60 bg-white text-green-700 hover:bg-green-50 dark:border-green-400/40 dark:bg-gray-800 dark:text-green-300 dark:hover:bg-gray-700';
const TARJETA_ELIMINAR =
  'border-red-600/60 bg-white text-red-700 hover:bg-red-50 dark:border-red-400/40 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700';

// --- Iconos SVG monolínea (decorativos, aria-hidden) -------------------------

type PropsIcono = { className?: string };

function Icono({ className = 'h-5 w-5', children }: PropsIcono & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const IconoPlus = (p: PropsIcono) => (
  <Icono {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icono>
);

const IconoEditar = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </Icono>
);

const IconoEnviar = (p: PropsIcono) => (
  <Icono {...p}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icono>
);

const IconoAprobar = (p: PropsIcono) => (
  <Icono {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Icono>
);

const IconoEliminar = (p: PropsIcono) => (
  <Icono {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Icono>
);

const IconoReintentar = (p: PropsIcono) => (
  <Icono {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Icono>
);

const IconoAlerta = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icono>
);

const IconoLibro = (p: PropsIcono) => (
  <Icono {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icono>
);

// --- Piezas de la lista ------------------------------------------------------

type CargaCursos =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'lista'; cursos: CourseView[] };

type AccionCurso = 'revisar' | 'aprobar' | 'eliminar';

function InsigniaEstado({ estado }: { estado: string }) {
  const info = ETIQUETAS_ESTADO[estado];
  const etiqueta = info?.etiqueta ?? estado;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        info?.clases ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${info?.punto ?? 'bg-gray-500'}`}
      />
      {etiqueta}
    </span>
  );
}

// Esqueleto que imita la tarjeta final para que la carga no salte de layout
function TarjetaSkeleton() {
  const bloque = 'animate-pulse rounded bg-gray-200 dark:bg-gray-700 motion-reduce:animate-none';
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-4 rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className={`${bloque} h-5 w-2/5`} />
            <div className={`${bloque} h-5 w-20 rounded-full`} />
          </div>
          <div className={`${bloque} mt-2.5 h-4 w-full`} />
          <div className={`${bloque} mt-1.5 h-4 w-3/4`} />
          <div className={`${bloque} mt-2.5 h-4 w-28`} />
        </div>
        <div className={`${bloque} h-6 w-24 sm:ml-4`} />
      </div>
      <div className="flex gap-2 border-t border-lms-border pt-4 dark:border-gray-700">
        <div className={`${bloque} h-9 w-24`} />
        <div className={`${bloque} h-9 w-36`} />
        <div className={`${bloque} h-9 w-28`} />
      </div>
    </div>
  );
}

function TarjetaCurso(props: {
  curso: CourseView;
  esAdmin: boolean;
  ocupado: boolean;
  onEditar: () => void;
  onEnviarRevisar: () => void;
  onAprobar: () => void;
  onEliminar: () => void;
}) {
  const { curso, esAdmin, ocupado, onEditar, onEnviarRevisar, onAprobar, onEliminar } = props;

  // /courses/mine trae el precio como string de Prisma Decimal: se normaliza
  const precio = Number(curso.price);
  const modalidad = MODALIDADES[curso.modality] ?? curso.modality;
  const horas = DURACION_HORAS[curso.duration];

  return (
    <article
      aria-labelledby={`curso-${curso.id}-titulo`}
      className="flex flex-col gap-4 rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3
              id={`curso-${curso.id}-titulo`}
              className="text-base font-semibold text-lms-text dark:text-lms-text-dark sm:text-lg"
            >
              {curso.title}
            </h3>
            <InsigniaEstado estado={curso.status} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-lms-muted dark:text-gray-400">
            {curso.description}
          </p>
          <p className="mt-2 text-sm text-lms-muted dark:text-gray-400">
            {modalidad}
            {horas !== undefined ? ` · ${horas} h` : ''}
            {esAdmin && curso.instructor?.firstName
              ? ` · Instructor: ${curso.instructor.firstName} ${curso.instructor.lastName}`
              : ''}
          </p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-lms-text dark:text-lms-text-dark sm:ml-4 sm:text-right">
          {precio === 0 ? (
            <span className="text-green-700 dark:text-green-300">Gratis</span>
          ) : (
            formatCOP(precio)
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-lms-border pt-4 dark:border-gray-700">
        <button
          type="button"
          onClick={onEditar}
          disabled={ocupado}
          className={claseBotonTarjeta(TARJETA_NEUTRO)}
        >
          <IconoEditar className="h-4 w-4" />
          Editar
        </button>
        {curso.status === 'DRAFT' && (
          <button
            type="button"
            onClick={onEnviarRevisar}
            disabled={ocupado}
            className={claseBotonTarjeta(TARJETA_NEUTRO)}
          >
            <IconoEnviar className="h-4 w-4" />
            Enviar a revisión
          </button>
        )}
        {esAdmin && curso.status === 'PENDING_REVIEW' && (
          <button
            type="button"
            onClick={onAprobar}
            disabled={ocupado}
            className={claseBotonTarjeta(TARJETA_APROBAR)}
          >
            <IconoAprobar className="h-4 w-4" />
            Aprobar
          </button>
        )}
        <button
          type="button"
          onClick={onEliminar}
          disabled={ocupado}
          className={claseBotonTarjeta(TARJETA_ELIMINAR)}
        >
          <IconoEliminar className="h-4 w-4" />
          Eliminar
        </button>
      </div>
    </article>
  );
}

// --- Pantalla -----------------------------------------------------------------

export function InstructorPanel() {
  const { user } = useAuth();
  const esAdmin = user?.role === 'ADMIN';

  const [carga, setCarga] = useState<CargaCursos>({ fase: 'cargando' });
  const [formAbierto, setFormAbierto] = useState(false);
  const [cursoEditando, setCursoEditando] = useState<CourseView | null>(null);
  const [cursoPorEliminar, setCursoPorEliminar] = useState<CourseView | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<{ id: string; tipo: AccionCurso } | null>(
    null,
  );

  // Silencioso = refresco tras una acción: mantiene la lista visible, sin esqueleto
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarga({ fase: 'cargando' });
    try {
      const cursos = await coursesService.getMyCourses();
      setCarga({ fase: 'lista', cursos });
    } catch (err) {
      setCarga({
        fase: 'error',
        mensaje: mensajeDeError(err, 'Ocurrió un error inesperado al cargar tus cursos.'),
      });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const conteo = useMemo(() => {
    const cursos = carga.fase === 'lista' ? carga.cursos : [];
    return {
      total: cursos.length,
      publicados: cursos.filter((c) => c.status === 'PUBLISHED').length,
      enRevision: cursos.filter((c) => c.status === 'PENDING_REVIEW').length,
      borradores: cursos.filter((c) => c.status === 'DRAFT').length,
    };
  }, [carga]);

  const lineaContexto =
    carga.fase === 'lista'
      ? `${esAdmin ? 'Cursos de la plataforma' : 'Tus cursos'}: ${plural(
          conteo.total,
          'curso',
        )} · ${plural(conteo.publicados, 'publicado')} · ${conteo.enRevision} en revisión · ${plural(
          conteo.borradores,
          'borrador',
          'borradores',
        )}`
      : carga.fase === 'cargando'
        ? 'Cargando tus cursos…'
        : 'No se pudo cargar el resumen de tus cursos.';

  const ejecutarAccion = async (curso: CourseView, tipo: 'revisar' | 'aprobar') => {
    setAccionEnCurso({ id: curso.id, tipo });
    try {
      if (tipo === 'revisar') {
        await coursesService.submitForReview(curso.id);
        toast.success(`«${curso.title}» fue enviado a revisión`);
      } else {
        await coursesService.approve(curso.id);
        toast.success(`«${curso.title}» fue aprobado y publicado`);
      }
      await cargar(true);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo completar la acción. Inténtalo de nuevo.'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!cursoPorEliminar) return;
    const curso = cursoPorEliminar;
    setAccionEnCurso({ id: curso.id, tipo: 'eliminar' });
    try {
      await coursesService.delete(curso.id);
      toast.success(`«${curso.title}» se ocultó del catálogo`);
      setCursoPorEliminar(null);
      await cargar(true);
    } catch (err) {
      // El modal permanece abierto: se puede reintentar o cancelar
      toast.error(mensajeDeError(err, 'No se pudo eliminar el curso. Inténtalo de nuevo.'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  const abrirCrear = () => {
    setCursoEditando(null);
    setFormAbierto(true);
  };

  const abrirEditar = (curso: CourseView) => {
    setCursoEditando(curso);
    setFormAbierto(true);
  };

  const cursoGuardado = async () => {
    setFormAbierto(false);
    await cargar(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-lms-text dark:text-lms-text-dark sm:text-3xl">
            Panel del Instructor
          </h1>
          <p aria-live="polite" className="mt-1.5 text-sm text-lms-muted dark:text-gray-400">
            {lineaContexto}
          </p>
        </div>
        <button type="button" onClick={abrirCrear} className={`${BOTON_PRIMARIO} shrink-0`}>
          <IconoPlus className="h-5 w-5" />
          Crear curso
        </button>
      </header>

      <section aria-labelledby="mis-cursos">
        <h2
          id="mis-cursos"
          className="mb-4 text-lg font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Mis cursos
        </h2>

        {carga.fase === 'cargando' && (
          <div role="status" className="flex flex-col gap-4">
            <span className="sr-only">Cargando tus cursos…</span>
            {Array.from({ length: 3 }, (_, i) => (
              <TarjetaSkeleton key={i} />
            ))}
          </div>
        )}

        {carga.fase === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-xl border border-lms-border bg-white px-6 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
          >
            <IconoAlerta className="h-10 w-10 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-lms-text dark:text-lms-text-dark">
                No se pudieron cargar tus cursos
              </h3>
              <p className="mt-1.5 text-sm text-lms-muted dark:text-gray-400">{carga.mensaje}</p>
            </div>
            <button
              type="button"
              onClick={() => void cargar()}
              className={`${BOTON_SECUNDARIO} px-6`}
            >
              <IconoReintentar className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        )}

        {carga.fase === 'lista' && carga.cursos.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-lms-border bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-lms-dark-card">
            <IconoLibro className="h-10 w-10 text-lms-muted dark:text-gray-500" />
            <div>
              <h3 className="text-lg font-semibold text-lms-text dark:text-lms-text-dark">
                Aún no tienes cursos
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-lms-muted dark:text-gray-400">
                Crea tu primer curso con título, descripción y precio. Cuando esté listo, envíalo a
                revisión para que aparezca en el catálogo.
              </p>
            </div>
            <button type="button" onClick={abrirCrear} className={BOTON_PRIMARIO}>
              <IconoPlus className="h-5 w-5" />
              Crear mi primer curso
            </button>
          </div>
        )}

        {carga.fase === 'lista' && carga.cursos.length > 0 && (
          <ul className="flex flex-col gap-4">
            {carga.cursos.map((curso) => (
              <li key={curso.id}>
                <TarjetaCurso
                  curso={curso}
                  esAdmin={esAdmin}
                  ocupado={accionEnCurso?.id === curso.id}
                  onEditar={() => abrirEditar(curso)}
                  onEnviarRevisar={() => void ejecutarAccion(curso, 'revisar')}
                  onAprobar={() => void ejecutarAccion(curso, 'aprobar')}
                  onEliminar={() => setCursoPorEliminar(curso)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {formAbierto && (
        <CourseFormModal
          key={cursoEditando?.id ?? 'nuevo'}
          curso={cursoEditando ?? undefined}
          onClose={() => setFormAbierto(false)}
          onSaved={cursoGuardado}
        />
      )}

      <Modal
        isOpen={Boolean(cursoPorEliminar)}
        onClose={() => setCursoPorEliminar(null)}
        title="Eliminar curso"
      >
        <div className="flex flex-col gap-6">
          <p className="text-lms-text dark:text-lms-text-dark">
            ¿Seguro que quieres eliminar{' '}
            <span className="font-semibold">«{cursoPorEliminar?.title}»</span>? El curso se oculta
            del catálogo y de este panel, pero no se borra físicamente: queda desactivado en la base
            de datos.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCursoPorEliminar(null)}
              disabled={accionEnCurso?.tipo === 'eliminar'}
              className={BOTON_SECUNDARIO}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmarEliminar()}
              disabled={accionEnCurso?.tipo === 'eliminar'}
              className={BOTON_DESTRUCTIVO}
            >
              <IconoEliminar className="h-4 w-4" />
              {accionEnCurso?.tipo === 'eliminar' ? 'Eliminando…' : 'Sí, ocultar curso'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
