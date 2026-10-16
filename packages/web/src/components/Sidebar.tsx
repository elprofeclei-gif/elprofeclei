import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Logo } from './Logo';
import { IconoLuna, IconoSol, useTema } from './Navbar';

// Iconos monoline de la barra lateral (mismo trazo que el resto de la interfaz)
const RUTAS_ICONO: Record<string, string> = {
  inicio: 'M4 11.5 12 4l8 7.5M6.5 10.5V20h11v-9.5',
  aula: 'M4 6h16v12H4zM8 10h8M8 14h5',
  catalogo: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16M9 8h6',
  tareas: 'M9 4h6v3H9zM6 6h12v15H6zM9 12h6M9 16h4',
  asistencia:
    'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12h6',
  certificados: 'M12 3l7 4v5.5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7zM9.5 12l2 2 3.5-4',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  usuarios:
    'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 20a6 6 0 0 1 12 0M16.5 8.2a3 3 0 1 1 0 5.6M18 20a5.5 5.5 0 0 0-2.5-4.6',
  avance: 'M4 19h16M6.5 16V9.5M11.5 16V5.5M16.5 16v-3.5',
  cupones:
    'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5zM13 6.5v11',
  pagos: 'M3 7h18v10H3zM3 11h18M7 15h3',
  sedes:
    'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
};

export type ClaveIcono = keyof typeof RUTAS_ICONO;

export interface EnlaceApp {
  to: string;
  etiqueta: string;
  icono: ClaveIcono;
  /** Solo el inicio lo usa: sin `end`, "/" quedaría activo en todas las rutas */
  end?: boolean;
}

export function Icono({ nombre }: { nombre: ClaveIcono }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={RUTAS_ICONO[nombre]} />
    </svg>
  );
}

// Una sola lista por rol: la comparten la barra lateral y el cajón móvil, así no
// se separan con el tiempo.
export function enlacesPorRol(rol: string): EnlaceApp[] {
  const comunes: EnlaceApp[] = [
    { to: '/', etiqueta: 'Marketplace', icono: 'catalogo', end: true },
    { to: '/perfil', etiqueta: 'Mi perfil', icono: 'perfil' },
  ];

  if (rol === 'STUDENT') {
    return [
      { to: '/campus', etiqueta: 'Mi campus', icono: 'inicio' },
      { to: '/aula', etiqueta: 'Mi aula', icono: 'aula' },
      { to: '/evaluaciones', etiqueta: 'Evaluaciones y tareas', icono: 'tareas' },
      { to: '/attendance', etiqueta: 'Asistencia', icono: 'asistencia' },
      { to: '/certificates', etiqueta: 'Mis certificados', icono: 'certificados' },
      ...comunes,
    ];
  }

  if (rol === 'INSTRUCTOR' || rol === 'ADMIN') {
    return [
      { to: '/panel', etiqueta: 'Inicio', icono: 'inicio' },
      { to: '/instructor', etiqueta: 'Cursos y evaluaciones', icono: 'catalogo' },
      { to: '/manage', etiqueta: 'Cohortes y sesiones', icono: 'usuarios' },
      { to: '/progreso', etiqueta: 'Avance del grupo', icono: 'avance' },
      { to: '/attendance', etiqueta: 'Asistencia', icono: 'asistencia' },
      ...(rol === 'ADMIN'
        ? [
            { to: '/admin', etiqueta: 'Administración', icono: 'pagos' as ClaveIcono },
            { to: '/coupons', etiqueta: 'Cupones', icono: 'cupones' as ClaveIcono },
          ]
        : []),
      ...comunes,
    ];
  }

  return comunes;
}

// Barra lateral vertical fija en escritorio; en móvil se usa el cajón de MobileNav.
export function Sidebar() {
  const { user, logout } = useAuth();
  const { tema, cambiarTema } = useTema();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const rol = user?.role ?? '';
  const enlaces = enlacesPorRol(rol);
  const nombre = user?.email ?? 'Mi cuenta';

  const cerrarSesion = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden border-r border-lms-border bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col dark:border-gray-700 dark:bg-lms-dark-card">
      <div className="border-b border-lms-border p-4 dark:border-gray-700">
        <Link
          to="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
        >
          <Logo />
        </Link>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {enlaces.map((enlace) => (
            <li key={enlace.to}>
              <NavLink
                to={enlace.to}
                end={enlace.end}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-gray-700 dark:text-lms-text-dark'
                      : 'text-lms-text hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700'
                  }`
                }
              >
                <Icono nombre={enlace.icono} />
                {enlace.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-lms-border p-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => cambiarTema(tema === 'oscuro' ? 'claro' : 'oscuro')}
          aria-pressed={tema === 'oscuro'}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm text-lms-text transition-colors hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
        >
          {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
          {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-expanded={menuAbierto}
            aria-haspopup="menu"
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-lms-bg dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white dark:bg-vs-blue dark:text-vs-bg">
              {nombre.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-lms-text dark:text-lms-text-dark">
              {nombre}
            </span>
          </button>

          {menuAbierto && (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-lms-border bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-lms-dark-card"
            >
              <Link
                to="/perfil"
                role="menuitem"
                onClick={() => setMenuAbierto(false)}
                className="block px-3 py-2 text-sm text-lms-text hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700"
              >
                Mi perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => void cerrarSesion()}
                className="block w-full px-3 py-2 text-left text-sm font-semibold text-orange-700 hover:bg-lms-bg dark:text-vs-orange dark:hover:bg-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
