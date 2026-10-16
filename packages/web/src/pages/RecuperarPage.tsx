import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import api from '../services/api';

const ENTRADA =
  'mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const ETIQUETA = 'block text-sm font-medium text-lms-text dark:text-lms-text-dark';
const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg';

// Recuperación de contraseña. El formulario ya habla con los endpoints definitivos
// (/auth/forgot-password y /auth/reset-password); si el servidor todavía no los tiene
// activados, se explica con precisión en vez de fingir que se envió el correo.
export function RecuperarPage() {
  const [correo, setCorreo] = useState('');
  // Si se llega desde el enlace del correo (/recuperar?codigo=…), el código ya viene puesto
  const [codigo, setCodigo] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('codigo') ?? '';
  });
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pendienteEnServidor, setPendienteEnServidor] = useState(false);

  const pedirEnlace = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError('');
    setMensaje('');

    try {
      await api.post('/auth/forgot-password', { email: correo });
      setMensaje(
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.',
      );
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setPendienteEnServidor(true);
        setError(
          'El servidor todavía no tiene activada la recuperación automática. Un administrador puede restablecer tu contraseña.',
        );
      } else {
        setError(
          isAxiosError<{ message: string }>(err)
            ? (err.response?.data?.message ?? 'No pudimos procesar la solicitud.')
            : 'No pudimos procesar la solicitud.',
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  const cambiarClave = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError('');
    setMensaje('');

    try {
      await api.post('/auth/reset-password', { codigo, clave });
      setMensaje('Contraseña actualizada. Ya puedes iniciar sesión con la nueva.');
    } catch (err) {
      setError(
        isAxiosError<{ message: string }>(err)
          ? (err.response?.data?.message ?? 'El enlace no es válido o ya expiró.')
          : 'El enlace no es válido o ya expiró.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text dark:text-lms-text-dark">
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Te enviamos un enlace de un solo uso, válido por 15 minutos.
        </p>
      </header>

      {pendienteEnServidor && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200"
        >
          Falta un paso del administrador para activar esta función (parche documentado en
          <span className="font-code"> docs/pendiente-recuperacion-contrasena.md</span>).
        </p>
      )}

      {mensaje !== '' && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          {mensaje}
        </p>
      )}

      {error !== '' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form
        onSubmit={pedirEnlace}
        className="flex flex-col gap-4 rounded-2xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
        noValidate
      >
        <h2 className="text-base font-semibold text-lms-text dark:text-lms-text-dark">
          Paso 1 · Pide el enlace
        </h2>
        <div>
          <label htmlFor="recuperar-correo" className={ETIQUETA}>
            Correo de tu cuenta
          </label>
          <input
            id="recuperar-correo"
            type="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            className={ENTRADA}
            placeholder="usuario@elprofeclei.com"
            required
          />
        </div>
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>

      <form
        onSubmit={cambiarClave}
        className="flex flex-col gap-4 rounded-2xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
        noValidate
      >
        <h2 className="text-base font-semibold text-lms-text dark:text-lms-text-dark">
          Paso 2 · Define la nueva contraseña
        </h2>
        <div>
          <label htmlFor="recuperar-codigo" className={ETIQUETA}>
            Código del enlace
          </label>
          <input
            id="recuperar-codigo"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            className={ENTRADA}
            placeholder="Pega aquí el código que recibiste"
            required
          />
        </div>
        <div>
          <label htmlFor="recuperar-clave" className={ETIQUETA}>
            Nueva contraseña
          </label>
          <input
            id="recuperar-clave"
            type="password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
            className={ENTRADA}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
        </div>
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
          {enviando ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        <Link
          to="/ingresar"
          className="font-semibold text-blue-700 hover:underline dark:text-vs-blue"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
