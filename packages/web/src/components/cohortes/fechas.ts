// Conversión entre ISO (UTC, como lo guarda la API) y el formato que espera
// <input type="datetime-local"> (YYYY-MM-DDTHH:mm en hora local del navegador).
// La ida y vuelta es estable: lo que ve el usuario en el input es lo que se
// guarda, interpretado en su hora local (America/Bogota, UTC-5 sin horario de
// verano, para usuarios en Colombia).
const dosDigitos = (valor: number): string => String(valor).padStart(2, '0');

export const aValorLocal = (iso: string): string => {
  const fecha = new Date(iso);
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};

export const aISO = (valorLocal: string): string => new Date(valorLocal).toISOString();

// Hora corta en la zona de Bogotá para rangos del mismo día
// (por ejemplo «15 oct, 2:00 p. m. – 4:00 p. m.»).
const HORA = new Intl.DateTimeFormat('es-CO', {
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

export const formatHora = (valor: string | Date): string => HORA.format(new Date(valor));
