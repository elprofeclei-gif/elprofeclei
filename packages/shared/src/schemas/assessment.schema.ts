import { z } from 'zod';

// Evaluación: Quiz (preguntas y opciones) o Tarea (entrega de archivos/enlaces)
export const assessmentSchema = z.object({
  cohortId: z.string().uuid('ID de cohorte inválido'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  type: z.enum(['QUIZ', 'TASK']),
  // coerce: los formularios envían números como texto
  maxScore: z.coerce
    .number()
    .positive('La nota máxima debe ser positiva')
    .max(100, 'La nota máxima no puede superar 100'),
  content: z.union([z.string(), z.array(z.unknown()), z.record(z.unknown())]).optional(),
});

/* ------------------------------------------------------------------ *
 * Contenido del quiz (se guarda en Assessment.content como JSON)
 * ------------------------------------------------------------------ */
export const preguntaQuizSchema = z.object({
  enunciado: z.string().min(3, 'El enunciado es obligatorio'),
  opciones: z
    .array(z.string().min(1, 'Cada opción necesita texto'))
    .min(2, 'Cada pregunta necesita al menos 2 opciones')
    .max(6, 'Máximo 6 opciones por pregunta'),
  correcta: z.coerce.number().int().min(0, 'Marca cuál opción es la correcta'),
  puntos: z.coerce.number().positive().max(100).optional(),
});

export const quizSchema = z.object({
  preguntas: z.array(preguntaQuizSchema).min(1, 'Añade al menos una pregunta').max(50),
});

export type PreguntaQuizInput = z.infer<typeof preguntaQuizSchema>;
export type QuizInput = z.infer<typeof quizSchema>;

// Archivos compartidos: enlaces con su tipo (los usan las tareas y las entregas)
export const tipoArchivoEnum = z.enum(['IMAGE', 'PDF', 'VIDEO', 'DOC', 'LINK']);
export type TipoArchivo = z.infer<typeof tipoArchivoEnum>;

export const archivoEntregaSchema = z.object({
  url: z.string().url('El enlace del archivo no es válido'),
  tipo: tipoArchivoEnum,
  nombre: z.string().max(120, 'El nombre es demasiado largo').optional(),
});

/* ------------------------------------------------------------------ *
 * Contenido de una TAREA (se guarda en Assessment.content como JSON)
 * ------------------------------------------------------------------ */
export const tareaContenidoSchema = z.object({
  instrucciones: z.string().max(2000, 'Las instrucciones son demasiado largas').optional(),
  // Fecha límite en ISO; vacío o ausente = sin límite
  dueAt: z.string().optional(),
  // Materiales de referencia que comparte el instructor (enlaces)
  archivos: z.array(archivoEntregaSchema).max(10).optional(),
});

export type TareaContenido = z.infer<typeof tareaContenidoSchema>;

// Lectura tolerante del contenido de una tarea ya guardada
export const leerTareaContenido = (contenido: unknown): TareaContenido => {
  if (contenido && typeof contenido === 'object' && !Array.isArray(contenido)) {
    const resultado = tareaContenidoSchema.safeParse(contenido);
    if (resultado.success) return resultado.data;
  }
  return {};
};

/* ------------------------------------------------------------------ *
 * Entregas: archivos, enlaces, texto y respuestas de quiz
 *
 * Los archivos NO se suben a la base ni al disco del backend (regla del
 * proyecto): se comparten como enlaces a almacenamiento externo
 * (Drive, Cloudinary, YouTube, Vimeo…) con su tipo declarado.
 * ------------------------------------------------------------------ */
export const entregaSchema = z
  .object({
    assessmentId: z.string().uuid('ID de evaluación inválido'),
    texto: z.string().max(4000, 'La respuesta es demasiado larga').optional(),
    archivos: z.array(archivoEntregaSchema).max(10, 'Máximo 10 archivos por entrega').default([]),
    // Respuestas de un quiz: índice de la opción elegida por pregunta (-1 = sin responder)
    respuestas: z.array(z.coerce.number().int().min(-1)).max(50).optional(),
  })
  .refine(
    (valor) =>
      (valor.texto?.trim().length ?? 0) > 0 ||
      valor.archivos.length > 0 ||
      (valor.respuestas?.length ?? 0) > 0,
    {
      message: 'Adjunta un archivo, escribe una respuesta o contesta el quiz',
      path: ['texto'],
    },
  );

export const gradeSchema = z.object({
  score: z.coerce.number().min(0, 'La nota no puede ser negativa'),
  feedback: z.string().max(2000, 'La retroalimentación es demasiado larga').optional(),
});

// Alias con el nombre anterior: el endpoint acepta ambos cuerpos
export const submissionSchema = entregaSchema;

export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type EntregaInput = z.infer<typeof entregaSchema>;
export type ArchivoEntregaInput = z.infer<typeof archivoEntregaSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;

/* ------------------------------------------------------------------ *
 * Lectura tolerante de entregas ya guardadas
 * ------------------------------------------------------------------ */
export interface ContenidoEntrega {
  texto?: string;
  archivos: ArchivoEntregaInput[];
  respuestas?: number[];
  /** Se marcó al enviarse después de la fecha límite de la tarea */
  fueraDePlazo?: boolean;
}

// Las entregas antiguas se guardaron como texto plano; se leen sin romper nada.
export const leerContenidoEntrega = (contenido: string): ContenidoEntrega => {
  try {
    const datos = JSON.parse(contenido) as Partial<ContenidoEntrega>;
    if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
      return {
        texto: typeof datos.texto === 'string' ? datos.texto : undefined,
        archivos: Array.isArray(datos.archivos) ? datos.archivos : [],
        respuestas: Array.isArray(datos.respuestas) ? datos.respuestas : undefined,
        fueraDePlazo: datos.fueraDePlazo === true,
      };
    }
  } catch {
    /* no era JSON: es una entrega antigua de texto plano */
  }
  return { texto: contenido, archivos: [] };
};
