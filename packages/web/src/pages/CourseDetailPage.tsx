import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { adminService } from '../services/admin.service';
import { enrollmentsService } from '../services/enrollments.service';
import { couponsService, type CouponView } from '../services/coupons.service';
import type { CohortView } from '@elprofeclei/shared';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cohorts, setCohorts] = useState<CohortView[]>([]);
  const [message, setMessage] = useState('');

  // Estado de checkout
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponView | null>(null);
  const [basePrice] = useState(150000); // Precio simulado

  useEffect(() => {
    if (id) adminService.getCohortsByCourse(id).then(setCohorts).catch(console.error);
  }, [id]);

  const calculateFinalPrice = () => {
    if (!appliedCoupon) return basePrice;
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      return basePrice * (1 - appliedCoupon.discountValue / 100);
    }
    return Math.max(0, basePrice - appliedCoupon.discountValue);
  };

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
    try {
      if (appliedCoupon) {
        await couponsService.redeem(appliedCoupon.code);
      }
      await enrollmentsService.enroll(cohortId);
      setMessage(
        '✅ Matrícula exitosa! Precio final pagado: $' +
          calculateFinalPrice().toLocaleString('es-CO'),
      );
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? err.response?.data?.message || 'Error al matricularse'
        : 'Error al matricularse';
      setMessage(`❌ ${msg}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-lms-text dark:text-lms-text-dark">
          Detalles del Curso
        </h1>
        <Link
          to={`/course/${id}/assessments`}
          className="bg-vs-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
        >
          Ir a Evaluaciones
        </Link>
      </div>

      {message && (
        <p className="mb-4 p-3 rounded-lg bg-vs-blue/10 text-vs-blue font-semibold">{message}</p>
      )}

      {/* Sección de Checkout */}
      <div className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm mb-8">
        <h2 className="text-lg font-bold mb-4 text-lms-text dark:text-lms-text-dark">
          Resumen de Pago
        </h2>
        <div className="flex justify-between mb-4">
          <span className="text-lms-muted">Precio base:</span>
          <span className="font-bold text-lms-text dark:text-lms-text-dark">
            ${basePrice.toLocaleString('es-CO')}
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
            <p className="text-sm text-lms-muted">
              Descuento:{' '}
              {appliedCoupon.discountType === 'PERCENTAGE'
                ? `${appliedCoupon.discountValue}%`
                : `$${appliedCoupon.discountValue.toLocaleString('es-CO')}`}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-lms-border dark:border-gray-700">
          <span className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
            Total a pagar:
          </span>
          <span className="text-lg font-bold text-vs-blue">
            ${calculateFinalPrice().toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Lista de Cohortes */}
      <h2 className="text-xl font-bold mb-4 text-lms-text dark:text-lms-text-dark">
        Cohortes Disponibles
      </h2>
      <div className="space-y-4">
        {cohorts.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-lms-dark-card p-5 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex justify-between items-center"
          >
            <div>
              {/* AQUÍ MOSTRAMOS EL NOMBRE DE LA COHORTE */}
              <h3 className="font-bold text-lms-text dark:text-lms-text-dark">{c.name}</h3>
              <p className="text-sm text-lms-muted">
                Inicio: {new Date(c.startDate).toLocaleDateString()} - Fin:{' '}
                {new Date(c.endDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-lms-muted">
                Cupo: {c.capacity} | Aprobación: {c.approvalMode}
              </p>
            </div>
            <button
              onClick={() => handleEnroll(c.id)}
              className="bg-vs-green text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
            >
              Pagar y Matricularme
            </button>
          </div>
        ))}
        {cohorts.length === 0 && (
          <p className="text-lms-muted text-center py-10">No hay cohortes disponibles.</p>
        )}
      </div>
    </div>
  );
}
