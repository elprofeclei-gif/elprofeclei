import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';

export interface EnlaceNav {
  to: string;
  etiqueta: string;
  /** Solo el inicio lo usa: sin `end`, "/" quedaría activo en todas las rutas */
  end?: boolean;
}

interface MobileNavProps {
  enlaces: EnlaceNav[];
}

const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-lms-dark-card';

// Contraste medido (WCAG 2.1, texto normal 4.5:1): el activo en oscuro usa texto claro
// #E5E7EB sobre gray-700 (#374151) = 8.33:1; la versión previa (`text-vs-blue` sobre
// gray-700) daba 3.50:1 y no pasaba AA. El acento activo lo aporta el borde izquierdo
// (`vs-blue` sobre gray-700 = 3.50:1, suficiente para elementos no textuales, 3:1).
const clasesEnlace = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[44px] items-center rounded-lg border-l-2 px-3 text-sm font-medium transition-colors ${FOCO} ${
    isActive
      ? 'border-blue-700 bg-blue-50 font-semibold text-blue-700 dark:border-vs-blue dark:bg-gray-700 dark:text-lms-text-dark'
      : 'border-transparent text-lms-text dark:text-lms-text-dark hover:bg-lms-bg dark:hover:bg-gray-700'
  }`;

// Navegación de pantallas pequeñas (por debajo de md). Antes los enlaces de Panel,
// Cohortes y Asistencia vivían en un contenedor `hidden md:flex`, así que en móvil
// no había forma de llegar a esas pantallas; este cajón las expone.
//
// El cajón es un diálogo modal: atrapa el foco mientras está abierto, bloquea el
// scroll de fondo, cierra con Escape o con clic en el fondo y, al cerrar, devuelve
// el foco a la hamburguesa que lo abrió.
export function MobileNav({ enlaces }: MobileNavProps) {
  const [abierto, setAbierto] = useState(false);
  const hamburguesaRef = useRef<HTMLButtonElement>(null);
  const cajonRef = useRef<HTMLDivElement>(null);
  const idCajon = useId();

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const enfocables = () =>
      Array.from(
        cajonRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );

    // Foco inicial: el botón de cerrar, primer control del cajón
    enfocables()[0]?.focus();

    // Si la pantalla crece hasta escritorio (giro de tablet), el cajón se cierra solo
    // en vez de dejar el scroll de fondo bloqueado detrás de una capa invisible.
    const pantallaGrande = window.matchMedia('(min-width: 768px)');
    const alCambiarPantalla = () => {
      if (pantallaGrande.matches) setAbierto(false);
    };
    pantallaGrande.addEventListener('change', alCambiarPantalla);

    const alPulsarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setAbierto(false);
        return;
      }

      if (event.key !== 'Tab') return;

      // Trampa de foco: el tabulador recorre el cajón sin saltar a la página de fondo
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
      pantallaGrande.removeEventListener('change', alCambiarPantalla);
      document.body.style.overflow = overflowPrevio;
      hamburguesaRef.current?.focus();
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={hamburguesaRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={abierto}
        aria-controls={abierto ? idCajon : undefined}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-lms-border text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:text-lms-text-dark dark:hover:bg-gray-700 md:hidden ${FOCO}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setAbierto(false)}
          />

          <div
            ref={cajonRef}
            id={idCajon}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-lms-border bg-white shadow-xl dark:border-gray-700 dark:bg-lms-dark-card"
          >
            <div className="flex items-center justify-between gap-2 border-b border-lms-border px-4 py-3 dark:border-gray-700">
              <Logo />
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú de navegación"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lms-text transition-colors hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Secciones de la aplicación" className="flex-1 overflow-y-auto p-2">
              <ul className="space-y-1">
                {enlaces.map((enlace) => (
                  <li key={enlace.to}>
                    {/* NavLink pone aria-current="page" cuando la ruta está activa */}
                    <NavLink
                      to={enlace.to}
                      end={enlace.end}
                      onClick={() => setAbierto(false)}
                      className={clasesEnlace}
                    >
                      {enlace.etiqueta}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
