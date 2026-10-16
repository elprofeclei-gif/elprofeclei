// Avance de un estudiante dentro de una cohorte, calculado con datos reales
// (asistencia, entregas y notas). No hay tabla de progreso: se deriva de lo que
// ya existe, así el dato nunca queda desincronizado.
export type EstadoProgreso = 'SIN_EMPEZAR' | 'EN_CURSO' | 'ELEGIBLE' | 'CERTIFICADO';

export interface ProgresoView {
  cohortId: string;
  cohortName: string;
  courseId: string;
  courseTitle: string;
  estado: EstadoProgreso;
  asistencia: {
    sesiones: number;
    asistidas: number;
    porcentaje: number;
  };
  evaluaciones: {
    total: number;
    entregadas: number;
    calificadas: number;
    // Promedio sobre las evaluaciones calificadas, en porcentaje de la nota máxima
    promedio: number | null;
  };
  requisitos: {
    asistenciaMinima: number;
    notaMinima: number;
    cumpleAsistencia: boolean;
    cumpleEntrega: boolean;
    cumpleNota: boolean;
    elegible: boolean;
  };
  certificado: {
    id: string;
    codigo: string;
    emitidoEn: string;
  } | null;
}

export interface ProgresoEstudianteView extends ProgresoView {
  estudiante: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
