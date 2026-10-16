import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { etiquetaRol, usersService, type PerfilUsuario } from '../services/users.service';
import { formatFecha } from '../utils/format';
import { IconoLuna, IconoSol, useTema } from '../components/Navbar';

type Estado = 'cargando' | 'error' | 'listo';

const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-lms-dark-card';

const TARJETA =
  'rounded-xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';

const FILA_DATO = 'py-3 sm:grid sm:grid-cols-3 sm:gap-4';
const CLAVE_DATO = 'text-sm font-semibold text-gray-600 dark:text-gray-400';
const VALOR_DATO =
  'mt-1 break-words text-sm text-lms-text sm:col-span-2 sm:mt-0 dark:text-lms-text-dark';

// Esqueleto de carga: reproduce la forma de la tarjeta de datos para que el salto
// al contenido real no mueva la página.
function EsqueletoDatos() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
      {[0, 1, 2, 3, 4].map((fila) => (
        <div key={fila} className="sm:grid sm:grid-cols-3 sm:gap-4">
          <div className="h-4 w-24 rounded bg-lms-border dark:bg-gray-700" />
          <div className="mt-2 h-4 w-2/3 rounded bg-lms-border sm:col-span-2 sm:mt-0 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

export function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { tema, cambiarTema } = useTema();

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [intentos, setIntentos] = useState(0);
  const [esperaSegundos, setEsperaSegundos] = useState(0);
  const [tardando, setTardando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const cargar = useCallback(async (numeroIntento: number) => {
    setEstado('cargando');

    try {
      const datos = await usersService.getMe();
      setPerfil(datos);
      setEstado('listo');
    } catch {
      setPerfil(null);
      setEstado('error');
      // Espaciado entre reintentos: 2 s, 4 s y 8 s como máximo
      if (numeroIntento > 0) setEsperaSegundos(Math.min(2 ** numeroIntento, 8));
    }
  }, []);

  useEffect(() => {
    void cargar(0);
  }, [cargar]);

  // Aviso honesto si la carga se alarga: la petición sigue viva, no se deja un
  // esqueleto animado sin explicación.
  useEffect(() => {
    if (estado !== 'cargando') return;

    setTardando(false);
    const temporizador = window.setTimeout(() => setTardando(true), 15000);
    return () => window.clearTimeout(temporizador);
  }, [estado]);

  useEffect(() => {
    if (esperaSegundos <= 0) return;

    const temporizador = window.setTimeout(() => setEsperaSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(temporizador);
  }, [esperaSegundos]);

  const reintentar = () => {
    const numeroIntento = intentos + 1;
    setIntentos(numeroIntento);
    void cargar(numeroIntento);
  };

  const cerrarSesion = async () => {
    setCerrandoSesion(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setCerrandoSesion(false);
    }
  };

  const nombreCompleto = perfil
    ? [perfil.firstName, perfil.lastName]
        .map((parte) => (parte ?? '').trim())
        .filter((parte) => parte.length > 0)
        .join(' ')
    : '';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-lms-text dark:text-lms-text-dark">Mi perfil</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Tus datos de cuenta, la preferencia de tema del armazón y la sesión actual.
        </p>
      </header>

      {estado === 'cargando' && (
        <section role="status" aria-live="polite" className={TARJETA}>
          <span className="sr-only">Cargando tu perfil…</span>
          <EsqueletoDatos />
          {tardando && (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              Está tardando más de lo esperado. La petición sigue en curso.
            </p>
          )}
        </section>
      )}

      {estado === 'error' && (
        <section role="alert" className={TARJETA}>
          <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
            No pudimos cargar tu perfil
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            El servidor no respondió con tus datos. Revisa tu conexión e inténtalo de nuevo; tu
            sesión sigue abierta.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reintentar}
              disabled={esperaSegundos > 0}
              className={`inline-flex h-11 items-center rounded-lg bg-blue-700 px-4 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50 dark:bg-vs-blue dark:text-vs-bg dark:hover:bg-blue-500 ${FOCO}`}
            >
              {esperaSegundos > 0 ? `Reintentar en ${esperaSegundos} s` : 'Reintentar'}
            </button>
            {intentos >= 3 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Si sigue fallando, escribe a soporte técnico indicando el correo de tu cuenta.
              </p>
            )}
          </div>
        </section>
      )}

      {estado === 'listo' && perfil && (
        <>
          <section aria-labelledby="perfil-datos" className={TARJETA}>
            <h2
              id="perfil-datos"
              className="text-lg font-bold text-lms-text dark:text-lms-text-dark"
            >
              Datos de la cuenta
            </h2>

            <dl className="mt-2 divide-y divide-lms-border dark:divide-gray-700">
              <div className={FILA_DATO}>
                <dt className={CLAVE_DATO}>Nombre</dt>
                <dd className={VALOR_DATO}>{nombreCompleto || 'No registrado'}</dd>
              </div>
              <div className={FILA_DATO}>
                <dt className={CLAVE_DATO}>Correo electrónico</dt>
                <dd className={VALOR_DATO}>{perfil.email}</dd>
              </div>
              <div className={FILA_DATO}>
                <dt className={CLAVE_DATO}>Rol</dt>
                <dd className={VALOR_DATO}>{etiquetaRol(perfil.role)}</dd>
              </div>
              <div className={FILA_DATO}>
                <dt className={CLAVE_DATO}>Miembro desde</dt>
                <dd className={VALOR_DATO}>{formatFecha(perfil.createdAt)}</dd>
              </div>
              <div className={FILA_DATO}>
                <dt className={CLAVE_DATO}>Consentimiento (Ley 1581)</dt>
                <dd className={VALOR_DATO}>
                  {perfil.consent ? 'Sí' : 'No registrado'}
                  <span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
                    Autorización para el tratamiento de datos personales.
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="perfil-preferencias" className={TARJETA}>
            <h2
              id="perfil-preferencias"
              className="text-lg font-bold text-lms-text dark:text-lms-text-dark"
            >
              Preferencias
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Tema de la interfaz</p>

            <div
              role="group"
              aria-label="Tema de la interfaz"
              className="mt-3 inline-flex gap-1 rounded-lg border border-lms-border p-1 dark:border-gray-600"
            >
              <button
                type="button"
                onClick={() => cambiarTema('claro')}
                aria-pressed={tema === 'claro'}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${FOCO} ${
                  tema === 'claro'
                    ? 'bg-blue-700 text-white'
                    : 'text-lms-text hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700'
                }`}
              >
                <IconoSol />
                Claro
              </button>
              <button
                type="button"
                onClick={() => cambiarTema('oscuro')}
                aria-pressed={tema === 'oscuro'}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${FOCO} ${
                  tema === 'oscuro'
                    ? 'bg-blue-700 text-white dark:bg-vs-blue dark:text-vs-bg'
                    : 'text-lms-text hover:bg-lms-bg dark:text-lms-text-dark dark:hover:bg-gray-700'
                }`}
              >
                <IconoLuna />
                Oscuro
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Se guarda en este navegador y viaja con la app: el armazón y las páginas respetan tu
              elección.
            </p>
          </section>

          <section aria-labelledby="perfil-sesion" className={TARJETA}>
            <h2
              id="perfil-sesion"
              className="text-lg font-bold text-lms-text dark:text-lms-text-dark"
            >
              Sesión
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Cerrar sesión termina tu acceso en este navegador.
            </p>
            <button
              type="button"
              onClick={cerrarSesion}
              disabled={cerrandoSesion}
              className={`mt-4 inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 px-4 font-semibold text-lms-text transition-colors hover:bg-lms-bg disabled:opacity-50 dark:border-gray-600 dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`}
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
              {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </section>

          <section
            aria-labelledby="perfil-pendientes"
            className="rounded-xl border border-dashed border-lms-border p-6 dark:border-gray-700"
          >
            <h2
              id="perfil-pendientes"
              className="text-sm font-bold text-lms-text dark:text-lms-text-dark"
            >
              Pendiente de implementar
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Cambiar contraseña y eliminar la cuenta todavía no existen en la plataforma, así que
              aquí no hay botones que las simulen. Si necesitas cualquiera de las dos, escribe a
              soporte técnico.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
