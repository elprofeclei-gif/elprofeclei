import type {
  DuracionFiltro,
  ModalidadFiltro,
  OrdenCatalogo,
  PrecioFiltro,
} from '../services/courses.service';

export interface FiltrosCatalogo {
  modality: ModalidadFiltro | '';
  duration: DuracionFiltro | '';
  price: PrecioFiltro | '';
  sort: OrdenCatalogo;
}

export const FILTROS_CATALOGO_INICIALES: FiltrosCatalogo = {
  modality: '',
  duration: '',
  price: '',
  sort: 'recent',
};

const MODALIDADES: { valor: ModalidadFiltro | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'VIRTUAL', etiqueta: 'Virtual' },
  { valor: 'ONSITE', etiqueta: 'Presencial' },
  { valor: 'HYBRID', etiqueta: 'Híbrido' },
];

const DURACIONES: { valor: DuracionFiltro | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'EIGHT', etiqueta: '8 h' },
  { valor: 'TEN', etiqueta: '10 h' },
  { valor: 'SIXTEEN', etiqueta: '16 h' },
  { valor: 'TWENTY', etiqueta: '20 h' },
];

const PRECIOS: { valor: PrecioFiltro | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'free', etiqueta: 'Gratis' },
  { valor: 'paid', etiqueta: 'De pago' },
];

const ORDENES: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: 'recent', etiqueta: 'Recientes' },
  { valor: 'price_asc', etiqueta: 'Precio: menor a mayor' },
  { valor: 'price_desc', etiqueta: 'Precio: mayor a menor' },
];

const CLASE_LEYENDA =
  'text-xs font-medium uppercase tracking-[0.08em] text-gray-600 dark:text-gray-400';
const CLASE_FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-card';

function IconoCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

// Filtro de una sola opción: el estado "sin filtro" es el chip "Todas"/"Todos"
function GrupoChips<T extends string>({
  leyenda,
  opciones,
  valor,
  onElegir,
}: {
  leyenda: string;
  opciones: { valor: T | ''; etiqueta: string }[];
  valor: T | '';
  onElegir: (valor: T | '') => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={CLASE_LEYENDA}>{leyenda}</legend>

      <div className="mt-1.5 flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activo = valor === opcion.valor;
          const claseEstado = activo
            ? 'border-vs-blue bg-vs-blue text-vs-bg shadow-sm'
            : 'border-gray-300 bg-white text-lms-text hover:border-vs-blue/60 hover:bg-blue-50 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:border-vs-blue/60 dark:hover:bg-gray-700';

          return (
            <button
              key={opcion.valor === '' ? 'todos' : opcion.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onElegir(opcion.valor)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium motion-safe:transition-colors ${CLASE_FOCO} ${claseEstado}`}
            >
              {activo && <IconoCheck />}
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CourseFilters({
  filtros,
  onCambiar,
  onLimpiar,
  mostrarLimpiar,
}: {
  filtros: FiltrosCatalogo;
  onCambiar: (parcial: Partial<FiltrosCatalogo>) => void;
  onLimpiar: () => void;
  mostrarLimpiar: boolean;
}) {
  return (
    <div className="rounded-xl border border-lms-border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <GrupoChips
          leyenda="Modalidad"
          opciones={MODALIDADES}
          valor={filtros.modality}
          onElegir={(valor) => onCambiar({ modality: valor })}
        />

        <GrupoChips
          leyenda="Duración"
          opciones={DURACIONES}
          valor={filtros.duration}
          onElegir={(valor) => onCambiar({ duration: valor })}
        />

        <GrupoChips
          leyenda="Precio"
          opciones={PRECIOS}
          valor={filtros.price}
          onElegir={(valor) => onCambiar({ price: valor })}
        />

        <div className="min-w-0">
          <label htmlFor="orden-catalogo" className={`block ${CLASE_LEYENDA}`}>
            Ordenar por
          </label>
          <select
            id="orden-catalogo"
            value={filtros.sort}
            onChange={(evento) => onCambiar({ sort: evento.target.value as OrdenCatalogo })}
            className={`mt-1.5 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text motion-safe:transition-colors dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark ${CLASE_FOCO}`}
          >
            {ORDENES.map((orden) => (
              <option key={orden.valor} value={orden.valor}>
                {orden.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {mostrarLimpiar && (
          <button
            type="button"
            onClick={onLimpiar}
            className={`inline-flex h-9 items-center rounded-lg px-2 text-sm font-semibold text-blue-700 underline hover:text-blue-800 dark:text-vs-blue dark:hover:text-vs-blue/80 ${CLASE_FOCO}`}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
