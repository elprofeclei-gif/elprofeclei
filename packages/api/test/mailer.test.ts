import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// El entorno se simula para poder recorrer los tres modos (none, resend, sendgrid)
// sin tocar credenciales reales.
const mocks = vi.hoisted(() => ({
  env: {
    MAIL_PROVIDER: 'none' as string,
    MAIL_FROM: undefined as string | undefined,
    MAIL_FROM_NAME: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    SENDGRID_API_KEY: undefined as string | undefined,
  },
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/config/env', () => ({ env: mocks.env }));
vi.mock('@/utils/logger', () => ({
  logger: { info: mocks.info, error: mocks.error, warn: vi.fn(), debug: vi.fn() },
}));

import {
  correoConfigurado,
  enviarCorreo,
  plantillaRecuperacion,
  proveedorDeCorreo,
} from '@/utils/mailer';

const MENSAJE = {
  para: 'ana@b.co',
  asunto: 'Prueba',
  html: '<p>hola</p>',
  texto: 'hola',
};

describe('capa de correo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.MAIL_PROVIDER = 'none';
    mocks.env.MAIL_FROM = undefined;
    mocks.env.MAIL_FROM_NAME = undefined;
    mocks.env.RESEND_API_KEY = undefined;
    mocks.env.SENDGRID_API_KEY = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin proveedor deja el contenido en el log y no llama a ninguna API', async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);

    await expect(enviarCorreo(MENSAJE)).resolves.toMatchObject({
      enviado: false,
      proveedor: 'none',
    });

    expect(fetchFalso).not.toHaveBeenCalled();
    expect(mocks.info).toHaveBeenCalledTimes(1);
  });

  it('reporta que el correo no está listo cuando falta la clave', () => {
    mocks.env.MAIL_PROVIDER = 'resend';
    mocks.env.MAIL_FROM = 'no-reply@elprofeclei.com';

    expect(proveedorDeCorreo()).toBe('resend');
    expect(correoConfigurado()).toBe(false);

    mocks.env.RESEND_API_KEY = 'clave-de-prueba';
    expect(correoConfigurado()).toBe(true);
  });

  it('envía con Resend y arma el cuerpo esperado', async () => {
    mocks.env.MAIL_PROVIDER = 'resend';
    mocks.env.MAIL_FROM = 'no-reply@elprofeclei.com';
    mocks.env.RESEND_API_KEY = 'clave-de-prueba';

    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    vi.stubGlobal('fetch', fetchFalso);

    await expect(enviarCorreo(MENSAJE)).resolves.toMatchObject({
      enviado: true,
      proveedor: 'resend',
    });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchFalso.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ];

    expect(url).toBe('https://api.resend.com/emails');
    expect(opciones.headers.Authorization).toContain('clave-de-prueba');

    const cuerpo = JSON.parse(opciones.body) as { to: string[]; from: string; subject: string };
    expect(cuerpo.to).toEqual(['ana@b.co']);
    expect(cuerpo.from).toBe('no-reply@elprofeclei.com');
    expect(cuerpo.subject).toBe('Prueba');
  });

  it('falla con un error claro cuando Resend rechaza el envío', async () => {
    mocks.env.MAIL_PROVIDER = 'resend';
    mocks.env.MAIL_FROM = 'no-reply@elprofeclei.com';
    mocks.env.RESEND_API_KEY = 'clave-de-prueba';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'dominio no verificado',
      }),
    );

    await expect(enviarCorreo(MENSAJE)).rejects.toThrow(/no se pudo enviar/i);
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  it('envía con SendGrid cuando es el proveedor configurado', async () => {
    mocks.env.MAIL_PROVIDER = 'sendgrid';
    mocks.env.MAIL_FROM = 'no-reply@elprofeclei.com';
    mocks.env.SENDGRID_API_KEY = 'clave-de-prueba';

    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' });
    vi.stubGlobal('fetch', fetchFalso);

    await expect(enviarCorreo(MENSAJE)).resolves.toMatchObject({
      enviado: true,
      proveedor: 'sendgrid',
    });

    const [url] = fetchFalso.mock.calls[0] as [string];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
  });

  it('exige MAIL_FROM antes de llamar al proveedor', async () => {
    mocks.env.MAIL_PROVIDER = 'resend';
    mocks.env.RESEND_API_KEY = 'clave-de-prueba';

    await expect(enviarCorreo(MENSAJE)).rejects.toThrow(/MAIL_FROM/i);
  });

  it('la plantilla de recuperación incluye el enlace, los minutos y el aviso de un solo uso', () => {
    const plantilla = plantillaRecuperacion({
      nombre: 'Ana',
      url: 'https://elprofeclei.com/recuperar?codigo=abc',
      minutos: 15,
    });

    expect(plantilla.asunto).toMatch(/contraseña/i);
    expect(plantilla.texto).toContain('https://elprofeclei.com/recuperar?codigo=abc');
    expect(plantilla.html).toContain('https://elprofeclei.com/recuperar?codigo=abc');
    expect(plantilla.texto).toContain('15 minutos');
    expect(plantilla.texto).toContain('ignora este correo');
  });
});
