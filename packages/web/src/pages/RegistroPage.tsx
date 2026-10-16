import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@elprofeclei/shared';
import { useAuth } from '../hooks/useAuth';

const ENTRADA =
  'mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-lms-text placeholder:text-gray-500 dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';
const ETIQUETA = 'block text-sm font-medium text-lms-text dark:text-lms-text-dark';
const ERROR = 'mt-1.5 text-xs text-red-600 dark:text-red-400';

// Registro público con consentimiento Ley 1581: sin esta pantalla nadie podía
// crear su cuenta y la plataforma no captaba estudiantes.
export function RegistroPage() {
  const { register: registrar, error } = useAuth();
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const enviar = async (datos: RegisterInput) => {
    await registrar(datos);
    setEnviado(true);
    // Al completarse el registro, AuthContext ya tiene la sesión y App muestra el campus
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-lms-text dark:text-lms-text-dark">
        Crear tu cuenta
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Es gratis. Con tu cuenta entras al campus virtual, al aula de tus cursos y a tus
        certificados.
      </p>

      <form
        onSubmit={handleSubmit(enviar)}
        className="mt-6 flex flex-col gap-4 rounded-2xl border border-lms-border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
        noValidate
      >
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="registro-nombre" className={ETIQUETA}>
              Nombre
            </label>
            <input
              id="registro-nombre"
              aria-invalid={Boolean(errors.firstName)}
              {...register('firstName')}
              className={ENTRADA}
              placeholder="Ana"
            />
            {errors.firstName && (
              <p role="alert" className={ERROR}>
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="registro-apellido" className={ETIQUETA}>
              Apellido
            </label>
            <input
              id="registro-apellido"
              aria-invalid={Boolean(errors.lastName)}
              {...register('lastName')}
              className={ENTRADA}
              placeholder="Gómez"
            />
            {errors.lastName && (
              <p role="alert" className={ERROR}>
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="registro-correo" className={ETIQUETA}>
            Correo electrónico
          </label>
          <input
            id="registro-correo"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
            className={ENTRADA}
            placeholder="ana@correo.com"
          />
          {errors.email && (
            <p role="alert" className={ERROR}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="registro-clave" className={ETIQUETA}>
            Contraseña
          </label>
          <input
            id="registro-clave"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="registro-clave-ayuda"
            {...register('password')}
            className={ENTRADA}
            placeholder="Mínimo 8 caracteres"
          />
          <p id="registro-clave-ayuda" className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
            Usa al menos 8 caracteres.
          </p>
          {errors.password && (
            <p role="alert" className={ERROR}>
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-lms-bg p-3 dark:bg-gray-800">
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              aria-invalid={Boolean(errors.consent)}
              {...register('consent')}
            />
            <span>
              Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012
              (consentimiento informado para el uso académico y administrativo).
            </span>
          </label>
          {errors.consent && (
            <p role="alert" className={ERROR}>
              {errors.consent.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || enviado}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg"
        >
          {isSubmitting ? 'Creando tu cuenta…' : enviado ? 'Cuenta creada' : 'Crear cuenta'}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-blue-700 hover:underline dark:text-vs-blue"
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
