import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { courseSchema, type CourseInput, type CourseView } from '@elprofeclei/shared';
import { Modal } from './Modal';
import { coursesService } from '../services/courses.service';
import { formatCOP } from '../utils/format';

interface CourseFormModalProps {
  /** Curso a editar; si no se pasa, el formulario crea uno nuevo. */
  curso?: CourseView;
  onClose: () => void;
  /** Se ejecuta tras guardar: el panel cierra el modal y refresca la lista. */
  onSaved: () => Promise<void> | void;
}

const FOCO =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-lms-bg ' +
  'dark:focus-visible:ring-vs-blue dark:focus-visible:ring-offset-lms-dark-card';

const ETIQUETA = 'mb-1.5 block text-sm font-medium text-lms-text dark:text-lms-text-dark';
const TEXTO_ERROR = 'mt-1.5 text-xs text-red-600 dark:text-red-400';
const TEXTO_AYUDA = 'mt-1.5 text-xs text-lms-muted dark:text-gray-400';

const claseCampo = (invalido: boolean): string =>
  `w-full rounded-lg border bg-lms-bg p-2.5 text-sm text-lms-text transition-shadow motion-reduce:transition-none dark:bg-gray-800 dark:text-lms-text-dark ${FOCO} ${
    invalido ? 'border-red-500 dark:border-red-400' : 'border-lms-border dark:border-gray-600'
  }`;

const BOTON_PRIMARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white transition-colors motion-reduce:transition-none hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vs-blue dark:text-vs-bg dark:hover:brightness-110 ${FOCO}`;

const BOTON_SECUNDARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-lms-border bg-white px-5 text-sm font-medium text-lms-text transition-colors motion-reduce:transition-none hover:bg-lms-bg disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark dark:hover:bg-gray-700 ${FOCO}`;

const mensajeDeError = (err: unknown): string => {
  if (isAxiosError<{ message: string }>(err)) {
    return (
      err.response?.data?.message ??
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
  }
  return 'Ocurrió un error inesperado al guardar el curso.';
};

export function CourseFormModal({ curso, onClose, onSaved }: CourseFormModalProps) {
  const esEdicion = Boolean(curso);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    // Valida al salir del campo y revalida al teclear una vez invalidado
    mode: 'onTouched',
    defaultValues: {
      title: curso?.title ?? '',
      description: curso?.description ?? '',
      // /courses/mine devuelve los enums de Prisma: sus valores son válidos
      modality: (curso?.modality as CourseInput['modality'] | undefined) ?? 'VIRTUAL',
      duration: (curso?.duration as CourseInput['duration'] | undefined) ?? 'EIGHT',
      price: Number(curso?.price ?? 0),
    },
  });

  const precioVisto = watch('price');
  const precioValido = Number.isFinite(precioVisto) && precioVisto >= 0;

  // Con valueAsNumber un campo vacío llega como NaN y zod devuelve un mensaje
  // técnico en inglés; se sustituye por una indicación accionable en español.
  const mensajePrecio = errors.price
    ? Number.isNaN(precioVisto)
      ? 'Ingresa el precio en COP usando solo dígitos (0 si el curso es gratuito).'
      : errors.price.message
    : undefined;

  const onSubmit = async (data: CourseInput) => {
    try {
      if (curso) {
        // El backend solo acepta título, descripción y precio en el PATCH;
        // modalidad y duración se muestran bloqueadas por eso.
        await coursesService.update(curso.id, {
          title: data.title,
          description: data.description,
          price: data.price,
        });
        toast.success('Curso actualizado');
      } else {
        await coursesService.create(data);
        toast.success('Curso creado');
      }
      await onSaved();
    } catch (err) {
      // El formulario conserva lo escrito: nadie reingresa datos por un error
      toast.error(mensajeDeError(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={esEdicion ? 'Editar curso' : 'Crear curso'}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex max-h-[calc(100vh-11rem)] flex-col gap-5 overflow-y-auto"
      >
        <div>
          <label htmlFor="curso-titulo" className={ETIQUETA}>
            Título
          </label>
          <input
            id="curso-titulo"
            type="text"
            autoComplete="off"
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? 'curso-titulo-error' : undefined}
            {...register('title')}
            className={claseCampo(Boolean(errors.title))}
          />
          {errors.title && (
            <p id="curso-titulo-error" role="alert" className={TEXTO_ERROR}>
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="curso-descripcion" className={ETIQUETA}>
            Descripción
          </label>
          <textarea
            id="curso-descripcion"
            rows={3}
            aria-invalid={errors.description ? 'true' : undefined}
            aria-describedby={errors.description ? 'curso-descripcion-error' : undefined}
            {...register('description')}
            className={claseCampo(Boolean(errors.description))}
          />
          {errors.description && (
            <p id="curso-descripcion-error" role="alert" className={TEXTO_ERROR}>
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="curso-modalidad" className={ETIQUETA}>
              Modalidad
            </label>
            <select
              id="curso-modalidad"
              disabled={esEdicion}
              aria-describedby={esEdicion ? 'curso-modalidad-ayuda' : undefined}
              {...register('modality')}
              className={claseCampo(false)}
            >
              <option value="VIRTUAL">Virtual</option>
              <option value="ONSITE">Presencial</option>
              <option value="HYBRID">Híbrido</option>
            </select>
            {esEdicion && (
              <p id="curso-modalidad-ayuda" className={TEXTO_AYUDA}>
                La modalidad se define al crear el curso y no se puede cambiar después.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="curso-duracion" className={ETIQUETA}>
              Duración
            </label>
            <select
              id="curso-duracion"
              disabled={esEdicion}
              aria-describedby={esEdicion ? 'curso-duracion-ayuda' : undefined}
              {...register('duration')}
              className={claseCampo(false)}
            >
              <option value="EIGHT">8 horas</option>
              <option value="TEN">10 horas</option>
              <option value="SIXTEEN">16 horas</option>
              <option value="TWENTY">20 horas</option>
            </select>
            {esEdicion && (
              <p id="curso-duracion-ayuda" className={TEXTO_AYUDA}>
                La duración se define al crear el curso y no se puede cambiar después.
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="curso-precio" className={ETIQUETA}>
            Precio (COP)
          </label>
          <input
            id="curso-precio"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={mensajePrecio ? 'true' : undefined}
            aria-describedby={
              mensajePrecio ? 'curso-precio-ayuda curso-precio-error' : 'curso-precio-ayuda'
            }
            {...register('price', { valueAsNumber: true })}
            className={claseCampo(Boolean(mensajePrecio))}
          />
          <p id="curso-precio-ayuda" className={TEXTO_AYUDA}>
            {precioValido
              ? `Equivale a ${formatCOP(precioVisto)}${
                  precioVisto === 0 ? ' (curso gratuito)' : ''
                }`
              : 'Solo dígitos, sin puntos ni comas. Usa 0 para un curso gratuito.'}
          </p>
          {mensajePrecio && (
            <p id="curso-precio-error" role="alert" className={TEXTO_ERROR}>
              {mensajePrecio}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className={BOTON_PRIMARIO}>
            {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear curso'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
