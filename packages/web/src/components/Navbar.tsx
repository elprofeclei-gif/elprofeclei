import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { etiquetaRol } from '../services/users.service';
import { Logo } from './Logo';
import { MobileNav, type EnlaceNav } from './MobileNav';

export const CLAVE_TEMA = 'elprofeclei-tema';
const EVENTO_TEMA = 'elprofeclei-tema-cambio';

type Tema = 'claro' | 'oscuro';

const temaAplicado = (): Tema =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'oscuro'
    : 'claro';

// El tema real lo decide index.html antes de pintar; este hook solo lo refleja y lo
// cambia. El evento mantiene en sintonía los dos puntos donde se cambia el tema
// (el botón del armazón y el control de la página de perfil).
export function useTema() {
  const [tema, setTema] = useState<Tema>(temaAplicado);

  useEffect(() => {
    const sincronizar = () => setTema(temaAplicado());
    window.addEventListener(EVENTO_TEMA, sincronizar);
    return () => window.removeEventListener(EVENTO_TEMA, sincronizar);
  }, []);

  const cambiarTema = (nuevo: Tema) => {
    document.documentElement.classList.toggle('dark', nuevo === 'oscuro');

    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      /* navegación privada sin almacenamiento: el tema solo dura la sesión */
    }

    window.dispatchEvent(new Event(EVENTO_TEMA));
    setTema(nuevo);
  };

  return { tema, cambiarTema };
}

// Iconos monoline del armazón, reutilizados por el control de tema del perfil.
export function IconoSol() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4"
      />
    </svg>
  );
}

export function IconoLuna() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"
      />
    </svg>
  );
}

// La sesión garantiza id, email y role; nombre y apellidos llegan si la API los trajo
// (el perfil de /users/me los incluye). Se leen como opcionales para que la interfaz
// muestre el correo cuando no haya nombre, en vez de inventarlo.
interface SesionUI {
  email?: string;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
}

const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-lms-dark-card';

