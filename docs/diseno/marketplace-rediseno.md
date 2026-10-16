# Rediseño del marketplace de cursos (`packages/web`)

Fecha: 16 de octubre de 2026 · Alcance: vista principal del catálogo (`/`) + anatomía de tarjeta + servicio de datos.

## 1. Design Read

**Catálogo público de cursos × estudiantes y profesionales que comparan × tono sobrio tipo VS Code × foco en descubrir y comparar rápido.**

Intensidad aplicada: **Layout Restructure**. Se reordenó la página (encabezado con contexto real → buscador → filtros → contador → rejilla → paginación) y se rehizo la anatomía de la tarjeta (badge de modalidad, título enlazado, descripción acotada, disponibilidad real, pie con instructor y precio). No se degradó a «cambiar colores, radios o sombras».

## 2. Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `packages/web/src/services/courses.service.ts` | `getPublished(params)` con query opcional, lectura de cabeceras `X-Total-Count` / `X-Page` / `X-Page-Size`, normalización de `stats` y sobrecargas para mantener compatibilidad con `getPublished()` sin argumentos. |
| `packages/web/src/pages/CoursesPage.tsx` | Rediseño completo: encabezado, buscador con debounce, filtros, contador en vivo, rejilla, paginación «Cargar más» y los cinco estados. |
| `packages/web/src/components/CourseCard.tsx` | Nueva anatomía de tarjeta con datos reales. Tarjeta entera enlazada. |
| `packages/web/src/components/CourseCardSkeleton.tsx` | Espejo de la anatomía de la tarjeta para el estado de carga. |
| `packages/web/src/components/CourseFilters.tsx` | Chips de modalidad, duración y precio + `select` de orden, con `fieldset`/`legend`. |
| `packages/web/src/hooks/useDebouncedValue.ts` | Debounce genérico de 300 ms para la búsqueda. |

No se tocaron: `services/api.ts`, `context/AuthContext.tsx`, `services/auth.service.ts`, `components/Skeleton.tsx` (lo usa `StudentDashboard`), `Logo`, rutas ni flujo `/` → `/course/:id`. Sin dependencias nuevas, sin commits.

## 3. Identidad visual

- Tokens de marca sin cambios: `vs-blue`, `vs-yellow`, `vs-orange`, `vs-green`, `lms-bg`, `lms-dark-bg`, `lms-card`, `lms-dark-card`, `lms-text`, `lms-text-dark`, `lms-border`. Ninguna paleta nueva.
- Modo oscuro por defecto (clase `dark` en el layout existente); todos los elementos nuevos definen variante oscura.
- `font-code` (Cascadia Code) no se usa en la UI nueva: queda reservado a elementos de código.
- Sin emoji como icono: los iconos son SVG monoline (stroke 1.7) definidos inline en cada archivo, siempre `aria-hidden="true"`.

## 4. Color y contraste (AA, texto normal 4.5:1)

| Uso | Claro | Oscuro | Ratio verificado |
| --- | --- | --- | --- |
| Chip seleccionado / botón primario | `bg-blue-700` + blanco | `bg-vs-blue` + `text-vs-bg` | 6.3:1 / 7.1:1 |
| Texto secundario | `text-gray-600` | `text-gray-400` | 7.6:1 / 5.8:1 |
| Badge Virtual | `bg-blue-100` + `text-blue-800` | `vs-blue/20` + `text-blue-200` | 7.4:1 / 8.9:1 |
| Badge Presencial | `bg-emerald-100` + `text-emerald-800` | `vs-green/20` + `text-vs-green` | 6.8:1 / 5.4:1 |
| Badge Híbrido | `bg-amber-100` + `text-amber-900` | `vs-yellow/20` + `text-vs-yellow` | 7.9:1 / 7.0:1 |
| Badge Gratis | `bg-emerald-100` + `text-emerald-800` | `vs-green/20` + `text-vs-green` | 6.8:1 / 5.4:1 |
| Error | `text-red-700` sobre `red-50` | `text-red-400` sobre tinte `red-500/15` | 6.0:1 / 4.6:1 |

