import { formatFecha } from '../../utils/format';
import type { CohorteAdminView, SessionAdminView } from '../../services/admin.service';
import { FilaSesion } from './FilaSesion';
import { InsigniaAprobacion } from './insignias';
import {
  BOTON_TARJETA_ACENTO,
  BOTON_TARJETA_ELIMINAR,
  BOTON_TARJETA_NEUTRO,
  TEXTO_AYUDA,
} from './clases';
import { IconoCalendario, IconoEditar, IconoEliminar, IconoPlus, IconoUsuarios } from './iconos';

interface Props {
  cohorte: CohorteAdminView;
  sesiones: SessionAdminView[];
  cargandoSesiones: boolean;
  nombreDeSede: (venueId: string | null) => string | null;
  onEditarCohorte: () => void;
  onEliminarCohorte: () => void;
  onNuevaSesion: () => void;
  onEditarSesion: (sesion: SessionAdminView) => void;
  onEliminarSesion: (sesion: SessionAdminView) => void;
}

// Una cohorte con lo que la define (fechas, cupo, modo de aprobación) y sus
// sesiones dentro. En móvil la cabecera y los botones se apilan.
export function TarjetaCohorte({
  cohorte,
  sesiones,
  cargandoSesiones,
  nombreDeSede,
  onEditarCohorte,
  onEliminarCohorte,
  onNuevaSesion,
  onEditarSesion,
  onEliminarSesion,
}: Props) {
  return (
    <article className="rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lms-border pb-4 dark:border-gray-700">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-lms-text dark:text-lms-text-dark">
              {cohorte.name}
            </h3>
            <InsigniaAprobacion modo={cohorte.approvalMode} />
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-lms-muted dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <IconoCalendario className="h-3.5 w-3.5" />
              {formatFecha(cohorte.startDate)} — {formatFecha(cohorte.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconoUsuarios className="h-3.5 w-3.5" />
              {cohorte.capacity} {cohorte.capacity === 1 ? 'cupo' : 'cupos'}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEditarCohorte}
            aria-label={`Editar la cohorte ${cohorte.name}`}
            className={BOTON_TARJETA_ACENTO}
          >
            <IconoEditar className="h-3.5 w-3.5" />
            Editar cohorte
          </button>
          <button
            type="button"
            onClick={onEliminarCohorte}
            aria-label={`Eliminar la cohorte ${cohorte.name}`}
            className={BOTON_TARJETA_ELIMINAR}
          >
            <IconoEliminar className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Sesiones {sesiones.length > 0 ? `(${sesiones.length})` : ''}
          </h4>
          <button type="button" onClick={onNuevaSesion} className={BOTON_TARJETA_NEUTRO}>
            <IconoPlus className="h-3.5 w-3.5" />
            Añadir sesión
          </button>
        </div>

        {cargandoSesiones ? (
          <p role="status" className="mt-3 text-sm text-lms-muted dark:text-gray-400">
            Cargando sesiones…
          </p>
        ) : sesiones.length === 0 ? (
          <p className={TEXTO_AYUDA}>
            Esta cohorte todavía no tiene sesiones. Añade la primera con el botón de arriba.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sesiones.map((sesion) => (
              <FilaSesion
                key={sesion.id}
                sesion={sesion}
                nombreSede={nombreDeSede(sesion.venueId)}
                onEditar={() => onEditarSesion(sesion)}
                onEliminar={() => onEliminarSesion(sesion)}
              />
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
