import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Modal accesible: role dialog, cierre con Escape, foco atrapado dentro
// mientras está abierto y foco devuelto al elemento anterior al cerrar.
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const elementoPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    elementoPrevio.current = document.activeElement as HTMLElement | null;

    const enfocables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((elemento) => !elemento.hasAttribute('disabled'));

    // Foco inicial dentro del diálogo
    enfocables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      // Trampa de foco: el tabulador no escapa del modal
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

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      elementoPrevio.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal"
        className="bg-white dark:bg-lms-dark-card rounded-2xl shadow-xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="titulo-modal" className="text-xl font-bold text-lms-text dark:text-lms-text-dark">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="text-lms-muted hover:text-lms-text dark:hover:text-lms-text-dark text-2xl leading-none px-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-vs-blue"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
