import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { CourseView } from '@elprofeclei/shared';
import { coursesService } from '../services/courses.service';
import {
  adminService,
  type CohorteAdminView,
  type SessionAdminView,
  type VenueView,
} from '../services/admin.service';
import { BOTON_PRIMARIO } from '../components/cohortes/clases';
import { SelectorCurso } from '../components/cohortes/SelectorCurso';
import { TarjetaCohorte } from '../components/cohortes/TarjetaCohorte';
import { ModalCohorte } from '../components/cohortes/ModalCohorte';
import { ModalSesion } from '../components/cohortes/ModalSesion';
import { ModalConfirmar } from '../components/cohortes/ModalConfirmar';
import { EstadoVacio } from '../components/cohortes/EstadoVacio';
import { EstadoError } from '../components/cohortes/EstadoError';
import { EsqueletoCohortes } from '../components/cohortes/EsqueletoCohortes';
import { extraerErrorApi } from '../components/cohortes/errores';

interface BorradoPendiente {
  tipo: 'cohorte' | 'sesion';
  cohorteId: string;
  sesionId?: string;
  etiqueta: string;
}

// Pantalla de gestión: orquesta datos y estados; cada pieza vive en su componente.
export function ManageCohortsPage() {
  const [cursos, setCursos] = useState<CourseView[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [cohortes, setCohortes] = useState<CohorteAdminView[]>([]);
  const [sesiones, setSesiones] = useState<Record<string, SessionAdminView[]>>({});
  const [sedes, setSedes] = useState<VenueView[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoCohortes, setCargandoCohortes] = useState(false);
  const [cargandoSesiones, setCargandoSesiones] = useState(false);
  const [error, setError] = useState('');
  const [refresco, setRefresco] = useState(0);
  const [borrando, setBorrando] = useState(false);
  const [borradoPendiente, setBorradoPendiente] = useState<BorradoPendiente | null>(null);
  const [modalCohorte, setModalCohorte] = useState<{
    abierto: boolean;
    edicion: CohorteAdminView | null;
  }>({ abierto: false, edicion: null });
  const [modalSesion, setModalSesion] = useState<{
    abierto: boolean;
    cohorteId: string;
    edicion: SessionAdminView | null;
  }>({ abierto: false, cohorteId: '', edicion: null });

  const refrescar = useCallback(() => setRefresco((valor) => valor + 1), []);

  // Cursos del instructor/admin: si aún no hay ninguno, la pantalla lo explica
  useEffect(() => {
    let vigente = true;
    setCargandoCursos(true);
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
        if (!vigente) return;
        setError(extraerErrorApi(err, 'No pudimos cargar tus cursos.').mensaje);
      })
      .finally(() => {
        if (vigente) setCargandoCursos(false);
      });

    return () => {
      vigente = false;
    };
  }, [refresco]);

  // Sedes: se usan para las sesiones presenciales. Si falla, el modal de sesión
  // lo explica en el propio campo en vez de dejar la pantalla sin contexto.
  useEffect(() => {
    let vigente = true;

    adminService
      .getVenues()
      .then((datos) => {
        if (vigente) setSedes(Array.isArray(datos) ? datos : []);
      })
      .catch(() => undefined);

    return () => {
      vigente = false;
    };
  }, []);

  // Cohortes del curso elegido y, después, las sesiones de cada una
  useEffect(() => {
    if (cursoId === '') {
      setCohortes([]);
      setSesiones({});
      return undefined;
    }

    let vigente = true;
    setCargandoCohortes(true);
    setError('');

    adminService
      .getCohortsByCourse(cursoId)
      .then(async (lista) => {
        if (!vigente) return;
        setCohortes(lista);
        setCargandoCohortes(false);
        setCargandoSesiones(true);

        const fallidas: string[] = [];
        const pares = await Promise.all(
          lista.map(async (cohorte) => {
            const filas = await adminService.getSessionsByCohort(cohorte.id).catch(() => {
              fallidas.push(cohorte.id);
              return [] as SessionAdminView[];
            });
            return [cohorte.id, filas] as const;
          }),
        );

        if (!vigente) return;
        setSesiones(Object.fromEntries(pares) as Record<string, SessionAdminView[]>);
        if (fallidas.length > 0) {
          toast.error('Algunas sesiones no se pudieron cargar. Vuelve a intentarlo.');
        }
      })
      .catch((err) => {
        if (!vigente) return;
        setCohortes([]);
        setError(extraerErrorApi(err, 'No pudimos cargar las cohortes del curso.').mensaje);
      })
      .finally(() => {
        if (!vigente) return;
        setCargandoCohortes(false);
        setCargandoSesiones(false);
      });

    return () => {
      vigente = false;
    };
  }, [cursoId, refresco]);

  const cursoSeleccionado = cursos.find((curso) => curso.id === cursoId) ?? null;

  const nombreDeSede = (venueId: string | null) =>
    sedes.find((sede) => sede.id === venueId)?.name ?? null;

  const confirmarBorrado = async () => {
    if (!borradoPendiente) return;
    setBorrando(true);

    try {
      if (borradoPendiente.tipo === 'cohorte') {
        await adminService.deleteCohort(borradoPendiente.cohorteId);
        toast.success('Cohorte eliminada');
      } else if (borradoPendiente.sesionId) {
        await adminService.deleteSession(borradoPendiente.sesionId);
        toast.success('Sesión eliminada');
      }

      setBorradoPendiente(null);
      refrescar();
    } catch (err) {
      toast.error(extraerErrorApi(err, 'No pudimos eliminar. Inténtalo de nuevo.').mensaje);
    } finally {
      setBorrando(false);
    }
  };

  const mensajeBorrado = borradoPendiente
    ? borradoPendiente.tipo === 'cohorte'
      ? `La cohorte «${borradoPendiente.etiqueta}» dejará de mostrarse y sus sesiones se eliminarán. Las matrículas ya registradas se conservan.`
      : `La sesión «${borradoPendiente.etiqueta}» se eliminará definitivamente, junto con la asistencia registrada en ella.`
    : '';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
            Cohortes y sesiones
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {cargandoCursos || cargandoCohortes
              ? 'Cargando la información…'
              : cursoSeleccionado
                ? `${cohortes.length} ${cohortes.length === 1 ? 'cohorte' : 'cohortes'} en ${cursoSeleccionado.title}.`
                : 'Organiza las cohortes de cada curso y sus sesiones.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalCohorte({ abierto: true, edicion: null })}
          disabled={cursoId === ''}
          className={BOTON_PRIMARIO}
        >
          Nueva cohorte
        </button>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {cargandoCohortes ? 'Cargando cohortes…' : `${cohortes.length} cohortes cargadas.`}
      </p>

      {error !== '' ? (
        <EstadoError mensaje={error} onReintentar={refrescar} reintentando={cargandoCursos} />
      ) : cargandoCursos ? (
        <EsqueletoCohortes tarjetas={2} />
      ) : cursos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes cursos"
          descripcion="Las cohortes se crean dentro de un curso. Crea tu primer curso y vuelve a esta pantalla."
        >
          <Link to="/instructor" className={BOTON_PRIMARIO}>
            Ir al panel de cursos
          </Link>
        </EstadoVacio>
      ) : (
        <>
          <SelectorCurso
            cursos={cursos}
            valor={cursoId}
            onCambio={setCursoId}
            deshabilitado={cargandoCohortes}
          />

          {cargandoCohortes ? (
            <EsqueletoCohortes tarjetas={2} />
          ) : cohortes.length === 0 ? (
            <EstadoVacio
              titulo="Este curso aún no tiene cohortes"
              descripcion="Una cohorte define fechas, cupo y cómo se aprueban las matrículas. Crea la primera para empezar a recibir estudiantes."
            >
              <button
                type="button"
                onClick={() => setModalCohorte({ abierto: true, edicion: null })}
                className={BOTON_PRIMARIO}
              >
                Nueva cohorte
              </button>
            </EstadoVacio>
          ) : (
            <div className="space-y-6">
              {cohortes.map((cohorte) => (
                <TarjetaCohorte
                  key={cohorte.id}
                  cohorte={cohorte}
                  sesiones={sesiones[cohorte.id] ?? []}
                  cargandoSesiones={cargandoSesiones}
                  nombreDeSede={nombreDeSede}
                  onEditarCohorte={() => setModalCohorte({ abierto: true, edicion: cohorte })}
                  onEliminarCohorte={() =>
                    setBorradoPendiente({
                      tipo: 'cohorte',
                      cohorteId: cohorte.id,
                      etiqueta: cohorte.name,
                    })
                  }
                  onNuevaSesion={() =>
                    setModalSesion({ abierto: true, cohorteId: cohorte.id, edicion: null })
                  }
                  onEditarSesion={(sesion) =>
                    setModalSesion({ abierto: true, cohorteId: cohorte.id, edicion: sesion })
                  }
                  onEliminarSesion={(sesion) =>
                    setBorradoPendiente({
                      tipo: 'sesion',
                      cohorteId: cohorte.id,
                      sesionId: sesion.id,
                      etiqueta: sesion.title,
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <ModalCohorte
        abierto={modalCohorte.abierto}
        cursoId={cursoId}
        cohorte={modalCohorte.edicion}
        onCerrar={() => setModalCohorte({ abierto: false, edicion: null })}
        onGuardado={() => {
          setModalCohorte({ abierto: false, edicion: null });
          refrescar();
        }}
      />

      <ModalSesion
        abierto={modalSesion.abierto}
        cohorteId={modalSesion.cohorteId}
        sesion={modalSesion.edicion}
        sedes={sedes}
        onCerrar={() => setModalSesion({ abierto: false, cohorteId: '', edicion: null })}
        onGuardado={() => {
          setModalSesion({ abierto: false, cohorteId: '', edicion: null });
          refrescar();
        }}
      />

      <ModalConfirmar
        abierto={borradoPendiente !== null}
        titulo={borradoPendiente?.tipo === 'cohorte' ? 'Eliminar la cohorte' : 'Eliminar la sesión'}
        mensaje={mensajeBorrado}
        confirmando={borrando}
        onConfirmar={confirmarBorrado}
        onCancelar={() => setBorradoPendiente(null)}
      />
    </div>
  );
}
