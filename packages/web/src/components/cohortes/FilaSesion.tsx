import type { SessionAdminView } from './tipos';
import { formatFechaHora } from '../../utils/format';
import { BOTON_TARJETA_ACENTO, BOTON_TARJETA_ELIMINAR, FOCO } from './clases';
import { formatHora } from './fechas';
import { IconoEditar, IconoEliminar, IconoEnlace, IconoSede } from './iconos';
import { InsigniaTipo } from './insignias';

interface Props {
  sesion: SessionAdminView;
  /** Nombre de la sede resuelto en la página; null si aún no se conoce. */
  nombreSede: string | null;
  onEditar: () => void;
  onEliminar: () => void;
}

const esMismoDia = (inicio: string, fin: string): boolean =>
  new Date(inicio).toDateString() === new Date(fin).toDateString();

// Una sesión dentro de una cohorte: qué es, cuándo y dónde (sede física o
// enlace), con sus dos acciones. En móvil los botones bajan de línea.
export function FilaSesion({ sesion, nombreSede, onEditar, onEliminar }: Props) {
  const mismoDia = esMismoDia(sesion.startTime, sesion.endTime);

  return (
    <li className="rounded-lg bg-lms-bg p-3 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-lms-text dark:text-lms-text-dark">{sesion.title}</p>
            <InsigniaTipo tipo={sesion.type} />
          </div>

          <p className="mt-1 text-xs text-lms-muted dark:text-gray-400">
            <time dateTime={sesion.startTime}>{formatFechaHora(sesion.startTime)}</time>
            {mismoDia
              ? ` – ${formatHora(sesion.endTime)}`
              : ` – ${formatFechaHora(sesion.endTime)}`}
          </p>

          {sesion.type === 'ONSITE' ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-lms-muted dark:text-gray-400">
              <IconoSede className="h-3.5 w-3.5" />
              {nombreSede ?? 'Sede asignada'}
            </p>
          ) : sesion.videoUrl ? (
            <a
              href={sesion.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver video de la sesión ${sesion.title}`}
              className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-vs-blue ${FOCO}`}
            >
              <IconoEnlace className="h-3.5 w-3.5" />
              Ver video
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar la sesión ${sesion.title}`}
            className={BOTON_TARJETA_ACENTO}
          >
            <IconoEditar className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={onEliminar}
            aria-label={`Eliminar la sesión ${sesion.title}`}
            className={BOTON_TARJETA_ELIMINAR}
          >
            <IconoEliminar className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      </div>
    </li>
  );
}
