import { correoConfigurado, proveedorDeCorreo } from '@/utils/mailer';

// Servicio de salud del sistema
export const healthService = {
  check: () => {
    return {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      // Diagnóstico rápido: 'none' significa que los correos solo van al log
      correo: {
        proveedor: proveedorDeCorreo(),
        listo: correoConfigurado(),
      },
    };
  },
};
