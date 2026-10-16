import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { CourseCard } from '../components/CourseCard';
import { CourseCardSkeleton } from '../components/CourseCardSkeleton';
import {
  CourseFilters,
  FILTROS_CATALOGO_INICIALES,
  type FiltrosCatalogo,
} from '../components/CourseFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { coursesService, type PublishedParams } from '../services/courses.service';
import type { CourseView } from '@elprofeclei/shared';

const CURSOS_POR_PAGINA = 9;
const ESPERA_BUSQUEDA_MS = 300;
const AVISO_DEMORA_MS = 12000;
const ESQUELETOS_INICIALES = 6;
const REJILLA = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

const CLASE_FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-bg';

const BOTON_PRIMARIO = `inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:bg-vs-blue/90 ${CLASE_FOCO}`;

const BOTON_SECUNDARIO = `inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text hover:bg-lms-bg motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 ${CLASE_FOCO}`;

// "Sin filtros" es la consulta base del catálogo: solo entonces el total recibido
// es el total de cursos publicados y sirve para la línea de contexto del encabezado.
const consultaVacia = (filtros: FiltrosCatalogo, texto: string): boolean =>
  texto === '' && filtros.modality === '' && filtros.duration === '' && filtros.price === '';

function construirParams(filtros: FiltrosCatalogo, texto: string, pagina: number): PublishedParams {
  const params: PublishedParams = { sort: filtros.sort, page: pagina, pageSize: CURSOS_POR_PAGINA };

  if (texto !== '') params.q = texto;
  if (filtros.modality !== '') params.modality = filtros.modality;
  if (filtros.duration !== '') params.duration = filtros.duration;
  if (filtros.price !== '') params.price = filtros.price;

  return params;
}

const textoContador = (cargados: number, total: number): string => {
  if (cargados < total) return `${cargados} de ${total} cursos`;
  if (total === 1) return '1 curso';
  return `${total} cursos`;
};

const contextoDeCatalogo = (totalCatalogo: number | null): string => {
  if (totalCatalogo === null) return 'Explora los cursos publicados en la plataforma.';
  if (totalCatalogo === 0) return 'Aún no hay cursos publicados en la plataforma.';
  if (totalCatalogo === 1) return '1 curso publicado en la plataforma.';
  return `${totalCatalogo} cursos publicados en la plataforma.`;
};

function IconoBuscar() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
      <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoEquis() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function IconoAlerta() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      />
    </svg>
  );
}

function IconoCatalogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5ZM4 5.5v16M9 8h6"
      />
    </svg>
  );
}

