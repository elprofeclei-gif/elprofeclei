import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { cohortSchema, type CohortInput } from '@elprofeclei/shared';
import { Modal } from '../Modal';
import { adminService, type CohorteAdminView } from '../../services/admin.service';
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  ETIQUETA,
  TEXTO_AYUDA,
  TEXTO_ERROR,
  claseCampo,
} from './clases';
import { MODOS_APROBACION, esModoAprobacion } from './tipos';
import { aISO, aValorLocal } from './fechas';
import { aplicarErroresDelServidor, extraerErrorApi, mensajeDeCampo } from './errores';

interface Props {
  abierto: boolean;
  cursoId: string;
  /** Cohorte a editar; null para crear una nueva. */
  cohorte: CohorteAdminView | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

// Crear y editar cohorte comparten formulario y validación (mismo esquema Zod que
// usa el backend, así que el error de campo coincide en ambos lados).
export function ModalCohorte({ abierto, cursoId, cohorte, onCerrar, onGuardado }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CohortInput>({
    resolver: zodResolver(cohortSchema),
    defaultValues: { approvalMode: 'AUTO', capacity: 10 },
  });

  useEffect(() => {
    if (!abierto) return;

    reset(
      cohorte
        ? {
            courseId: cursoId,
            name: cohorte.name,
            startDate: aValorLocal(cohorte.startDate),
            endDate: aValorLocal(cohorte.endDate),
            capacity: cohorte.capacity,
            approvalMode: esModoAprobacion(cohorte.approvalMode) ? cohorte.approvalMode : 'AUTO',
          }
        : {
            courseId: cursoId,
            name: '',
            startDate: '',
            endDate: '',
            capacity: 10,
            approvalMode: 'AUTO',
          },
    );

    // El Modal enfoca su primer control (la «×»): aquí se lleva el foco al dato
    setFocus('name');
  }, [abierto, cohorte, cursoId, reset, setFocus]);

  const enviar = handleSubmit(async (valores) => {
    if (!valores.startDate || !valores.endDate) {
      toast.error('Completa la fecha de inicio y la de fin.');
      return;
    }

    try {
      const datos = {
        name: valores.name.trim(),
        startDate: aISO(valores.startDate),
        endDate: aISO(valores.endDate),
        capacity: Number(valores.capacity),
        approvalMode: valores.approvalMode,
      };

      if (cohorte) {
        await adminService.updateCohort(cohorte.id, datos);
        toast.success('Cohorte actualizada');
      } else {
        await adminService.createCohort({ courseId: cursoId, ...datos });
        toast.success('Cohorte creada');
      }

      onGuardado();
    } catch (err) {
      const { mensaje, campos } = extraerErrorApi(err, 'No pudimos guardar la cohorte.');
      aplicarErroresDelServidor<CohortInput>(campos, setError);
      toast.error(mensaje);
    }
  });

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title={cohorte ? 'Editar cohorte' : 'Nueva cohorte'}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <input type="hidden" {...register('courseId')} value={cursoId} readOnly />

        <div>
          <label htmlFor="cohorte-nombre" className={ETIQUETA}>
            Nombre de la cohorte
          </label>
          <input
            id="cohorte-nombre"
            type="text"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'cohorte-nombre-error' : undefined}
            {...register('name')}
            className={claseCampo(Boolean(errors.name))}
            placeholder="Ej.: Promoción noviembre 2026"
          />
          {errors.name && (
            <p id="cohorte-nombre-error" role="alert" className={TEXTO_ERROR}>
              {mensajeDeCampo(errors.name.message, false, '', true)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cohorte-inicio" className={ETIQUETA}>
              Inicio
            </label>
            <input
              id="cohorte-inicio"
              type="datetime-local"
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate ? 'cohorte-inicio-error' : undefined}
              {...register('startDate')}
              className={claseCampo(Boolean(errors.startDate))}
            />
            {errors.startDate && (
              <p id="cohorte-inicio-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.startDate.message, false, '', true)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cohorte-fin" className={ETIQUETA}>
              Fin
            </label>
            <input
              id="cohorte-fin"
              type="datetime-local"
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? 'cohorte-fin-error' : undefined}
              {...register('endDate')}
              className={claseCampo(Boolean(errors.endDate))}
            />
            {errors.endDate && (
              <p id="cohorte-fin-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.endDate.message, false, '', true)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cohorte-cupo" className={ETIQUETA}>
              Cupo
            </label>
            <input
              id="cohorte-cupo"
              type="number"
              min={1}
              step={1}
              aria-invalid={Boolean(errors.capacity)}
              aria-describedby={errors.capacity ? 'cohorte-cupo-error' : undefined}
              {...register('capacity', { valueAsNumber: true })}
              className={claseCampo(Boolean(errors.capacity))}
            />
            {errors.capacity && (
              <p id="cohorte-cupo-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.capacity.message, false, '', true)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cohorte-aprobacion" className={ETIQUETA}>
              Aprobación de matrículas
            </label>
            <select
              id="cohorte-aprobacion"
              {...register('approvalMode')}
              className={claseCampo(Boolean(errors.approvalMode))}
            >
              {MODOS_APROBACION.map((modo) => (
                <option key={modo.valor} value={modo.valor}>
                  {modo.etiqueta}
                </option>
              ))}
            </select>
            <p className={TEXTO_AYUDA}>
              Automática activa la matrícula al confirmarse el pago; manual espera tu aprobación.
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className={BOTON_PRIMARIO}>
            {isSubmitting ? 'Guardando…' : cohorte ? 'Guardar cambios' : 'Crear cohorte'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
