# Criterios de aceptación — vista principal del marketplace

Fecha: 16 de octubre de 2026. Alcance: pantalla de catálogo (`/`) de `packages/web`, su servicio de datos y el endpoint `GET /api/courses`.
Origen: normas del dominio diseño (`craft-state-coverage`, `craft-accessibility-baseline`, `craft-anti-ai-slop`, `craft-color`, `craft-typography`) más los hallazgos de la auditoría independiente del estado previo. Cada criterio debe poder responderse «sí/no» o con un valor medido.

## A. Contrato de datos (7)

| # | Criterio | Método |
| --- | --- | --- |
| A1 | `GET /api/courses` acepta `q`, `modality`, `duration`, `price`, `sort`, `page`, `pageSize` y todos son opcionales | `packages/api/test/courses.test.ts` + revisión de `course.service.ts` |
| A2 | Consulta inválida responde 400 con mensaje por campo | Esquema Zod en `packages/shared/src/schemas/course.schema.ts` + middleware de errores |
| A3 | El cuerpo sigue siendo un array (sin cambio rompiente) | `course.controller.ts` (`res.json(courses)`) |
| A4 | La paginación viaja en `X-Total-Count`, `X-Page`, `X-Page-Size` | `course.controller.ts` |
| A5 | El navegador puede leer esas cabeceras | `exposedHeaders` en `app.ts` |
| A6 | Cada curso trae `stats` con datos reales: `cohortCount`, `openCohortCount`, `enrolledCount`, `totalCapacity`, `nextStartDate` | `course.service.ts` + `test/courses.test.ts` |
| A7 | Sin cabeceras o sin `stats` la vista degrada sin romperse (contador = recibido, métricas en 0) | `courses.service.ts` (`normalizarCurso`, `aEnteroPositivo`) |

## B. Cobertura de estados (12)

| # | Criterio | Método |
| --- | --- | --- |
| B1 | Carga con esqueletos que replican la anatomía de la tarjeta (sin salto de layout) | `CourseCardSkeleton.tsx` + revisión de `CoursesPage.tsx` |
| B2 | El estado de carga se anuncia a lectores de pantalla | `role="status"` con «Cargando cursos…» |
| B3 | Estado vacío real (catálogo sin cursos) con acción para refrescar | `PanelVacio` sin filtros |
| B4 | Estado vacío con filtros activos, distinto del anterior, con acción «Limpiar filtros» | `PanelVacio` con `hayFiltros` |
| B5 | El vacío con filtros hace eco del término buscado | `No encontramos cursos para «{busqueda}»` |
| B6 | Error de carga con mensaje y botón de reintento funcional | `PanelEstado tono="error"` + `reintentar()` |
| B7 | El error se anuncia como alerta | `role="alert"` en el panel de error |
| B8 | Error al paginar se informa sin perder lo ya cargado | `errorAlCargarMas` + `role="alert"` |
| B9 | Espera anómala (>12 s) avisada con acción de reintento | `AVISO_DEMORA_MS` y aviso visible |
| B10 | Estado lleno con paginación acumulativa sin duplicados | dedupe por `id` en `cargarMas` |
| B11 | Al agotar el catálogo se informa el final en vez de dejar un botón muerto | `hayMas` + mensaje «Has visto los N cursos» |
| B12 | Refresco sobre datos existentes no vuelve a esqueletos | «Actualizando resultados…» + `aria-busy` |

## C. Accesibilidad (12)

| # | Criterio | Método |
| --- | --- | --- |
| C1 | Todos los controles alcanzables y operables por teclado | `button`/`a`/`select` nativos; revisión de `CourseFilters.tsx` |
| C2 | Foco visible en cada interactivo (anillo 2 px, claro y oscuro) | `focus-visible:ring-*` en clases de foco compartidas |
| C3 | La tarjeta completa es un enlace con nombre accesible (título del curso) | `after:absolute after:inset-0` en el enlace del título |
| C4 | Sin interactivos anidados dentro del enlace de tarjeta | Revisión de `CourseCard.tsx` |
| C5 | Chips de filtro exponen su estado | `aria-pressed` dentro de `fieldset`/`legend` |
| C6 | Contador de resultados anunciado sin robar foco | `aria-live="polite"` |
| C7 | Buscador con etiqueta asociada y botón de limpiar con nombre accesible | `htmlFor="busqueda-cursos"` + `aria-label="Limpiar búsqueda"` |
| C8 | Selector de orden con etiqueta asociada | `<label for="orden-catalogo">` |
| C9 | Jerarquía de encabezados sin saltos (h1 → h2 → h3) | `h2` en `sr-only` de filtros y resultados |
| C10 | Iconos decorativos ocultos a tecnologías de asistencia | `aria-hidden="true"` en todos los SVG |
| C11 | Contraste AA (4.5:1 texto normal) en chips, badges, texto secundario y error | Ratios calculados sobre los tokens (ver `marketplace-rediseno.md` §4) |
| C12 | Se respeta `prefers-reduced-motion` | `motion-safe:`/`motion-reduce:animate-none` |

