import { useEffect, useState } from 'react';
import { certificatesService, type CertificateView } from '../services/certificates.service';
import { Logo } from '../components/Logo';

export function CertificatesPage() {
  const [certs, setCerts] = useState<CertificateView[]>([]);

  useEffect(() => {
    certificatesService.getMine().then(setCerts).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Mis Certificados
      </h1>

      {certs.length === 0 ? (
        <p className="text-lms-muted">Aún no has completado ningún curso.</p>
      ) : (
        <div className="space-y-6">
          {certs.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-lms-dark-card p-8 rounded-2xl border-2 border-vs-blue/30 shadow-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <Logo />
                <div className="text-right">
                  <p className="text-xs text-lms-muted">Código de Verificación</p>
                  <p className="font-mono font-bold text-vs-blue">{c.verificationCode}</p>
                </div>
              </div>

              <div className="text-center py-8 border-y border-lms-border dark:border-gray-700">
                <p className="text-sm text-lms-muted uppercase tracking-wider mb-2">
                  Certifica que
                </p>
                <h2 className="text-3xl font-bold text-lms-text dark:text-lms-text-dark mb-4">
                  {c.enrollment.user.firstName} {c.enrollment.user.lastName}
                </h2>
                <p className="text-lms-muted mb-2">ha completado satisfactoriamente el curso</p>
                <h3 className="text-xl font-bold text-vs-blue">
                  {c.enrollment.cohort.course.title}
                </h3>
                <p className="text-sm text-lms-muted mt-2">
                  Duración: {c.enrollment.cohort.course.duration} horas
                </p>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div>
                  <p className="text-xs text-lms-muted">Fecha de emisión</p>
                  <p className="font-semibold text-lms-text dark:text-lms-text-dark">
                    {new Date(c.issuedAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-vs-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors print:hidden"
                >
                  Descargar / Imprimir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
