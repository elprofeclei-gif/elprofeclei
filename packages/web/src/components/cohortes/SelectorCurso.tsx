import type { CourseView } from '@elprofeclei/shared';
import { ETIQUETA, TEXTO_AYUDA, claseCampo } from './clases';

interface Props {
  cursos: CourseView[];
  valor: string;
  onCambio: (courseId: string) => void;
  deshabilitado?: boolean;
}

// El curso es el eje de la pantalla: elegirlo carga sus cohortes y habilita la
// creación. Vive fuera de los modales para que el listado y el formulario miren
// siempre al mismo curso.
export function SelectorCurso({ cursos, valor, onCambio, deshabilitado = false }: Props) {
  return (
    <div className="max-w-xl">
      <label htmlFor="selector-curso" className={ETIQUETA}>
        Curso
      </label>
      <select
        id="selector-curso"
        className={claseCampo(false)}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        disabled={deshabilitado}
        aria-describedby="selector-curso-ayuda"
      >
        <option value="">Selecciona un curso</option>
        {cursos.map((curso) => (
          <option key={curso.id} value={curso.id}>
            {curso.title}
          </option>
        ))}
      </select>
      <p id="selector-curso-ayuda" className={TEXTO_AYUDA}>
        Cada cohorte pertenece a un curso. Elige con cuál vas a trabajar.
      </p>
    </div>
  );
}
