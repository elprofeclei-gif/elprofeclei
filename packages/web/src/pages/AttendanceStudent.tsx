import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { attendanceService } from '../services/attendance.service';

const PANEL =
  'rounded-xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:bg-vs-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-bg';
const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-bg';
const CLASE_INPUT =
  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text placeholder:text-gray-500 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

interface Resultado {
  tipo: 'exito' | 'error';
  mensaje: string;
}

const ID_LECTOR = 'lector-qr';

export function AttendanceStudent() {
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState('');
  const [codigoManual, setCodigoManual] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const campoManualRef = useRef<HTMLInputElement>(null);
  const registrarRef = useRef<(codigo: string) => Promise<void>>(async () => {});

  // Registra la asistencia con el código escaneado o pegado
  const registrar = useCallback(async (codigo: string) => {
    const limpio = codigo.trim();

    if (limpio === '') {
      setResultado({ tipo: 'error', mensaje: 'Pega el código de la sesión antes de registrar.' });
      campoManualRef.current?.focus();
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      await attendanceService.registerAttendance(limpio);
      setResultado({
        tipo: 'exito',
        mensaje: 'Asistencia registrada correctamente para esta sesión.',
      });
      setCodigoManual('');
      // Al terminar no tiene sentido seguir usando la cámara
      setCamaraActiva(false);
      toast.success('Asistencia registrada');
    } catch (err) {
      // El backend explica el motivo real: código inválido o expirado, sin matrícula
      // activa o asistencia ya registrada (409)
      const mensaje = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'No pudimos registrar la asistencia.')
        : 'No pudimos registrar la asistencia. Inténtalo de nuevo.';
      setResultado({ tipo: 'error', mensaje });
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  }, []);

  // El manejador de la cámara se guarda en un ref para no reiniciarla en cada render
  registrarRef.current = registrar;

  useEffect(() => {
    if (!camaraActiva) return undefined;

    const lector = new Html5Qrcode(ID_LECTOR);
    let vigente = true;

    lector
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (texto) => {
          void registrarRef.current(texto);
        },
        () => {
          /* fotogramas sin código: se ignoran a propósito */
        },
      )
      .then(() => {
        if (vigente) setIniciandoCamara(false);
      })
      .catch(() => {
        if (!vigente) return;
        setErrorCamara(
          'No pudimos usar la cámara. Revisa los permisos del navegador o registra tu asistencia con el código de texto.',
        );
        setCamaraActiva(false);
        setIniciandoCamara(false);
        // La vía manual pasa a ser la principal: se lleva el foco allí
        campoManualRef.current?.focus();
      });

    return () => {
      vigente = false;
      // Detiene y libera esta instancia concreta (evita peleas entre montajes)
      void lector
        .stop()
        .then(() => lector.clear())
        .catch(() => undefined);
    };
  }, [camaraActiva]);

  const activarCamara = () => {
    setErrorCamara('');
    setResultado(null);
    setIniciandoCamara(true);
    setCamaraActiva(true);
  };

  const enviarManual = async (evento: React.FormEvent) => {
    evento.preventDefault();
    await registrar(codigoManual);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Registrar asistencia
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Escanea el código QR de la sesión o pega el código de texto si no tienes cámara.
        </p>
      </header>

      {resultado && (
        <div
          role={resultado.tipo === 'exito' ? 'status' : 'alert'}
          aria-live="polite"
          className={
            resultado.tipo === 'exito'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-vs-green/30 dark:bg-vs-green/10'
              : 'rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/15'
          }
        >
          <p
            className={
              resultado.tipo === 'exito'
                ? 'text-sm font-semibold text-emerald-800 dark:text-vs-green'
                : 'text-sm font-semibold text-red-700 dark:text-red-400'
            }
          >
            {resultado.tipo === 'exito' ? 'Listo' : 'No se pudo registrar'}
          </p>
          <p
            className={
              resultado.tipo === 'exito'
                ? 'mt-1 text-sm text-emerald-800 dark:text-vs-green'
                : 'mt-1 text-sm text-red-700 dark:text-red-400'
            }
          >
            {resultado.mensaje}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section aria-labelledby="titulo-camara" className={PANEL}>
          <h2
            id="titulo-camara"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Escanear el código QR
          </h2>

          {errorCamara !== '' && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
              {errorCamara}
            </p>
          )}

          <div className="mt-4">
            {camaraActiva ? (
              <>
                <div
                  id={ID_LECTOR}
                  aria-label="Vista de la cámara para escanear el código"
                  className="w-full overflow-hidden rounded-lg border border-lms-border bg-black/5 dark:border-gray-600"
                />
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
                  {iniciandoCamara
                    ? 'Encendiendo la cámara…'
                    : 'Apunta al código QR que muestra tu instructor.'}
                </p>
                <button
                  type="button"
                  onClick={() => setCamaraActiva(false)}
                  className={`${BOTON_SECUNDARIO} mt-3 w-full`}
                >
                  Detener cámara
                </button>
              </>
            ) : (
              <button type="button" onClick={activarCamara} className={`${BOTON_PRIMARIO} w-full`}>
                Activar cámara
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-manual" className={PANEL}>
          <h2
            id="titulo-manual"
            className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Código de texto
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {errorCamara === ''
              ? 'Alternativa si la cámara no funciona: pega aquí el código que te comparta el instructor.'
              : 'Usa esta vía: pega el código que te comparta el instructor.'}
          </p>

          <form onSubmit={enviarManual} className="mt-4 flex flex-col gap-3">
            <label
              htmlFor="codigo-asistencia"
              className="text-sm font-medium text-lms-text dark:text-lms-text-dark"
            >
              Código de la sesión
            </label>
            <input
              id="codigo-asistencia"
              ref={campoManualRef}
              value={codigoManual}
              onChange={(evento) => setCodigoManual(evento.target.value)}
              placeholder="Pega el código aquí"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="ayuda-codigo"
              className={CLASE_INPUT}
            />
            <p id="ayuda-codigo" className="text-xs text-gray-600 dark:text-gray-400">
              El código caduca a los pocos minutos; si falla, pídele al instructor que genere otro.
            </p>
            <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
              {enviando ? 'Registrando…' : 'Registrar asistencia'}
            </button>
          </form>
        </section>
      </div>

      <section aria-labelledby="titulo-ayuda" className={PANEL}>
        <h2
          id="titulo-ayuda"
          className="text-base font-semibold text-lms-text dark:text-lms-text-dark"
        >
          Cómo funciona
        </h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Tu instructor proyecta el código de la sesión y te lo comparte.</li>
          <li>Escanéalo con la cámara o pega el código de texto en el formulario.</li>
          <li>Si el registro se hace, verás el mensaje de confirmación en esta pantalla.</li>
        </ol>
      </section>
    </div>
  );
}
