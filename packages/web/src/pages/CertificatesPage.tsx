import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { certificatesService, type CertificadoEntrega } from '../services/certificates.service';
import { Skeleton } from '../components/Skeleton';
import { formatFecha } from '../utils/format';

const DURACION: Record<string, string> = {
  EIGHT: '8 horas',
  TEN: '10 horas',
  SIXTEEN: '16 horas',
  TWENTY: '20 horas',
};

const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

export function CertificatesPage() {
  const [certificados, setCertificados] = useState<CertificadoEntrega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    certificatesService
      .getMine()
      .then((datos) => {
        if (vigente) setCertificados(Array.isArray(datos) ? datos : []);
      })
      .catch(() => {
        if (vigente)
          setError('No pudimos cargar tus certificados. Recarga la página para reintentar.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-lms-text sm:text-3xl dark:text-lms-text-dark">
          Mis certificados
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Cada certificado tiene un código público de verificación y se puede imprimir o guardar
          como PDF.
        </p>
      </header>

      {cargando ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Skeleton />
          <Skeleton />
        </div>
      ) : error !== '' ? (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : certificados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lms-border bg-white p-8 text-center dark:border-gray-600 dark:bg-lms-dark-card">
          <p className="text-sm font-semibold text-lms-text dark:text-lms-text-dark">
            Todavía no tienes certificados
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-lms-muted dark:text-gray-400">
            Al completar los requisitos de una cohorte (asistencia, entregas y nota media), tu
            instructor podrá emitir tu certificado.
          </p>
          <Link to="/campus" className={`${BOTON_PRIMARIO} mt-5`}>
            Ver mi avance
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {certificados.map((certificado) => {
            const curso = certificado.enrollment.cohort.course;

            return (
              <article
                key={certificado.id}
                className="flex flex-col justify-between rounded-xl border border-lms-border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-lms-dark-card"
              >
                <div>
                  <p className="text-xs font-semibold tracking-[0.15em] text-gray-500 uppercase dark:text-gray-400">
                    Certificado
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-lms-text dark:text-lms-text-dark">
                    {curso.title}
                  </h2>
                  <p className="mt-1 text-xs text-lms-muted dark:text-gray-400">
                    {certificado.enrollment.cohort.name} ·{' '}
                    {DURACION[curso.duration] ?? curso.duration} · emitido el{' '}
                    {formatFecha(certificado.issuedAt)}
                  </p>
                  <p className="mt-3 font-code text-sm font-semibold text-blue-700 dark:text-vs-blue">
                    {certificado.verificationCode}
                  </p>
                </div>

                <Link
                  to={`/certificados/${certificado.verificationCode}`}
                  className={`${BOTON_PRIMARIO} mt-4`}
                >
                  Ver e imprimir
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
