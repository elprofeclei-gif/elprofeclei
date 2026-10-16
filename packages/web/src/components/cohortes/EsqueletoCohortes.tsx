// Espejo de TarjetaCohorte: misma anatomía (cabecera con acción, filas de
// sesión) para que la carga no cambie el tamaño del contenido. Es decorativo:
// el aviso de carga lo da el texto que la página renderiza junto a él.
const BLOQUE = 'animate-pulse bg-gray-200 motion-reduce:animate-none dark:bg-gray-700';

export function EsqueletoCohortes({ tarjetas = 2 }: { tarjetas?: number }) {
  return (
    <div aria-hidden="true" className="space-y-6">
      {Array.from({ length: tarjetas }, (_, indice) => (
        <div
          key={indice}
          className="rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lms-border pb-4 dark:border-gray-700">
            <div className="min-w-0 flex-1">
              <div className={`h-5 w-40 rounded ${BLOQUE}`} />
              <div className={`mt-2 h-4 w-56 rounded ${BLOQUE}`} />
            </div>
            <div className="flex gap-2">
              <div className={`h-9 w-20 rounded-lg ${BLOQUE}`} />
              <div className={`h-9 w-24 rounded-lg ${BLOQUE}`} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className={`h-4 w-24 rounded ${BLOQUE}`} />
            {[0, 1].map((fila) => (
              <div
                key={fila}
                className="flex items-center justify-between gap-3 rounded-lg bg-lms-bg p-3 dark:bg-gray-800"
              >
                <div className="min-w-0 flex-1">
                  <div className={`h-4 w-48 rounded ${BLOQUE}`} />
                  <div className={`mt-2 h-3 w-36 rounded ${BLOQUE}`} />
                </div>
                <div className={`h-9 w-32 rounded-lg ${BLOQUE}`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
