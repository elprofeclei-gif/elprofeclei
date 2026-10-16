import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { coursesService, type CourseDetailView } from '../services/courses.service';
import { enrollmentsService, type PaymentMethodInput } from '../services/enrollments.service';
import { couponsService, type CouponView } from '../services/coupons.service';
import { useAuth } from '../hooks/useAuth';
import type { EnrollmentView } from '@elprofeclei/shared';

// Formato de moneda COP sin decimales
const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<EnrollmentView | null>(null);
  const [message, setMessage] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponView | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInput>('NEQUI');

  useEffect(() => {
    if (!id) return;
    coursesService
      .getCourse(id)
      .then(setCourse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-lms-muted text-center py-10">Cargando curso...</p>;
  if (!course) return <p className="text-lms-muted text-center py-10">Curso no encontrado.</p>;

  const basePrice = Number(course.price);
  const isFree = basePrice === 0;

  // Vista previa del total con cupón (el total definitivo lo calcula el servidor)
  const calculateFinalPrice = () => {
    if (!appliedCoupon) return basePrice;
    if (appliedCoupon.discountType === 'PERCENTAGE')
      return Math.round(basePrice * (1 - appliedCouponCouponSafeValue() / 100));
    return Math.max(0, basePrice - appliedCouponCouponSafeValue());
  };

  function appliedCouponCouponSafeValue(): number {
    return Number(appliedCoupon?.discountValue ?? 0);
  }

  const handleValidateCoupon = async () => {
    try {
      const res = await couponsService.validate(couponCode);
      setAppliedCoupon(res.coupon);
      toast.success('Cupón aplicado!');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error')
        : 'Error';
      toast.error(msg);
      setAppliedCoupon(null);
    }
  };

  const handleEnroll = async (cohortId: string) => {
    setMessage('');
    try {
      const enrollment = await enrollmentsService.enroll(
        cohortId,
        isFree ? undefined : paymentMethod,
        isFree ? undefined : appliedCoupon?.code,
      );
      setEnrolled(enrollment);

      if (enrollment.status === 'ACTIVE') {
        setMessage('✅ ¡Tu matrícula está activa! Ya puedes ir a Evaluaciones.');
        toast.success('Matrícula activa');
      } else if (enrollment.status === 'PENDING_PAYMENT') {
        setMessage(
          `🧾 Prematrícula generada. Referencia de pago: ${enrollment.payment?.reference}. Realiza el pago para activar tu cupo.`,
        );
        toast.success('Prematrícula generada');
      } else if (enrollment.status === 'PENDING_APPROVAL') {
        setMessage('⏳ Matrícula registrada. Queda pendiente de aprobación del instructor.');
        toast.success('Matrícula registrada');
      }
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? err.response?.data?.message || 'Error al matricularse'
        : 'Error al matricularse';
      setMessage(`❌ ${msg}`);
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cabecera del curso */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-lms-text dark:text-lms-text-dark mb-2">
          {course.title}
        </h1>
        <p className="text-lms-muted">{course.description}</p>
        <p className="text-sm text-lms-muted mt-2">
          Instructor: {course.instructor.firstName} {course.instructor.lastName} · Modalidad:{' '}
          {course.modality}
        </p>
      </div>

      {message && (
        <p className="mb-4 p-3 rounded-lg bg-vs-blue/10 text-vs-blue font-semibold">{message}</p>
      )}

      {/* Resumen de pago: solo para cursos de pago */}
      {!isFree && (
        <div className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm mb-8">
          <h2 className="text-lg font-bold mb-4 text-lms-text dark:text-lms-text-dark">
            Resumen de Pago
          </h2>
          <div className="flex justify-between mb-4">
            <span className="text-lms-muted">Precio base:</span>
            <span className="font-bold text-lms-text dark:text-lms-text-dark">
              {formatCOP(basePrice)}
            </span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 uppercase"
              placeholder="CÓDIGO DE CUPÓN"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              onClick={handleValidateCoupon}
              className="bg-vs-yellow text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
            >
              Aplicar
            </button>
          </div>

          {appliedCoupon && (
            <div className="mb-4 p-3 bg-vs-green/10 rounded-lg">
              <p className="text-sm text-vs-green font-semibold">
                Cupón aplicado: {appliedCoupon.code}
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-lms-border dark:border-gray-700 mb-6">
            <span className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
              Total a pagar:
            </span>
            <span className="text-lg font-bold text-vs-blue">
              {formatCOP(calculateFinalPrice())}
            </span>
          </div>

          {/* Selección de método de pago */}
          <h3 className="text-sm font-bold text-lms-muted uppercase mb-3">Método de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => setPaymentMethod('ONLINE')}
              className={`p-4 border rounded-xl text-left ${
                paymentMethod === 'ONLINE' ? 'border-vs-blue bg-vs-blue/5' : 'border-lms-border'
              }`}
            >
              <p className="font-bold text-lms-text dark:text-lms-text-dark">💳 Tarjeta</p>
              <p className="text-xs text-lms-muted mt-1">
                Pago con confirmación manual mientras integramos la pasarela.
              </p>
            </button>
            <button
              onClick={() => setPaymentMethod('NEQUI')}
              className={`p-4 border rounded-xl text-left ${
                paymentMethod === 'NEQUI' ? 'border-vs-blue bg-vs-blue/5' : 'border-lms-border'
              }`}
            >
              <p className="font-bold text-lms-text dark:text-lms-text-dark">📱 Nequi</p>
              <p className="text-xs text-lms-muted mt-1">Transferencia desde tu celular.</p>
            </button>
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`p-4 border rounded-xl text-left ${
                paymentMethod === 'CASH' ? 'border-vs-blue bg-vs-blue/5' : 'border-lms-border'
              }`}
            >
              <p className="font-bold text-lms-text dark:text-lms-text-dark">🏪 Efectivo</p>
              <p className="text-xs text-lms-muted mt-1">Pago en la sede con tu referencia.</p>
            </button>
          </div>

          {/* Instrucciones dinámicas según el método elegido */}
          <div className="bg-lms-bg dark:bg-gray-800 p-4 rounded-lg mb-2 text-sm text-lms-text dark:text-lms-text-dark">
            {paymentMethod === 'NEQUI' && (
              <>
                <p>
                  Realiza la transferencia por valor de{' '}
                  <strong>{formatCOP(calculateFinalPrice())}</strong> al número Nequi:{' '}
                  <strong>3100000000</strong>.
                </p>
                <p className="mt-2 text-lms-muted">
                  Al generar la prematrícula recibirás una <strong>referencia de pago</strong>;
                  inclúyela en el concepto de la transferencia. El instructor confirmará tu pago.
                </p>
              </>
            )}
            {paymentMethod === 'CASH' && (
              <p>
                Dirígete a la sede principal con tu <strong>referencia de pago</strong> para
                cancelar en efectivo. El instructor confirmará tu pago.
              </p>
            )}
            {paymentMethod === 'ONLINE' && (
              <p>
                Genera la prematrícula y envía el comprobante de tu transferencia con la{' '}
                <strong>referencia de pago</strong>. El instructor confirmará tu pago.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista de Cohortes */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-lms-text dark:text-lms-text-dark">
          Cohortes Disponibles
        </h2>
        <Link
          to={`/course/${id}/assessments`}
          className="text-vs-blue text-sm font-semibold hover:underline"
        >
          Ir a Evaluaciones →
        </Link>
      </div>
      <div className="space-y-4">
        {course.cohorts.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-lms-dark-card p-5 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3"
          >
            <div>
              <h3 className="font-bold text-lms-text dark:text-lms-text-dark">{c.name}</h3>
              <p className="text-sm text-lms-muted">
                Inicio: {new Date(c.startDate).toLocaleDateString()} - Fin:{' '}
                {new Date(c.endDate).toLocaleDateString()} ·{' '}
                {c.approvalMode === 'MANUAL' ? 'Aprobación manual' : 'Aprobación automática'}
              </p>
            </div>
            {user ? (
              <button
                onClick={() => handleEnroll(c.id)}
                disabled={!!enrolled}
                className="bg-vs-green text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isFree
                  ? 'Matricularme (Gratis)'
                  : enrolled
                    ? 'Matrícula generada'
                    : 'Generar Prematrícula'}
              </button>
            ) : (
              <Link
                to="/ingresar"
                className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-800 whitespace-nowrap dark:bg-vs-blue dark:text-vs-bg"
              >
                Inicia sesión para matricularte
              </Link>
            )}
          </div>
        ))}
        {course.cohorts.length === 0 && (
          <p className="text-lms-muted text-center py-10">No hay cohortes disponibles.</p>
        )}
      </div>
    </div>
  );
}
