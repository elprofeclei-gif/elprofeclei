import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { couponsService, type CouponView } from '../services/coupons.service';
import type { CouponInput } from '@elprofeclei/shared';

export function CouponsAdmin() {
  const [coupons, setCoupons] = useState<CouponView[]>([]);

  const [form, setForm] = useState<CouponInput>({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    validFrom: '',
    validUntil: '',
    maxUses: 100,
    assignedToId: null,
  });

  const loadCoupons = () => couponsService.getAll().then(setCoupons).catch(console.error);

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await couponsService.create({
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
      });
      toast.success('Cupón creado exitosamente!');
      setForm({ ...form, code: '', validFrom: '', validUntil: '' });
      loadCoupons();
    } catch (err) {
      const msg = isAxiosError<{ message: string }>(err)
        ? (err.response?.data?.message ?? 'Error al crear cupón')
        : 'Error al crear cupón';
      toast.error(msg);
    }
  };

  const inputClass =
    'bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-vs-blue';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-lms-text dark:text-lms-text-dark">
        Gestión de Cupones y Becas
      </h1>

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-lms-dark-card p-6 rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm flex flex-col gap-4 mb-8 max-w-2xl"
      >
        <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark">
          Crear Nuevo Cupón
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-lms-muted">Código del Cupón</label>
            <input
              className={inputClass + ' w-full uppercase'}
              placeholder="VERANO50"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-lms-muted">Tipo de Descuento</label>
            <select
              className={inputClass + ' w-full'}
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as CouponInput['discountType'] })
              }
            >
              <option value="PERCENTAGE">Porcentaje (%)</option>
              <option value="FIXED">Monto Fijo (COP)</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-lms-muted">Valor de Descuento</label>
            <input
              type="number"
              className={inputClass + ' w-full'}
              placeholder="50"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-lms-muted">Usos Máximos</label>
            <input
              type="number"
              className={inputClass + ' w-full'}
              placeholder="100"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-lms-muted">Válido Desde</label>
            <input
              type="datetime-local"
              className={inputClass + ' w-full'}
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-lms-muted">Válido Hasta</label>
            <input
              type="datetime-local"
              className={inputClass + ' w-full'}
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-vs-blue text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors mt-2"
        >
          Crear Cupón
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4 text-lms-text dark:text-lms-text-dark">
        Cupones Activos
      </h2>
      <div className="space-y-3">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-lms-dark-card p-4 rounded-xl border border-lms-border dark:border-gray-700 shadow-sm flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold text-lms-text dark:text-lms-text-dark font-mono">
                {c.code}
              </h3>
              <p className="text-sm text-lms-muted">
                {c.discountType === 'PERCENTAGE'
                  ? c.discountValue + '% de descuento'
                  : '$' + c.discountValue.toLocaleString('es-CO') + ' de descuento'}
                {' | Usos: '}
                {c.usedCount}/{c.maxUses}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-lms-muted">Vence:</p>
              <p className="font-semibold text-lms-text dark:text-lms-text-dark">
                {new Date(c.validUntil).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-lms-muted">No hay cupones creados.</p>}
      </div>
    </div>
  );
}
