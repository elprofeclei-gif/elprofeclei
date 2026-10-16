import { useEffect, useId, useRef } from 'react';
import { BOTON_DESTRUCTIVO, BOTON_SECUNDARIO } from './clases';

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma la acción destructiva. */
  textoConfirmar?: string;
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Diálogo de confirmación para acciones destructivas. No reutiliza `Modal` porque
// aquí el foco inicial debe quedar en «Cancelar» (nunca en la acción que borra),
// y el foco se devuelve al elemento que abrió el diálogo al cerrarse.
export function ModalConfirmar({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  confirmando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const idTitulo = useId();
  const idMensaje = useId();
  const refCancelar = useRef<HTMLButtonElement>(null);
  const refDialogo = useRef<HTMLDivElement>(null);
  const refPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return undefined;

    refPrevio.current = document.activeElement as HTMLElement | null;
    refCancelar.current?.focus();

    const enfocables = () =>
      Array.from(refDialogo.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);

    const alPulsarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancelar();
        return;
      }

      if (event.key !== 'Tab') return;

      const elementos = enfocables();
      if (elementos.length === 0) return;

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      refPrevio.current?.focus();
    };
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={refDialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idMensaje}
        className="w-full max-w-lg rounded-2xl border border-lms-border bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-lms-dark-card"
      >
        <h2 id={idTitulo} className="text-lg font-semibold text-lms-text dark:text-lms-text-dark">
          {titulo}
        </h2>
        <p id={idMensaje} className="mt-2 text-sm text-lms-muted dark:text-gray-400">
          {mensaje}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={refCancelar}
            type="button"
            onClick={onCancelar}
            disabled={confirmando}
            className={BOTON_SECUNDARIO}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className={BOTON_DESTRUCTIVO}
          >
            {confirmando ? 'Eliminando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
