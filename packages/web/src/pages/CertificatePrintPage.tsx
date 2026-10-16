import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { isAxiosError } from 'axios';
import { certificatesService, type CertificadoEntrega } from '../services/certificates.service';
import { Logo } from '../components/Logo';
import { formatFecha } from '../utils/format';

const DURACION: Record<string, string> = {
  EIGHT: '8 horas',
  TEN: '10 horas',
  SIXTEEN: '16 horas',
  TWENTY: '20 horas',
};

const MODALIDAD: Record<string, string> = {
  VIRTUAL: 'Virtual',
  ONSITE: 'Presencial',
  HYBRID: 'Híbrida',
};

const BOTON_PRIMARIO =
  'inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue';

// Certificado propio listo para imprimir o guardar como PDF desde el navegador
// (sin dependencias de generación de PDF: el navegador hace ese trabajo).
export function CertificatePrintPage() {
  const { code } = useParams<{ code: string }>();
  const [certificado, setCertificado] = useState<CertificadoEntrega | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    let vigente = true;
    setCargando(true);

    certificatesService
      .getMioPorCodigo(code)
      .then((datos) => {
        if (vigente) setCertificado(datos);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(
          isAxiosError<{ message: string }>(err)
            ? (err.response?.data?.message ?? 'No pudimos cargar el certificado.')
            : 'No pudimos cargar el certificado.',
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
        Cargando el certificado…
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
        <Link to="/certificates" className={`${BOTON_PRIMARIO} mt-4`}>
          Volver a mis certificados
        </Link>
      </div>
    );
  }

  const { enrollment } = certificado;
  const curso = enrollment.cohort.course;
  const urlVerificacion = `${window.location.origin}/verify/${certificado.verificationCode}`;
  const horas = DURACION[curso.duration] ?? '';
  const modalidad = MODALIDAD[curso.modality] ?? curso.modality;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-imprimir mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/certificates"
          className="text-sm font-medium text-blue-700 hover:underline dark:text-vs-blue"
        >
          ← Mis certificados
        </Link>
        <button type="button" onClick={() => window.print()} className={BOTON_PRIMARIO}>
          Imprimir o guardar como PDF
        </button>
      </div>

      <div className="hoja-certificado rounded-2xl border-2 border-lms-border bg-white p-8 text-lms-text shadow-sm sm:p-12">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
          <Logo />
          <div className="text-right">
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
              Certificado de finalización
            </p>
            <p className="mt-1 font-code text-sm font-semibold text-blue-700">
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
            {horas ? `${horas} · ` : ''}
            {modalidad} · Cohorte {enrollment.cohort.name}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Del {formatFecha(enrollment.cohort.startDate)} al{' '}
            {formatFecha(enrollment.cohort.endDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-gray-200 pt-6">
          <div>
            <p className="text-xs text-gray-500">Instructor</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {curso.instructor.firstName} {curso.instructor.lastName}
            </p>
            <div className="mt-6 w-56 border-t border-gray-400" />
            <p className="mt-1 text-xs text-gray-500">Firma del instructor</p>
          </div>

          <div className="flex items-end gap-5">
            <div className="text-right">
              <p className="text-xs text-gray-500">Emitido el</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatFecha(certificado.issuedAt)}
              </p>
              <p className="mt-4 text-xs text-gray-500">Verifícalo en</p>
              <p className="font-code text-xs break-all text-blue-700">{urlVerificacion}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-2">
              <QRCodeSVG
                value={urlVerificacion}
                size={112}
                level="M"
                title="Código QR de verificación"
              />
            </div>
          </div>
        </div>
      </div>

      <p className="no-imprimir mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
        Al imprimir, elige «Guardar como PDF» para conservar el certificado en tu equipo.
      </p>
    </div>
  );
}
