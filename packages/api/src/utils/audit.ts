import { logger } from '@/utils/logger';

/**
 * Rastro de auditoría de las acciones sensibles: aprobar un curso, confirmar un pago,
 * rechazar una matrícula, emitir un certificado, calificar una entrega o cambiar un rol.
 *
 * Se emite como log estructurado con un campo `audit` estable, así que se puede filtrar
 * y conservar en cualquier proveedor de logs sin tocar la base de datos.
 * Una tabla de auditoría consultable desde el panel requiere migración y está anotada en
 * `docs/pendiente-esquema-avanzado.md`.
 */
export type AccionAuditada =
  | 'CURSO_APROBADO'
  | 'CURSO_ENVIADO_A_REVISION'
  | 'PAGO_CONFIRMADO'
  | 'MATRICULA_RECHAZADA'
  | 'MATRICULA_APROBADA'
  | 'CERTIFICADO_EMITIDO'
  | 'ENTREGA_CALIFICADA'
  | 'ROL_CAMBIADO';

export interface EventoAuditoria {
  /** Quién ejecuta la acción (id del usuario autenticado) */
  actorId: string;
  accion: AccionAuditada;
  /** Sobre qué entidad se actuó */
  entidad: 'Course' | 'Enrollment' | 'Certificate' | 'User' | 'Submission';
  entidadId: string;
  /** Datos útiles para reconstruir el caso (importes, estados, códigos) */
  detalle?: Record<string, unknown>;
}

export function registrarAuditoria(evento: EventoAuditoria): void {
  logger.info(
    { audit: { ...evento, registradoEn: new Date().toISOString() } },
    `audit:${evento.accion}`,
  );
}
