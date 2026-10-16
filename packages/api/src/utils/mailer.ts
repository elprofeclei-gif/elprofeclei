import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/AppError';

export interface Mensaje {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export type ProveedorCorreo = 'none' | 'resend' | 'sendgrid';

export function proveedorDeCorreo(): ProveedorCorreo {
  return (env.MAIL_PROVIDER ?? 'none') as ProveedorCorreo;
}

// ¿Está el correo listo para salir de verdad? Lo reporta /api/health.
export function correoConfigurado(): boolean {
  const proveedor = proveedorDeCorreo();

  if (proveedor === 'resend') return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
  if (proveedor === 'sendgrid') return Boolean(env.SENDGRID_API_KEY && env.MAIL_FROM);

  return false;
}

async function enviarConResend(mensaje: Mensaje, remitente: string): Promise<void> {
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // La clave vive en el entorno del servidor, nunca en el repositorio
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: remitente,
      to: [mensaje.para],
      subject: mensaje.asunto,
      html: mensaje.html,
      text: mensaje.texto,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    logger.error({ estado: respuesta.status, detalle }, 'Resend rechazó el envío');
    throw new AppError('No se pudo enviar el correo', 502);
  }
}

async function enviarConSendgrid(mensaje: Mensaje, remitente: string): Promise<void> {
  const respuesta = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: mensaje.para }] }],
      from: { email: remitente, name: env.MAIL_FROM_NAME ?? 'elprofeclei' },
      subject: mensaje.asunto,
      content: [
        { type: 'text/plain', value: mensaje.texto },
        { type: 'text/html', value: mensaje.html },
      ],
    }),
  });

  // SendGrid responde 202 sin cuerpo cuando acepta el mensaje
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    logger.error({ estado: respuesta.status, detalle }, 'SendGrid rechazó el envío');
    throw new AppError('No se pudo enviar el correo', 502);
  }
}

/**
 * Envía un correo con el proveedor configurado.
 * - `MAIL_PROVIDER=none` (desarrollo): deja el contenido en el log y devuelve `enviado: false`.
 * - `resend` / `sendgrid`: llamadas HTTPS directas, sin dependencias nuevas.
 */
export async function enviarCorreo(
  mensaje: Mensaje,
): Promise<{ enviado: boolean; proveedor: ProveedorCorreo; motivo?: string }> {
  const proveedor = proveedorDeCorreo();

  if (proveedor === 'none') {
    logger.info(
      { para: mensaje.para, asunto: mensaje.asunto, texto: mensaje.texto },
      'MAIL_PROVIDER=none: el correo no se envía; su contenido queda aquí',
    );
    return { enviado: false, proveedor, motivo: 'sin-proveedor' };
  }

  const remitente = env.MAIL_FROM;
  if (!remitente) {
    throw new AppError('Falta MAIL_FROM: es el remitente verificado del proveedor', 500);
  }

  if (proveedor === 'resend') {
    if (!env.RESEND_API_KEY) throw new AppError('Falta RESEND_API_KEY', 500);
    await enviarConResend(mensaje, remitente);
    return { enviado: true, proveedor };
  }

  if (proveedor === 'sendgrid') {
    if (!env.SENDGRID_API_KEY) throw new AppError('Falta SENDGRID_API_KEY', 500);
    await enviarConSendgrid(mensaje, remitente);
    return { enviado: true, proveedor };
  }

  throw new AppError(`Proveedor de correo no soportado: ${proveedor}`, 500);
}

/**
 * Plantilla del correo de recuperación: asunto, texto plano y HTML en un solo lugar.
 * El HTML usa estilos en línea porque los clientes de correo no cargan hojas externas.
 */
export function plantillaRecuperacion(datos: { nombre: string; url: string; minutos: number }) {
  const asunto = 'Restablece tu contraseña de elprofeclei';

  const texto = [
    `Hola ${datos.nombre}:`,
    '',
    'Recibimos una solicitud para restablecer tu contraseña.',
    `Abre este enlace (válido ${datos.minutos} minutos y de un solo uso):`,
    '',
    datos.url,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.',
    '',
    'elprofeclei · Plataforma de aprendizaje',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es-CO">
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:18px;font-weight:700;">
            <span style="color:#569CD6;">el</span><span style="color:#DCDCAA;">profe</span><span style="color:#CE9178;">clei</span>
          </p>
          <h1 style="margin:16px 0 8px;font-size:20px;font-weight:700;">Restablece tu contraseña</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">
            Hola ${datos.nombre}: recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${datos.url}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">
              Crear una contraseña nueva
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#4b5563;">
            El enlace vence en ${datos.minutos} minutos y solo funciona una vez. Si expira, pide otro desde la página de recuperación.
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#4b5563;">
            Si no solicitaste el cambio, ignora este mensaje: tu contraseña sigue igual.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;border-top:1px solid #e5e7eb;">
          <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">
            Enlace directo: <span style="word-break:break-all;">${datos.url}</span>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { asunto, texto, html };
}
