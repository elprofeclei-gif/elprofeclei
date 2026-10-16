import type { EstadoProgreso, ProgresoView } from '@elprofeclei/shared';

// Reglas de certificación del proyecto.
// No hay tabla de progreso: el avance se deriva de la asistencia, las entregas y
// las notas, así el dato nunca queda desincronizado con la realidad.
export const REQUISITOS = {
  /** Porcentaje mínimo de sesiones con asistencia registrada */
  asistenciaMinima: 80,
  /** Nota mínima, en porcentaje sobre la nota máxima de cada evaluación */
  notaMinima: 70,
} as const;

export interface EntregaParaProgreso {
  assessmentId: string;
  score: number | null;
  maxScore: number;
}

export interface DatosProgreso {
  sesionesTotales: number;
  sesionesAsistidas: number;
  evaluacionesTotales: number;
  /** Una fila por evaluación entregada por el estudiante */
  entregas: EntregaParaProgreso[];
}

export interface ProgresoCalculado {
  asistencia: ProgresoView['asistencia'];
  evaluaciones: ProgresoView['evaluaciones'];
  requisitos: ProgresoView['requisitos'];
  elegible: boolean;
  /** Estado sin contar el certificado; el llamador añade CERTIFICADO si ya lo tiene */
  estadoBase: Exclude<EstadoProgreso, 'CERTIFICADO'>;
}

export function calcularProgreso(datos: DatosProgreso): ProgresoCalculado {
  const porcentajeAsistencia =
    datos.sesionesTotales === 0
      ? 100
      : Math.round((datos.sesionesAsistidas / datos.sesionesTotales) * 100);

  const entregadas = datos.entregas.length;
  const calificadas = datos.entregas.filter((entrega) => entrega.score !== null).length;

  // Porcentajes sobre la nota máxima de cada evaluación, solo de las calificadas
  const porcentajes = datos.entregas.flatMap((entrega) =>
    entrega.score === null || entrega.maxScore <= 0
      ? []
      : [(entrega.score / entrega.maxScore) * 100],
  );

  const promedio =
    porcentajes.length === 0
      ? null
      : Math.round(
          (porcentajes.reduce((total, valor) => total + valor, 0) / porcentajes.length) * 10,
        ) / 10;

  // Una cohorte sin sesiones o sin evaluaciones no puede bloquear por ese requisito:
  // no se exige lo que la cohorte no ofrece.
  const cumpleAsistencia =
    datos.sesionesTotales === 0 || porcentajeAsistencia >= REQUISITOS.asistenciaMinima;
  const cumpleEntrega = datos.evaluacionesTotales === 0 || entregadas >= datos.evaluacionesTotales;
  const cumpleNota =
    datos.evaluacionesTotales === 0 ||
    (entregadas > 0 &&
      calificadas === entregadas &&
      promedio !== null &&
      promedio >= REQUISITOS.notaMinima);

  const elegible = cumpleAsistencia && cumpleEntrega && cumpleNota;
  const sinActividad = datos.sesionesAsistidas === 0 && entregadas === 0;

  return {
    asistencia: {
      sesiones: datos.sesionesTotales,
      asistidas: datos.sesionesAsistidas,
      porcentaje: porcentajeAsistencia,
    },
    evaluaciones: {
      total: datos.evaluacionesTotales,
      entregadas,
      calificadas,
      promedio,
    },
    requisitos: {
      asistenciaMinima: REQUISITOS.asistenciaMinima,
      notaMinima: REQUISITOS.notaMinima,
      cumpleAsistencia,
      cumpleEntrega,
      cumpleNota,
      elegible,
    },
    elegible,
    estadoBase: elegible ? 'ELEGIBLE' : sinActividad ? 'SIN_EMPEZAR' : 'EN_CURSO',
  };
}
