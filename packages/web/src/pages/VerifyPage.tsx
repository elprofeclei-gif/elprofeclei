import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { isAxiosError } from 'axios';
import { certificatesService, type CertificadoVerificado } from '../services/certificates.service';
import { Logo } from '../components/Logo';
import { formatFecha } from '../utils/format';

const DURACION: Record<string, string> = {
  EIGHT: '8 horas',
  TEN: '10 horas',
  SIXTEEN: '16 horas',
  TWENTY: '20 horas',
};

const BOTON_SECUNDARIO =
  'inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:bg-lms-dark-card dark:text-lms-text-dark dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

// Verificación pública: cualquiera con el código puede comprobar que el
// certificado es auténtico y ver la asistencia y las evaluaciones reales.
export function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [certificado, setCertificado] = useState<CertificadoVerificado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    let vigente = true;

    certificatesService
      .verify(code)
      .then((datos) => {
        if (vigente) setCertificado(datos);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(
          isAxiosError<{ message: string }>(err)
            ? (err.response?.data?.message ?? 'No pudimos verificar el certificado.')
            : 'No pudimos verificar el certificado.',
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [code]);

  if (cargando) {
    return (
      <p role="status" className="py-16 text-center text-lms-muted dark:text-gray-400">
        Verificando el certificado…
      </p>
    );
  }

  if (error !== '' || !certificado) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/15"
      >
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          {error || 'Certificado no encontrado.'}
        </p>
        <Link to="/" className={`${BOTON_SECUNDARIO} mt-4`}>
          Volver a la plataforma
        </Link>
      </div>
    );
  }

  const { enrollment } = certificado;
  const curso = enrollment.cohort.course;
  const urlVerificacion = `${window.location.origin}/verify/${certificado.verificationCode}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-imprimir mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm font-medium text-blue-700 hover:underline dark:text-vs-blue"
        >
          ← Volver a la plataforma
        </Link>
        <button type="button" onClick={() => window.print()} className={BOTON_SECUNDARIO}>
          Imprimir esta verificación
        </button>
      </div>

      <div className="hoja-certificado rounded-2xl border-2 border-lms-border bg-white p-8 text-lms-text shadow-sm sm:p-12">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
          <Logo />
          <div className="text-right">
            <p className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Certificado válido
            </p>
            <p className="mt-2 font-code text-sm font-semibold text-blue-700">
              {certificado.verificationCode}
            </p>
          </div>
        </div>

        <div className="py-10 text-center">
          <p className="text-sm text-gray-500">Se certifica que</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {enrollment.user.firstName} {enrollment.user.lastName}
          </p>
          <p className="mt-4 text-sm text-gray-500">completó satisfactoriamente el curso</p>
          <p className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl">{curso.title}</p>
          <p className="mt-6 text-sm text-gray-600">
            {DURACION[curso.duration] ?? curso.duration} · Cohorte {enrollment.cohort.name}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Del {formatFecha(enrollment.cohort.startDate)} al{' '}
            {formatFecha(enrollment.cohort.endDate)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Asistencia registrada</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {certificado.asistencia.asistidas}/{certificado.asistencia.sesiones} sesiones (
              {certificado.asistencia.porcentaje}%)
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Evaluaciones</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {certificado.evaluaciones.entregadas} de {certificado.evaluaciones.total} entregadas
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Nota media</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {certificado.evaluaciones.promedio === null
                ? 'Sin calificar'
                : `${certificado.evaluaciones.promedio}%`}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-gray-200 pt-6">
          <div>
            <p className="text-xs text-gray-500">Instructor</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {curso.instructor.firstName} {curso.instructor.lastName}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Emitido el {formatFecha(certificado.issuedAt)}
            </p>
          </div>

          <div className="flex items-end gap-4">
            <p className="font-code max-w-[16rem] text-xs break-all text-blue-700">
              {urlVerificacion}
            </p>
            <div className="rounded-lg border border-gray-200 bg-white p-2">
              <QRCodeSVG
                value={urlVerificacion}
                size={96}
                level="M"
                title="Código QR de verificación"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
