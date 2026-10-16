import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

// Forma de respuesta del errorHandler de la API: mensaje legible y, cuando la
// validación falla en el servidor (Zod), detalle por campo con fieldErrors.
export interface ErrorApi {
  mensaje: string;
  campos: Record<string, string[]>;
}

export const extraerErrorApi = (err: unknown, inesperado: string): ErrorApi => {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(err)) {
    return {
      mensaje:
        err.response?.data?.message ??
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      campos: err.response?.data?.errors ?? {},
    };
  }
  return { mensaje: inesperado, campos: {} };
};

// Aplica los errores por campo del servidor sobre el formulario: el campo
// recibe el primer mensaje que devolvió la API y el foco se mueve hasta él.
export function aplicarErroresDelServidor<T extends FieldValues>(
  campos: Record<string, string[]>,
  setError: UseFormSetError<T>,
): void {
  for (const [campo, mensajes] of Object.entries(campos)) {
    const detalle = mensajes?.[0];
    if (detalle) {
      setError(campo as Path<T>, { message: detalle }, { shouldFocus: true });
    }
  }
}

// Mensaje visible de un campo: aparece cuando el resolver ya marcó el campo o
// cuando el usuario intentó enviar (nunca antes, para no regañar en vacío). Si lo
// que falla es que el campo está vacío, se sustituye el mensaje técnico del
// esquema compartido —que no sabe expresar «falta este dato»— por uno accionable.
export const mensajeDeCampo = (
  error: string | undefined,
  vacio: boolean,
  textoVacio: string,
  trasEnviar: boolean,
): string | undefined => {
  if (!error && !trasEnviar) return undefined;
  return vacio ? textoVacio : error;
};