Prohibición explícita aplicada: texto blanco sobre `vs-blue` (2.95:1) no se usa en ningún elemento con texto. `lms-muted` (#6B7280) sobre `lms-dark-card` (≈3:1) tampoco se usa en la vista nueva; en su lugar `text-gray-600` / `dark:text-gray-400`.

## 5. Contrato de datos

- `GET /api/courses` con `q`, `modality`, `duration`, `price`, `sort`, `page`, `pageSize` (9 por página; límite del contrato 1..48 respetado).
- Cuerpo = array de `CourseView`. La paginación se lee de cabeceras.
- **Sin cabeceras (backend aún sin paginación):** `total = cursos.length`, `page = page ?? 1`, `pageSize = max(1, pageSize ?? cursos.length)`. Efecto: el contador refleja lo recibido y «Cargar más» no aparece en falso.
- **`stats` ausente:** `normalizarCurso` rellena `cohortCount/openCohortCount/enrolledCount/totalCapacity` en 0 y `nextStartDate` en `null`, así la tarjeta nunca lee `undefined` durante el despliegue en paralelo.
- Parámetros vacíos se omiten de la query (no se envía `modality=`).
- `getPublished()` sin argumentos sigue devolviendo `CourseView[]` (sobrecargas tipadas).

### Honestidad de los datos mostrados

- Solo datos reales: título, descripción, modalidad, duración (EIGHT→8 h, TEN→10 h, SIXTEEN→16 h, TWENTY→20 h), precio (`formatCOP`) o badge «Gratis», instructor y disponibilidad de cohortes.
- Sin valoraciones, estrellas, «más vendido» ni «N alumnos».
- `enrolledCount` **no se muestra**: su semántica (¿por cohorte?, ¿histórico?) no es verificable contra el contrato, así que no se presenta como cifra global. Decisión documentada aquí.
- `totalCapacity > 0` → «N cupos en total», sin prometer disponibilidad por cohorte.

## 6. Los cinco estados

1. **Carga:** 6 `CourseCardSkeleton` que replican la anatomía de la tarjeta (badge + duración, dos líneas de título, dos de descripción, pie con avatar y precio) para que no salte el layout. Animación `animate-pulse` neutralizada con `motion-reduce:animate-none`. Anuncio para lectores de pantalla: `<p role="status" class="sr-only">Cargando cursos…</p>`.
2. **Vacío sin filtros:** panel «Todavía no hay cursos publicados» + «Cuando el equipo publique un curso, aparecerá aquí…» + botón secundario «Actualizar catálogo».
3. **Vacío con filtros:** panel «No encontramos cursos para «término»» (eco del texto buscado) o «No encontramos cursos con estos filtros», con sugerencia concreta y botón primario «Limpiar filtros» que restablece filtros y búsqueda y devuelve el foco al buscador.
4. **Error:** panel con `role="alert"`, «No pudimos cargar el catálogo», causa probable y botón «Reintentar» (incrementa un contador que reejecuta el efecto). Además, aviso a los 12 s de espera («El catálogo está tardando más de lo habitual» + «Reintentar la consulta») para el caso de petición colgada. El error de «Cargar más» es inline (`role="alert"`) y el botón sigue disponible para reintentar; se mantiene el `toast` para paridad con el resto de la app.
5. **Lleno con paginación:** rejilla con `aria-busy` durante refrescos, contador «N de M cursos» y botón «Cargar más cursos» que acumula sin duplicar (dedupe por `id`). Cuando no hay más, el botón desaparece y se muestra «Has visto los N cursos del catálogo» (solo si el catálogo supera una página).

Estados transitorios: con datos previos en pantalla se mantiene la rejilla y se anuncia «Actualizando resultados…» en lugar de volver a esqueletos.

## 7. Accesibilidad aplicada

- **Chips** `aria-pressed` dentro de `fieldset` + `legend` («Modalidad», «Duración», «Precio»); estado sin filtro = chip «Todas»/«Todos» activo. Feedback visual extra: icono de check SVG (no emoji).
- **Contador** en `aria-live="polite"`; el estado de carga se comunica con `role="status"`.
- **Orden** con `<label for="orden-catalogo">` y `select` nativo.
- **Foco visible** en todos los interactivos: anillo de 2 px con offset (`blue-700` en claro, `vs-blue` en oscuro) vía `focus-visible`.
- **Tarjeta entera como enlace:** el `Link` del título extiende su área con `after:absolute after:inset-0`; el nombre accesible del enlace es el título del curso y no hay elementos interactivos anidados. El anillo de foco se dibuja en el `article` con `focus-within`.
- **Teclado:** todos los controles son botones, enlaces o `select` nativos; el buscador es un `form role="search"` cuyo `submit` solo evita la recarga.
- **Jerarquía:** `h1` de la vista, `h2` en `sr-only` para «Filtros y orden» y «Resultados» (evita saltar de `h1` a los `h3` de las tarjetas).
- **Movimiento:** `motion-safe:transition-*` y `motion-reduce:animate-none` respetan `prefers-reduced-motion`.
- **Iconos decorativos** `aria-hidden`; avatares de iniciales con `aria-hidden` y nombre del instructor en texto (con prefijo `sr-only` «Instructor: »).

## 8. Responsive

- Rejilla 1 columna (móvil) / 2 (`sm:`) / 3 (`lg:`).
- Los filtros **se reordenan**, no se escalan: contenedor `flex flex-wrap` con `gap` que pasa a varias filas en pantallas estrechas; el `select` de orden y «Limpiar filtros» acompañan al flujo.
- Títulos largos: `break-words` + `line-clamp-2` en la descripción y `truncate` en el nombre del instructor; el precio y el badge «Gratis» llevan `shrink-0` para no deformarse.

## 9. Casos borde cubiertos

- Respuestas fuera de orden: cada consulta lleva un número de solicitud; las respuestas obsoletas se descartan (evita que una búsqueda lenta pise a una rápida).
- Cambio de filtros durante «Cargar más»: el acumulado se descarta y `cargandoMas` se limpia sin guarda en `finally` (el botón no se queda colgado).
- Curso repetido en el borde de página: dedupe por `id`.
- Catálogo vacío real vs. filtros sin resultados: paneles distintos y con acciones distintas.
- `totalCapacity = 0`: no se muestra la línea de cupos.
- Cohorte sin fecha: «Fecha de inicio por confirmar» en lugar de una fecha inventada; sin cohortes abiertas, «Sin cohortes abiertas por ahora».
- Duración desconocida: no se muestra la píldora de horas en vez de un valor falso.

## 10. Verificación ejecutada

Comandos y salida (PowerShell, `;` como separador):

```
> npx tsc --noEmit -p packages/web/tsconfig.json
TSC_EXIT=0

> npx eslint packages/web/src --ext .ts,.tsx
ESLINT_EXIT=0

> npm run build --workspace @elprofeclei/web
> @elprofeclei/web@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 181 modules transformed.
dist/index.html                            1.12 kB │ gzip:   0.61 kB
dist/assets/index-DqsdOlAn.css            27.29 kB │ gzip:   5.53 kB
dist/assets/index-DCoPsrTQ.js            374.52 kB │ gzip: 119.16 kB
✓ built in 8.02s
BUILD_EXIT=0
```

Comparación con el baseline previo al rediseño: chunk inicial `358.10 kB` (gzip `114.81 kB`) → `374.52 kB` (gzip `119.16 kB`); CSS `18.30 kB` → `27.29 kB`. El incremento corresponde al código nuevo (tarjeta, filtros, hook, servicio) y a las utilidades de Tailwind que antes no se usaban.

Comprobación adicional sobre el artefacto construido: el bundle contiene las cadenas nuevas («Limpiar filtros», «Cargar m…», «cupos en total», «cohortes abiertas», «Reintentar», «No pudimos cargar el cat…») y el atributo `aria-pressed`.

### No verificado (y por qué)

- **Comportamiento en runtime de los cinco estados**: no hay runner de tests en `packages/web` (no hay `vitest`/`jest`) ni navegador disponible en este entorno. `tsc`, `eslint` y el build validan tipos, estilo y empaquetado, no la interacción.
- **Contra backend real con paginación**: el módulo `packages/api/.../course.service.ts` todavía no implementa los query params ni las cabeceras, así que lo ejercitado es la ruta de degradación (fallback sin cabeceras).
- **Revisión visual de contraste en pantalla**: los ratios están calculados sobre los valores hex de los tokens, no medidos sobre píxeles renderizados.

Para completar la verificación manualmente:

1. `npm run dev --workspace @elprofeclei/web` y abrir `/`.
2. Con la API caída → estado de error + «Reintentar».
3. Con la API lenta (o `Network throttling`) → esqueletos y aviso a los 12 s.
4. Buscar «zzz» o filtrar por una combinación sin resultados → vacío con filtros + «Limpiar filtros».
5. Con más de 9 cursos publicados → contador «9 de N cursos» y «Cargar más»; al agotar, mensaje de fin de catálogo.
6. Navegación solo con teclado (Tab/Shift+Tab, Enter) y `prefers-reduced-motion` activado en el sistema.

## 11. Desviaciones y bloqueos

- **`services/api.ts` no modificado** (bloqueado por el guardia de la plataforma): no se pudo fijar un timeout de petición. Sustituto: aviso de demora a los 12 s con opción de reintentar.
- **`enrolledCount` no se muestra** por semántica no verificable (ver §5).
- **Backend en paralelo**: la vista degrada con elegancia mientras no existan los query params; cuando el backend los publique, la paginación y el contador se activan sin cambios adicionales en el front.
- Ninguna otra desviación respecto al encargo. Sin commits realizados.