const clasesEnlaceEscritorio = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[36px] items-center border-b-2 text-sm font-medium transition-colors ${FOCO} ${
    isActive
      ? 'border-blue-700 text-blue-700 dark:border-vs-blue dark:text-vs-blue'
      : 'border-transparent text-lms-text hover:border-gray-300 hover:text-blue-700 dark:text-lms-text-dark dark:hover:border-gray-600 dark:hover:text-vs-blue'
  }`;

const CLASES_ITEM_MENU = `flex min-h-[44px] w-full items-center gap-2 px-4 text-sm text-lms-text transition-colors hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { tema, cambiarTema } = useTema();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonPerfilRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const devolverFocoRef = useRef(true);
  const idBotonPerfil = useId();
  const idMenu = useId();

  const sesion: SesionUI | null = user;
  const rol = sesion?.role ?? '';
  const nombreCompleto = [sesion?.firstName, sesion?.lastName]
    .map((parte) => (parte ?? '').trim())
    .filter((parte) => parte.length > 0)
    .join(' ');
  const nombreVisible = nombreCompleto || sesion?.email || 'Mi cuenta';
  const inicial = (nombreCompleto || sesion?.email || '?').charAt(0).toUpperCase();

  // Una sola lista de enlaces por rol: la comparten la barra de escritorio, el menú
  // de perfil y el cajón móvil, para que no se separen con el tiempo.
  const enlaces: EnlaceNav[] = [
    { to: '/', etiqueta: 'Marketplace', end: true },
    ...(rol === 'STUDENT'
      ? [
          { to: '/campus', etiqueta: 'Mi Campus' },
          { to: '/certificates', etiqueta: 'Mis Certificados' },
        ]
      : []),
    ...(rol === 'INSTRUCTOR' || rol === 'ADMIN'
      ? [
          { to: '/instructor', etiqueta: 'Panel' },
          { to: '/manage', etiqueta: 'Cohortes' },
          { to: '/attendance', etiqueta: 'Asistencia' },
        ]
      : []),
    ...(rol === 'ADMIN' ? [{ to: '/coupons', etiqueta: 'Cupones' }] : []),
  ];

  // El menú de perfil repite los enlaces por rol (menos el catálogo, ya visible) y
  // añade el acceso al perfil.
  const enlacesPerfil = enlaces.filter((enlace) => enlace.to !== '/');

  const abrirMenu = () => {
    devolverFocoRef.current = true;
    setMenuAbierto(true);
  };

  const cerrarMenu = (conservarFoco = false) => {
    devolverFocoRef.current = !conservarFoco;
    setMenuAbierto(false);
  };

  useEffect(() => {
    if (!menuAbierto) return;

    // Foco inicial en la primera opción del menú (patrón de menú, ARIA APG)
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const alPulsarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        cerrarMenu();
        return;
      }

      if (event.key === 'Tab') {
        // Al tabular, el menú se cierra y el foco sigue su camino natural
        cerrarMenu(true);
        return;
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;

      event.preventDefault();
      const actual = items.indexOf(document.activeElement as HTMLElement);
      const paso = event.key === 'ArrowDown' ? 1 : -1;
      items[(actual + paso + items.length) % items.length].focus();
    };

    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      // Foco devuelto al botón que abrió el menú: Escape, clic fuera o una opción
      if (devolverFocoRef.current) botonPerfilRef.current?.focus();
    };
  }, [menuAbierto]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-lms-border bg-white shadow-sm dark:border-gray-700 dark:bg-lms-dark-card">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:py-3"
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-8">
          <MobileNav enlaces={enlaces} />

          <Link
            to="/"
            aria-label="Ir al catálogo de cursos"
            className={`shrink-0 rounded-lg ${FOCO}`}
          >
            <Logo />
          </Link>

          {/* Enlaces principales en escritorio, con estado activo real */}
          <div className="hidden items-center gap-6 md:flex">
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end={enlace.end}
                className={clasesEnlaceEscritorio}
              >
                {enlace.etiqueta}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => cambiarTema(tema === 'oscuro' ? 'claro' : 'oscuro')}
            aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
            aria-pressed={tema === 'oscuro'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-lms-border text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`}
          >
            {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
          </button>

          <div className="relative">
            <button
              ref={botonPerfilRef}
              id={idBotonPerfil}
              type="button"
              onClick={() => (menuAbierto ? cerrarMenu() : abrirMenu())}
              aria-label={`Menú de perfil de ${nombreVisible}`}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
              aria-controls={menuAbierto ? idMenu : undefined}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-lms-bg dark:hover:bg-gray-700 ${FOCO}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white dark:bg-vs-blue dark:text-vs-bg">
                {inicial}
              </span>
            </button>

            {menuAbierto && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => cerrarMenu()}
                />

                <div
                  ref={menuRef}
                  id={idMenu}
                  role="menu"
                  aria-labelledby={idBotonPerfil}
                  className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-lms-border bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-lms-dark-card"
                >
                  <div className="border-b border-lms-border px-4 py-3 dark:border-gray-700">
                    <p
                      className="truncate text-sm font-bold text-lms-text dark:text-lms-text-dark"
                      title={nombreVisible}
                    >
                      {nombreCompleto || sesion?.email}
                    </p>
                    {nombreCompleto && (
                      <p
                        className="truncate text-xs text-gray-600 dark:text-gray-400"
                        title={sesion?.email}
                      >
                        {sesion?.email}
                      </p>
                    )}
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                      Rol: {etiquetaRol(rol)}
                    </p>
                  </div>

                  <Link
                    to="/perfil"
                    role="menuitem"
                    onClick={() => cerrarMenu()}
                    className={CLASES_ITEM_MENU}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M5 20a7 7 0 0 1 14 0" />
                    </svg>
                    Mi perfil
                  </Link>

                  {enlacesPerfil.map((enlace) => (
                    <NavLink
                      key={enlace.to}
                      to={enlace.to}
                      role="menuitem"
                      onClick={() => cerrarMenu()}
                      className={CLASES_ITEM_MENU}
                    >
                      {enlace.etiqueta}
                    </NavLink>
                  ))}

                  <div className="my-2 border-t border-lms-border dark:border-gray-700" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className={`${CLASES_ITEM_MENU} font-semibold text-orange-700 dark:text-vs-orange`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
                      <path d="M10 8l-4 4 4 4M6 12h9" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
