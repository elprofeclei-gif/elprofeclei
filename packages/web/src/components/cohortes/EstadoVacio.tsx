import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descripcion: string;
  /** Acción sugerida para salir del estado vacío (botón o enlace). */
  children?: ReactNode;
}

// Estado vacío explicativo: dice qué falta y cuál es el siguiente paso, en vez
// de dejar la pantalla en blanco.
export function EstadoVacio({ titulo, descripcion, children }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-lms-border bg-white p-8 text-center dark:border-gray-600 dark:bg-lms-dark-card">
      <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-lms-muted dark:text-gray-400">
        {descripcion}
      </p>
      {children ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}
