// Servicio de salud del sistema
export const healthService = {
  check: () => {
    return {
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  },
};