// Panel común de los estados vacío y error: mismo tono de superficie que las tarjetas
function PanelEstado({
  tono,
  titulo,
  detalle,
  accion,
}: {
  tono: 'vacio' | 'error';
  titulo: string;
  detalle: string;
  accion: ReactNode;
}) {
  const estiloIcono =
    tono === 'error'
      ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
      : 'bg-lms-bg text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  return (
    <div
      role={tono === 'error' ? 'alert' : undefined}
      className="rounded-xl border border-lms-border bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
    >
      <span
        aria-hidden="true"
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${estiloIcono}`}
      >
        {tono === 'error' ? <IconoAlerta /> : <IconoCatalogo />}
      </span>

      <h3 className="mt-4 text-base font-semibold text-lms-text dark:text-lms-text-dark">
        {titulo}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">{detalle}</p>
      <div className="mt-5">{accion}</div>
    </div>
  );
}

function PanelVacio({
  busqueda,
  hayFiltros,
  onLimpiar,
  onActualizar,
}: {
  busqueda: string;
  hayFiltros: boolean;
  onLimpiar: () => void;
  onActualizar: () => void;
}) {
  // Vacío con filtros: se explica qué hacer y se ofrece limpiarlos
  if (hayFiltros) {
    return (
      <PanelEstado
        tono="vacio"
        titulo={
          busqueda !== ''
            ? `No encontramos cursos para «${busqueda}»`
            : 'No encontramos cursos con estos filtros'
        }
        detalle={
          busqueda !== ''
            ? 'Revisa la palabra buscada o limpia los filtros para ver todo el catálogo.'
            : 'Prueba con otra modalidad, duración o precio, o limpia los filtros para ver todo el catálogo.'
        }
        accion={
          <button type="button" onClick={onLimpiar} className={BOTON_PRIMARIO}>
            Limpiar filtros
          </button>
        }
      />
    );
  }

  // Vacío sin filtros: el catálogo está vacío de verdad, no hay nada que limpiar
  return (
    <PanelEstado
      tono="vacio"
      titulo="Todavía no hay cursos publicados"
      detalle="Cuando el equipo publique un curso, aparecerá aquí con su precio, duración y próximas cohortes."
      accion={
        <button type="button" onClick={onActualizar} className={BOTON_SECUNDARIO}>
          Actualizar catálogo
        </button>
      }
    />
  );
}

export function CoursesPage() {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(FILTROS_CATALOGO_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  const busquedaAplicada = useDebouncedValue(busqueda, ESPERA_BUSQUEDA_MS);
  const [cursos, setCursos] = useState<CourseView[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCatalogo, setTotalCatalogo] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [errorAlCargarMas, setErrorAlCargarMas] = useState(false);
  const [tardando, setTardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const ultimaSolicitud = useRef(0);
  const campoBusqueda = useRef<HTMLInputElement>(null);

  // Cada combinación de filtros/búsqueda (o reintento) recarga la primera página.
  // La guarda descarta respuestas de consultas ya obsoletas.
  useEffect(() => {
    const solicitud = ultimaSolicitud.current + 1;
    ultimaSolicitud.current = solicitud;

    const texto = busquedaAplicada.trim();
    const params = construirParams(filtros, texto, 1);
    const consultaSinFiltros = consultaVacia(filtros, texto);

    setCargando(true);
    setError(false);
    setErrorAlCargarMas(false);
    setTardando(false);
    const avisoDemora = window.setTimeout(() => {
      if (ultimaSolicitud.current === solicitud) setTardando(true);
    }, AVISO_DEMORA_MS);

    coursesService
      .getPublished(params)
      .then((resultado) => {
        if (ultimaSolicitud.current !== solicitud) return;

        setCursos(resultado.cursos);
        setTotal(resultado.total);
        setPagina(resultado.page);
        if (consultaSinFiltros) setTotalCatalogo(resultado.total);
      })
      .catch(() => {
        if (ultimaSolicitud.current !== solicitud) return;

        setCursos([]);
        setTotal(0);
        setError(true);
      })
      .finally(() => {
        window.clearTimeout(avisoDemora);
        if (ultimaSolicitud.current !== solicitud) return;

        setCargando(false);
        setTardando(false);
      });

    return () => window.clearTimeout(avisoDemora);
  }, [filtros, busquedaAplicada, intento]);

  const cargarMas = useCallback(async () => {
    const solicitud = ultimaSolicitud.current;
    setCargandoMas(true);
    setErrorAlCargarMas(false);

    try {
      const resultado = await coursesService.getPublished(
        construirParams(filtros, busquedaAplicada.trim(), pagina + 1),
      );
      if (ultimaSolicitud.current !== solicitud) return;

      // Acumula sin duplicar: si el backend repite un curso en el borde de página,
      // el listado no muestra dos veces la misma tarjeta.
      setCursos((previos) => {
        const vistos = new Set(previos.map((curso) => curso.id));
        return [...previos, ...resultado.cursos.filter((curso) => !vistos.has(curso.id))];
      });
      setTotal((previoTotal) => Math.max(previoTotal, resultado.total));
      setPagina(resultado.page);
    } catch {
      if (ultimaSolicitud.current !== solicitud) return;

      setErrorAlCargarMas(true);
      toast.error('No pudimos cargar más cursos. Inténtalo de nuevo.');
    } finally {
      setCargandoMas(false);
    }
  }, [filtros, busquedaAplicada, pagina]);

  const cambiarFiltros = useCallback((parcial: Partial<FiltrosCatalogo>) => {
    setFiltros((previos) => ({ ...previos, ...parcial }));
  }, []);

  const limpiarTodo = useCallback(() => {
    setFiltros(FILTROS_CATALOGO_INICIALES);
    setBusqueda('');
    // El botón que dispara la limpieza desaparece al limpiar: devolvemos el foco
    // al buscador para no dejarlo en el vacío.
    campoBusqueda.current?.focus();
  }, []);

  const reintentar = useCallback(() => setIntento((numero) => numero + 1), []);

  const textoBusqueda = busqueda.trim();
  const hayFiltrosActivos = !consultaVacia(filtros, textoBusqueda);
  const hayMas = cursos.length < total;
  const mostrandoResultados = !error && !(cargando && cursos.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
            Catálogo de cursos
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {contextoDeCatalogo(totalCatalogo)}
          </p>
        </div>

        <form
          role="search"
          onSubmit={(evento) => evento.preventDefault()}
          className="w-full max-w-xl"
        >
          <label
            htmlFor="busqueda-cursos"
            className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
          >
            Buscar cursos
          </label>

          <div className="relative mt-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            >
              <IconoBuscar />
            </span>

            <input
              id="busqueda-cursos"
              ref={campoBusqueda}
              type="text"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej.: React, inglés, finanzas"
              autoComplete="off"
              className={`h-11 w-full rounded-lg border border-gray-300 bg-white pr-10 pl-10 text-sm text-lms-text placeholder:text-gray-500 motion-safe:transition-colors dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:placeholder:text-gray-400 ${CLASE_FOCO}`}
            />

            {busqueda !== '' && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  setBusqueda('');
                  campoBusqueda.current?.focus();
                }}
                className={`absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 hover:bg-lms-bg hover:text-lms-text dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-lms-text-dark ${CLASE_FOCO}`}
              >
                <IconoEquis />
              </button>
            )}
          </div>
        </form>
      </header>

      <section aria-labelledby="titulo-filtros">
        {/* Encabezado oculto: mantiene el orden h1 → h2 → h3 de las tarjetas */}
        <h2 id="titulo-filtros" className="sr-only">
          Filtros y orden
        </h2>
        <CourseFilters
          filtros={filtros}
          onCambiar={cambiarFiltros}
          onLimpiar={limpiarTodo}
          mostrarLimpiar={hayFiltrosActivos}
        />
      </section>

      <section aria-labelledby="titulo-resultados">
        <h2 id="titulo-resultados" className="sr-only">
          Resultados
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            aria-live="polite"
            className="min-h-[1.25rem] text-sm text-gray-600 dark:text-gray-400"
          >
            {mostrandoResultados ? textoContador(cursos.length, total) : ''}
          </p>

          {cargando && cursos.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Actualizando resultados…</p>
          )}
        </div>

        <p role="status" className="sr-only">
          {cargando ? 'Cargando cursos…' : ''}
        </p>

        {tardando && !error && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
            El catálogo está tardando más de lo habitual.
            <button type="button" onClick={reintentar} className={CLASE_FOCO}>
              <span className="font-semibold text-blue-700 underline dark:text-vs-blue">
                Reintentar la consulta
              </span>
            </button>
          </p>
        )}

        {error ? (
          <div className="mt-4">
            <PanelEstado
              tono="error"
              titulo="No pudimos cargar el catálogo"
              detalle="No obtuvimos respuesta del servidor. Revisa tu conexión e inténtalo de nuevo."
              accion={
                <button type="button" onClick={reintentar} className={BOTON_PRIMARIO}>
                  Reintentar
                </button>
              }
            />
          </div>
        ) : cargando && cursos.length === 0 ? (
          <div className={`mt-4 ${REJILLA}`} aria-hidden="true">
            {Array.from({ length: ESQUELETOS_INICIALES }, (_, indice) => (
              <CourseCardSkeleton key={indice} />
            ))}
          </div>
        ) : cursos.length === 0 ? (
          <div className="mt-4">
            <PanelVacio
              busqueda={textoBusqueda}
              hayFiltros={hayFiltrosActivos}
              onLimpiar={limpiarTodo}
              onActualizar={reintentar}
            />
          </div>
        ) : (
          <>
            <div className={`mt-4 ${REJILLA}`} aria-busy={cargando}>
              {cursos.map((curso) => (
                <CourseCard key={curso.id} curso={curso} />
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {errorAlCargarMas && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                  No pudimos cargar más cursos. Inténtalo de nuevo.
                </p>
              )}

              {hayMas ? (
                <button
                  type="button"
                  onClick={cargarMas}
                  disabled={cargandoMas || cargando}
                  className={BOTON_SECUNDARIO}
                >
                  {cargandoMas ? 'Cargando más cursos…' : 'Cargar más cursos'}
                </button>
              ) : (
                total > CURSOS_POR_PAGINA && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Has visto los {total} cursos del catálogo.
                  </p>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
