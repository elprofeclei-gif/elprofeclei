// Clases compartidas por los componentes de gestión de cohortes y sesiones.
// Mantienen la identidad visual del panel: primario azul VS Code en oscuro,
// superficies blancas/tarjeta, foco visible siempre y motion-reduce respetado.

export const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-lms-bg ' +
  'dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-card';

export const BOTON_PRIMARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:brightness-110 ${FOCO}`;

export const BOTON_SECUNDARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-lms-border bg-white px-5 text-sm font-medium text-lms-text transition-colors motion-reduce:transition-none hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`;

export const BOTON_DESTRUCTIVO =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-lms-dark-card';

const claseBotonTarjeta = (variante: string): string =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 ${FOCO} ${variante}`;

export const BOTON_TARJETA_NEUTRO = claseBotonTarjeta(
  'border-lms-border bg-white text-lms-text hover:bg-lms-bg dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark dark:hover:bg-gray-700',
);

export const BOTON_TARJETA_ACENTO = claseBotonTarjeta(
  'border-blue-700/40 bg-white text-blue-700 hover:bg-blue-50 dark:border-vs-blue/50 dark:bg-gray-800 dark:text-vs-blue dark:hover:bg-gray-700',
);

export const BOTON_TARJETA_ELIMINAR = claseBotonTarjeta(
  'border-red-600/60 bg-white text-red-700 hover:bg-red-50 dark:border-red-400/40 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700',
);

export const ETIQUETA = 'mb-1.5 block text-sm font-medium text-lms-text dark:text-lms-text-dark';
export const TEXTO_ERROR = 'mt-1.5 text-xs text-red-600 dark:text-red-400';
export const TEXTO_AYUDA = 'mt-1.5 text-xs text-lms-muted dark:text-gray-400';

export const claseCampo = (invalido: boolean): string =>
  `w-full rounded-lg border bg-lms-bg p-2.5 text-sm text-lms-text transition-shadow motion-reduce:transition-none dark:bg-gray-800 dark:text-lms-text-dark ${FOCO} ${
    invalido ? 'border-red-500 dark:border-red-400' : 'border-lms-border dark:border-gray-600'
  }`;
