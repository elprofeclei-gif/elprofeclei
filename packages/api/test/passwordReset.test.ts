import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { env } from '@/config/env';
import { passwordResetService } from '@/modules/auth/passwordReset.service';

// Prisma y el logger se simulan: aquí se verifica la lógica del enlace de un solo
// uso, no el acceso a datos.
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  info: vi.fn(),
}));

vi.mock('@/config/prisma', () => ({
  prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: mocks.info, error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Misma fórmula que usa el servicio: huella del hash actual de la contraseña
const huellaDe = (hash: string) => createHash('sha256').update(hash).digest('hex').slice(0, 16);

const HASH_ACTUAL = bcrypt.hashSync('Password123!', 4);

const codigoValido = (hash = HASH_ACTUAL) =>
  jwt.sign({ id: 'u1', purpose: 'reset', fp: huellaDe(hash) }, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

describe('recuperación de contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ana@b.co',
      password: HASH_ACTUAL,
      deletedAt: null,
    });
    mocks.update.mockResolvedValue({ id: 'u1' });
  });

  it('no revela si el correo está registrado', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(passwordResetService.solicitar('nadie@b.co')).resolves.toEqual({
      enviado: true,
    });
    expect(mocks.info).not.toHaveBeenCalled();
  });

  it('genera un enlace de un solo uso y lo deja en el log', async () => {
    await expect(passwordResetService.solicitar('ana@b.co')).resolves.toEqual({ enviado: true });

    expect(mocks.info).toHaveBeenCalledTimes(1);
    const contexto = mocks.info.mock.calls[0][0] as { url: string };
    expect(contexto.url).toContain('/recuperar?codigo=');
  });

  it('cambia la contraseña con un código válido y revoca la sesión abierta', async () => {
    await expect(
      passwordResetService.restablecer(codigoValido(), 'NuevaClave123'),
    ).resolves.toEqual({ actualizada: true });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    const llamada = mocks.update.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(llamada.where.id).toBe('u1');
    expect(llamada.data.lockedUntil).toBeNull();
    expect(llamada.data.refreshToken).toBeNull();
    expect(typeof llamada.data.password).toBe('string');
  });

  it('rechaza un código ya usado (la huella cambió con la contraseña)', async () => {
    const codigo = codigoValido();
    // Segundo intento con la contraseña ya cambiada
    mocks.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ana@b.co',
      password: bcrypt.hashSync('NuevaClave123', 4),
      deletedAt: null,
    });

    await expect(passwordResetService.restablecer(codigo, 'OtraClave123')).rejects.toThrow(
      /ya fue usado/i,
    );
  });

  it('rechaza un código con otro propósito', async () => {
    const codigoAjeno = jwt.sign(
      { id: 'u1', purpose: 'otra-cosa', fp: huellaDe(HASH_ACTUAL) },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: '15m',
      },
    );

    await expect(passwordResetService.restablecer(codigoAjeno, 'NuevaClave123')).rejects.toThrow(
      /no es válido/i,
    );
  });

  it('rechaza un código firmado con otra clave', async () => {
    const codigoFalso = jwt.sign(
      { id: 'u1', purpose: 'reset', fp: huellaDe(HASH_ACTUAL) },
      'otra-clave-distinta',
      { expiresIn: '15m' },
    );

    await expect(passwordResetService.restablecer(codigoFalso, 'NuevaClave123')).rejects.toThrow(
      /no es válido|expiró/i,
    );
  });

  it('exige una contraseña de al menos 8 caracteres', async () => {
    await expect(passwordResetService.restablecer(codigoValido(), 'corta')).rejects.toThrow(
      /al menos 8/i,
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
