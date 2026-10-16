import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { attendanceService } from '../services/attendance.service';
import { sessionsService, type SessionView } from '../services/sessions.service';
import { formatFechaHora } from '../utils/format';

const VIGENCIA_POR_DEFECTO = 300; // segundos, si el backend no lo indica
const AVISO_UMBRAL = 60; // segundos restantes a partir de los cuales se avisa

const PANEL =
  'rounded-xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:bg-vs-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-bg';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-bg';
const CLASE_SELECT =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

// El controller devuelve { code, expiresIn }: se tipa aquí porque el servicio devuelve la respuesta cruda
interface RespuestaQr {
  code?: string;
  expiresIn?: number;
}

function formatearRestante(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export function AttendanceInstructor() {
  const [sesiones, setSesiones] = useState<SessionView[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [sesionId, setSesionId] = useState('');
  const [generando, setGenerando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [venceEn, setVenceEn] = useState<number | null>(null);
  const [restante, setRestante] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const temporizadorRef = useRef<number | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCarga(false);

    sessionsService
      .getMySessions()
      .then((datos) => {
        if (!vigente) return;
        setSesiones(Array.isArray(datos) ? datos : []);
      })
      .catch(() => {
        if (!vigente) return;
        setErrorCarga(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [reintento]);

  // Cuenta atrás real: se calcula contra la marca de vencimiento, no acumulando ticks
  useEffect(() => {
    if (venceEn === null) return undefined;

    const calcular = () => setRestante(Math.max(0, Math.ceil((venceEn - Date.now()) / 1000)));
    calcular();

    temporizadorRef.current = window.setInterval(calcular, 1000);
    return () => {
      if (temporizadorRef.current !== null) window.clearInterval(temporizadorRef.current);
    };
  }, [venceEn]);

  const ahora = useMemo(() => Date.now(), [sesiones]);
  const proximas = useMemo(
    () =>
      sesiones
        .filter((sesion) => new Date(sesion.startTime).getTime() >= ahora)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [sesiones, ahora],
  );
  const anteriores = useMemo(
    () =>
      sesiones
        .filter((sesion) => new Date(sesion.startTime).getTime() < ahora)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [sesiones, ahora],
  );

  const expirado = codigo !== '' && restante === 0;

  // Aviso para lectores de pantalla: cambia solo en los umbrales, no cada segundo
  const anuncio = expirado
    ? 'El código expiró. Genera uno nuevo para continuar.'
    : codigo !== '' && restante > 0 && restante <= AVISO_UMBRAL
      ? 'El código expira en menos de un minuto.'
      : '';

  const generar = useCallback(async () => {
    if (!sesionId) {
      toast.error('Selecciona una sesión primero.');
      return;
    }

    setGenerando(true);
    setCopiado(false);

    try {
      const datos = (await attendanceService.generateQrToken(sesionId)) as RespuestaQr;
      const nuevoCodigo = typeof datos?.code === 'string' ? datos.code : '';

      if (nuevoCodigo === '') {
        throw new Error('Respuesta sin código');
      }

      const vigencia =
        typeof datos.expiresIn === 'number' && datos.expiresIn > 0
          ? datos.expiresIn
          : VIGENCIA_POR_DEFECTO;

      setCodigo(nuevoCodigo);
      setRestante(vigencia);
      setVenceEn(Date.now() + vigencia * 1000);
      toast.success(`Código generado. Válido ${Math.round(vigencia / 60)} minutos.`);
    } catch (err) {
      const mensaje = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'No pudimos generar el código.')
        : 'No pudimos generar el código. Inténtalo de nuevo.';
      toast.error(mensaje);
    } finally {
      setGenerando(false);
    }
  }, [sesionId]);

  const copiar = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sin portapapeles');
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success('Código copiado.');
    } catch {
      // El portapapeles requiere contexto seguro: se explica en vez de fallar en silencio
      toast.error('Tu navegador no permitió copiar. Selecciona el texto y cópialo a mano.');
    }
  }, [codigo]);

  const etiqueta = (sesion: SessionView) =>
    `${sesion.cohort.course.title} · ${sesion.title} · ${formatFechaHora(sesion.startTime)}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Control de asistencia
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {cargando
            ? 'Cargando tus sesiones…'
            : sesiones.length === 0
              ? 'Todavía no tienes sesiones programadas en tus cursos.'
              : `${proximas.length} de ${sesiones.length} sesiones están por comenzar.`}
        </p>
      </header>

      {errorCarga && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/15"
        >
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            No pudimos cargar tus sesiones
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => setReintento((valor) => valor + 1)}
            className={`${BOTON_PRIMARIO} mt-4`}
          >
            Reintentar
          </button>
        </div>
      )}

      {!errorCarga && !cargando && sesiones.length === 0 && (
        <div className={PANEL}>
          <h2 className="text-base font-semibold text-lms-text dark:text-lms-text-dark">
            No hay sesiones para mostrar
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
            La asistencia se registra por sesión: primero crea una cohorte con sus sesiones y
            después vuelve aquí para generar el código.
          </p>
          <Link to="/manage" className={`${BOTON_SECUNDARIO} mt-4`}>
            Ir a Cohortes y sesiones
          </Link>
        </div>
      )}

      {!errorCarga && sesiones.length > 0 && (
        <section aria-labelledby="titulo-sesion" className={PANEL}>
          <h2
            id="titulo-sesion"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            1. Elige la sesión
          </h2>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xl">
              <label
                htmlFor="sesion-asistencia"
                className="block text-sm font-medium text-lms-text dark:text-lms-text-dark"
              >
                Sesión
              </label>
              <select
                id="sesion-asistencia"
                value={sesionId}
                onChange={(evento) => {
                  setSesionId(evento.target.value);
                  setCodigo('');
                  setVenceEn(null);
                  setRestante(0);
                }}
                className={`mt-1.5 ${CLASE_SELECT}`}
              >
                <option value="">-- Selecciona una sesión --</option>
                {proximas.length > 0 && (
                  <optgroup label="Próximas">
                    {proximas.map((sesion) => (
                      <option key={sesion.id} value={sesion.id}>
                        {etiqueta(sesion)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {anteriores.length > 0 && (
                  <optgroup label="Ya comenzadas">
                    {anteriores.map((sesion) => (
                      <option key={sesion.id} value={sesion.id}>
                        {etiqueta(sesion)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={generar}
              disabled={generando || sesionId === ''}
              className={BOTON_PRIMARIO}
            >
              {generando ? 'Generando…' : codigo === '' ? 'Generar código' : 'Generar otro código'}
            </button>
          </div>
        </section>
      )}

      {codigo !== '' && (
        <section aria-labelledby="titulo-qr" className={PANEL}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="titulo-qr"
              className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
            >
              2. Proyecta el código para tus estudiantes
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
              {expirado ? 'Código expirado' : `Válido ${formatearRestante(restante)}`}
            </p>
          </div>

          <p className="sr-only" aria-live="polite">
            {anuncio}
          </p>

          <div className="mt-5 flex flex-col gap-8 md:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div className="relative rounded-xl border border-lms-border bg-white p-4 dark:border-gray-600">
                <QRCodeSVG value={codigo} size={256} title="Código QR de asistencia" />
                {expirado && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90 px-6 text-center dark:bg-lms-dark-card/90">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                      El código expiró. Genera uno nuevo para que puedan escanearlo.
                    </p>
                  </div>
                )}
              </div>

              {expirado ? (
                <button
                  type="button"
                  onClick={generar}
                  disabled={generando}
                  className={BOTON_PRIMARIO}
                >
                  {generando ? 'Generando…' : 'Generar código nuevo'}
                </button>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  El código caduca solo; basta con generar otro cuando pase el tiempo.
                </p>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
                Código de texto (para quien no tiene cámara)
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Compártelo por chat o dictalo en voz alta; funciona igual que el QR.
              </p>
              <textarea
                readOnly
                value={codigo}
                rows={3}
                onFocus={(evento) => evento.currentTarget.select()}
                aria-label="Código de asistencia en texto"
                className="mt-3 w-full resize-none rounded-lg border border-lms-border bg-lms-bg p-3 font-code text-sm text-lms-text dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
              />
              <button type="button" onClick={copiar} className={`${BOTON_SECUNDARIO} mt-3 w-full`}>
                {copiado ? 'Copiado' : 'Copiar código'}
              </button>

              <div className="mt-5 rounded-lg bg-lms-bg p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <p className="font-semibold text-lms-text dark:text-lms-text-dark">
                  Qué deben hacer tus estudiantes
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Entrar a su sesión y abrir «Asistencia».</li>
                  <li>Escanear este código con la cámara o pegar el código de texto.</li>
                  <li>Confirmar el mensaje de registro en su pantalla.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
