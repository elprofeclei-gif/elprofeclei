import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isAxiosError } from 'axios'; // <-- AÑADE ESTA LÍNEA
import { certificatesService, type CertificateView } from '../services/certificates.service';
import { Logo } from '../components/Logo';

export function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<CertificateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      certificatesService
        .verify(code)
        .then(setCert)
        .catch((err) => {
          const msg = isAxiosError<{ message: string }>(err)
            ? (err.response?.data?.message ?? 'Error')
            : 'Error';
          setError(msg);
        })
        .finally(() => setLoading(false));
    }
  }, [code]);

  if (loading) return <div className="p-10 text-center">Verificando...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lms-bg dark:bg-lms-dark-bg p-6">
      <div className="bg-white dark:bg-lms-dark-card p-8 rounded-2xl border-2 border-vs-green/30 shadow-lg max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <Logo />
          <span className="bg-vs-green/20 text-vs-green px-3 py-1 rounded-full text-xs font-bold">
            CERTIFICADO VÁLIDO
          </span>
        </div>

        <div className="text-center py-8 border-y border-lms-border dark:border-gray-700">
          <p className="text-sm text-lms-muted uppercase tracking-wider mb-2">Se certifica que</p>
          <h2 className="text-3xl font-bold text-lms-text dark:text-lms-text-dark mb-4">
            {cert?.enrollment.user.firstName} {cert?.enrollment.user.lastName}
          </h2>
          <p className="text-lms-muted mb-2">ha completado satisfactoriamente el curso</p>
          <h3 className="text-xl font-bold text-vs-blue">{cert?.enrollment.cohort.course.title}</h3>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div>
            <p className="text-xs text-lms-muted">Código de Verificación</p>
            <p className="font-mono font-bold text-vs-blue">{cert?.verificationCode}</p>
          </div>
          <Link to="/" className="text-vs-blue hover:underline text-sm">
            Volver a la plataforma
          </Link>
        </div>
      </div>
    </div>
  );
}
