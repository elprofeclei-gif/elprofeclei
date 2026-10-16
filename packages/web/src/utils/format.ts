// Formato local de Colombia en un solo lugar:
// moneda COP sin decimales y fechas en la zona horaria de Bogotá
// (las fechas se guardan en UTC y se muestran en hora local).
const MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const FECHA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: 'America/Bogota',
});

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

// Prisma envía Decimal como texto en el JSON, por eso aceptamos ambas formas
export const formatCOP = (value: number | string): string => MONEDA.format(Number(value) || 0);

export const formatFecha = (value: string | Date): string => FECHA.format(new Date(value));

export const formatFechaHora = (value: string | Date): string => FECHA_HORA.format(new Date(value));
