// Espejo de CourseCard: misma anatomía (badge + duración, título, descripción,
// disponibilidad, pie con instructor y precio) para que la carga no salte.
const BLOQUE = 'animate-pulse bg-gray-200 motion-reduce:animate-none dark:bg-gray-700';

export function CourseCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full flex-col rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`h-6 w-24 rounded-full ${BLOQUE}`} />
        <div className={`h-4 w-12 rounded ${BLOQUE}`} />
      </div>

      <div className={`mt-4 h-5 w-4/5 rounded ${BLOQUE}`} />
      <div className={`mt-2 h-5 w-3/5 rounded ${BLOQUE}`} />

      <div className={`mt-4 h-4 w-full rounded ${BLOQUE}`} />
      <div className={`mt-2 h-4 w-2/3 rounded ${BLOQUE}`} />

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-lms-border pt-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full ${BLOQUE}`} />
            <div className={`h-4 w-24 rounded ${BLOQUE}`} />
          </div>
          <div className={`h-5 w-20 rounded ${BLOQUE}`} />
        </div>
      </div>
    </div>
  );
}
