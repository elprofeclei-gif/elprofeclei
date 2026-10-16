import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { sessionSchema, type SessionInput } from '@elprofeclei/shared';
import { Modal } from '../Modal';
import { adminService, type SessionAdminView, type VenueView } from '../../services/admin.service';
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  ETIQUETA,
  TEXTO_AYUDA,
  TEXTO_ERROR,
  claseCampo,
} from './clases';
import { TIPOS_SESION, esTipoSesion } from './tipos';
import { aISO, aValorLocal } from './fechas';
import { aplicarErroresDelServidor, extraerErrorApi, mensajeDeCampo } from './errores';

interface Props {
  abierto: boolean;
  cohorteId: string;
  /** Sesión a editar; null para crear una nueva. */
  sesion: SessionAdminView | null;
  sedes: VenueView[];
  onCerrar: () => void;
  onGuardado: () => void;
}

// El esquema compartido decide las reglas cruzadas: una sesión presencial exige
// sede, y una virtual o asíncrona exige enlace de video.
export function ModalSesion({ abierto, cohorteId, sesion, sedes, onCerrar, onGuardado }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SessionInput>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { type: 'VIRTUAL_SYNC' },
  });

  const tipo = watch('type');
  const esPresencial = tipo === 'ONSITE';

  useEffect(() => {
    if (!abierto) return;

    reset(
      sesion
        ? {
            cohortId: cohorteId,
            title: sesion.title,
            type: esTipoSesion(sesion.type) ? sesion.type : 'VIRTUAL_SYNC',
            videoUrl: sesion.videoUrl,
            venueId: sesion.venueId,
            startTime: aValorLocal(sesion.startTime),
            endTime: aValorLocal(sesion.endTime),
          }
        : {
            cohortId: cohorteId,
            title: '',
            type: 'VIRTUAL_SYNC',
            videoUrl: null,
            venueId: null,
            startTime: '',
            endTime: '',
          },
    );

    setFocus('title');
  }, [abierto, sesion, cohorteId, reset, setFocus]);

  const enviar = handleSubmit(async (valores) => {
    if (!valores.startTime || !valores.endTime) {
      toast.error('Completa la fecha y hora de inicio y de fin.');
      return;
    }

    try {
      const datos = {
        title: valores.title.trim(),
        type: valores.type,
        // Solo se envía el dato que corresponde al tipo elegido
        videoUrl: esPresencial ? null : (valores.videoUrl ?? null),
        venueId: esPresencial ? (valores.venueId ?? null) : null,
        startTime: aISO(valores.startTime),
        endTime: aISO(valores.endTime),
      };

      if (sesion) {
        await adminService.updateSession(sesion.id, datos);
        toast.success('Sesión actualizada');
      } else {
        await adminService.createSession({ cohortId: cohorteId, ...datos });
        toast.success('Sesión creada');
      }

      onGuardado();
    } catch (err) {
      const { mensaje, campos } = extraerErrorApi(err, 'No pudimos guardar la sesión.');
      aplicarErroresDelServidor<SessionInput>(campos, setError);
      toast.error(mensaje);
    }
  });

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title={sesion ? 'Editar sesión' : 'Nueva sesión'}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <input type="hidden" {...register('cohortId')} value={cohorteId} readOnly />

        <div>
          <label htmlFor="sesion-titulo" className={ETIQUETA}>
            Título de la sesión
          </label>
          <input
            id="sesion-titulo"
            type="text"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'sesion-titulo-error' : undefined}
            {...register('title')}
            className={claseCampo(Boolean(errors.title))}
            placeholder="Ej.: Introducción y configuración"
          />
          {errors.title && (
            <p id="sesion-titulo-error" role="alert" className={TEXTO_ERROR}>
              {mensajeDeCampo(errors.title.message, false, '', true)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sesion-tipo" className={ETIQUETA}>
            Tipo de sesión
          </label>
          <select id="sesion-tipo" {...register('type')} className={claseCampo(false)}>
            {TIPOS_SESION.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {esPresencial ? (
          <div>
            <label htmlFor="sesion-sede" className={ETIQUETA}>
              Sede
            </label>
            <select
              id="sesion-sede"
              aria-invalid={Boolean(errors.venueId)}
              aria-describedby={errors.venueId ? 'sesion-sede-error' : 'sesion-sede-ayuda'}
              {...register('venueId', { setValueAs: (valor) => (valor === '' ? null : valor) })}
              className={claseCampo(Boolean(errors.venueId))}
            >
              <option value="">Selecciona una sede</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.name} · {sede.address} (aforo {sede.capacity})
                </option>
              ))}
            </select>
            {errors.venueId ? (
              <p id="sesion-sede-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.venueId.message, false, '', true)}
              </p>
            ) : (
              <p id="sesion-sede-ayuda" className={TEXTO_AYUDA}>
                {sedes.length === 0
                  ? 'Todavía no hay sedes cargadas: créalas desde la API o pide apoyo al administrador.'
                  : 'Las sesiones presenciales necesitan una sede con dirección y aforo.'}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="sesion-enlace" className={ETIQUETA}>
              Enlace de la videollamada o del video
            </label>
            <input
              id="sesion-enlace"
              type="url"
              aria-invalid={Boolean(errors.videoUrl)}
              aria-describedby={errors.videoUrl ? 'sesion-enlace-error' : 'sesion-enlace-ayuda'}
              {...register('videoUrl', { setValueAs: (valor) => (valor === '' ? null : valor) })}
              className={claseCampo(Boolean(errors.videoUrl))}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
            {errors.videoUrl ? (
              <p id="sesion-enlace-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.videoUrl.message, false, '', true)}
              </p>
            ) : (
              <p id="sesion-enlace-ayuda" className={TEXTO_AYUDA}>
                Enlace completo, empezando por https://
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sesion-inicio" className={ETIQUETA}>
              Inicio
            </label>
            <input
              id="sesion-inicio"
              type="datetime-local"
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={errors.startTime ? 'sesion-inicio-error' : undefined}
              {...register('startTime')}
              className={claseCampo(Boolean(errors.startTime))}
            />
            {errors.startTime && (
              <p id="sesion-inicio-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.startTime.message, false, '', true)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="sesion-fin" className={ETIQUETA}>
              Fin
            </label>
            <input
              id="sesion-fin"
              type="datetime-local"
              aria-invalid={Boolean(errors.endTime)}
              aria-describedby={errors.endTime ? 'sesion-fin-error' : undefined}
              {...register('endTime')}
              className={claseCampo(Boolean(errors.endTime))}
            />
            {errors.endTime && (
              <p id="sesion-fin-error" role="alert" className={TEXTO_ERROR}>
                {mensajeDeCampo(errors.endTime.message, false, '', true)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className={BOTON_PRIMARIO}>
            {isSubmitting ? 'Guardando…' : sesion ? 'Guardar cambios' : 'Crear sesión'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
