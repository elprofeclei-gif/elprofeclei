import { BOTON_SECUNDARIO } from './clases';
import { IconoAlerta, IconoReintentar } from './iconos';

interface Props {
  /** Texto concreto de lo que falló, ya traducido desde el error de la API. */
  mensaje: string;
  onReintentar: () => void;
  reintentando?: boolean;
}

// Error recuperable en el mismo lugar donde debería estar el contenido: explica
// qué falló y ofrece la acción para volver a intentarlo (nunca un console.error).
export function EstadoError({ mensaje, onReintentar, reintentando = false }: Props) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-500/40 dark:bg-red-950/40"
    >
      <div className="flex items-start gap-3">
        <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            No se pudo cargar la información
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{mensaje}</p>
          <button
            type="button"
            onClick={onReintentar}
            disabled={reintentando}
            className={`${BOTON_SECUNDARIO} mt-4`}
          >
            <IconoReintentar className="h-4 w-4" />
            {reintentando ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      </div>
    </div>
  );
}