## D. Color y tipografía (7)

| # | Criterio | Método |
| --- | --- | --- |
| D1 | Solo tokens de la identidad (`vs-*`, `lms-*`); ninguna paleta nueva | Revisión de clases y `tailwind.config.js` |
| D2 | Modo oscuro completo (toda clase nueva tiene variante `dark:`) | Revisión de clases |
| D3 | `font-code` reservada a elementos de código | Revisión de la vista |
| D4 | Escala tipográfica limitada (`text-sm`/`text-base`/`text-2xl`/`text-3xl`) | Revisión de clases |
| D5 | Color de modalidad semántico y distinto por tipo | Badges de `CourseCard.tsx` |
| D6 | El color no es el único portador de información | Texto en badge y chip, no solo color |
| D7 | Longitudes de línea contenidas (descripción a 2 líneas, título con `break-words`) | `line-clamp-2`, `break-words` |

## E. Anti-AI-slop (6)

| # | Criterio | Método |
| --- | --- | --- |
| E1 | Sin emoji usados como icono | Revisión de la vista y del armazón (`Navbar`) |
| E2 | Sin métricas inventadas (valoraciones, estrellas, «+N alumnos», «más vendido») | Revisión de textos de la tarjeta |
| E3 | Sin textos de relleno ni Lorem | Revisión de todos los textos visibles |
| E4 | `enrolledCount` no se presenta como cifra global de estudiantes | Decisión documentada en `marketplace-rediseno.md` §5 |
| E5 | Un solo sistema de iconos (SVG monoline, mismo grosor de trazo) | Revisión de SVG (`strokeWidth 1.7`) |
| E6 | Sin degradados decorativos ni acento «de moda» ajeno a la marca | Revisión de clases |

## F. Responsive (6)

| # | Criterio | Método |
| --- | --- | --- |
| F1 | 1 columna en móvil, 2 en tablet, 3 en escritorio | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| F2 | Los filtros se reordenan (varias filas), no se escalan | `flex flex-wrap` + `gap` |
| F3 | Títulos y descripciones largas no rompen la tarjeta | `break-words`, `line-clamp-2`, `min-w-0` |
| F4 | Precio y badges no se deforman | `shrink-0` |
| F5 | Extremos de datos: 0 cursos, 1 curso, más de una página | Revisión de la lógica de contador y paginación |
| F6 | En móvil, instructor y admin conservan acceso a sus vistas | Enlaces añadidos al menú de perfil en `Navbar.tsx` |

## Estado de verificación (16 de octubre de 2026)

**Comprobado con salida real:** `tsc --noEmit` de API y web (exit 0), `eslint` de `api/src`, `web/src` y `shared/src` (exit 0), `npm test --workspace @elprofeclei/api` (5 archivos, 51 pruebas), `npm run build --workspace @elprofeclei/web` (exit 0). Verificación estructural de los criterios A1–A7, B1–B12, C1–C12, D1–D7, E1–E6, F1–F6 por lectura de código, con la salvedad indicada abajo.

**No verificado todavía (declarado, no asumido):**

- Comportamiento en runtime de los cinco estados: no hay runner de pruebas en `packages/web` ni navegador en este entorno. Requiere `npm run dev:web` y recorrer los seis pasos de la sección 10 de `marketplace-rediseno.md`.
- Contraste medido sobre píxeles renderizados: los ratios están calculados sobre los valores hex de los tokens.
- Instrucción para completarlo: levantar API y web, apuntar `/` y recorrer estados de error (API apagada), vacío con filtros y paginación (más de 9 cursos publicados).
