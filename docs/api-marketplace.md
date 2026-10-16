# API del marketplace: catálogo de cursos (`GET /api/courses`)

Implementación de filtros, búsqueda, paginación y métricas reales para la vista principal.
Fecha: 2026-10-16.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `packages/shared/src/schemas/course.schema.ts` | Nuevo `courseQuerySchema` + tipo `CourseQuery` (ya se exporta por `packages/shared/src/index.ts` vía `export *`) |
| `packages/api/src/modules/courses/course.service.ts` | `getPublished(req)`: parsea la query, arma `where`/`orderBy`, un `findMany` + `count` en paralelo y agrega `stats` en memoria |
| `packages/api/src/modules/courses/course.controller.ts` | `getPublished` setea `X-Total-Count`, `X-Page`, `X-Page-Size`; el cuerpo sigue siendo un array |
| `packages/api/test/courses.test.ts` | Nuevos tests: 8 de parseo del esquema + 4 de métricas/consulta (sin BD real, mock de `@/config/prisma`) |

No se tocaron: `prisma/seed.ts`, `prisma/schema.prisma`, `src/modules/auth/`, `packages/web/src/services/api.ts`,
ni `packages/shared/src/types/course.types.ts` (la interfaz `CourseView` ya venía escrita).

## Contrato

### Query params (todos opcionales; inválido ⇒ 400 con `message` + `errors` por campo)

| Param | Valores | Notas |
| --- | --- | --- |
| `q` | texto, máx 80 | Busca en `title` y `description` con `contains` + `mode: 'insensitive'` (PostgreSQL). Se recorta y `?q=` vacío se trata como ausente |
| `modality` | `VIRTUAL` \| `ONSITE` \| `HYBRID` | Filtro exacto |
| `duration` | `EIGHT` \| `TEN` \| `SIXTEEN` \| `TWENTY` | Filtro exacto |
| `price` | `free` \| `paid` | `free` = `price: 0`; `paid` = `price > 0` |
| `sort` | `recent` (default) \| `price_asc` \| `price_desc` | `recent` = `createdAt desc` |
| `page` | entero ≥ 1 (default 1) | Se coerciona desde texto |
| `pageSize` | entero 1..48 (default 12) | Se coerciona desde texto |

Ejemplo: `GET /api/courses?q=guitarra&modality=VIRTUAL&price=paid&sort=price_asc&page=2&pageSize=12`
(requiere sesión: `authMiddleware` se mantiene igual).

### Cabeceras de respuesta

- `X-Total-Count`: total de cursos que cumplen los filtros (mismo `where` que el listado).
- `X-Page`, `X-Page-Size`: página actual y tamaño efectivo.
- Ya declaradas en `exposedHeaders` del CORS de `app.ts`.

### Cuerpo (sin cambios de forma: array)

Cada elemento = curso publicado + `instructor { firstName, lastName }` + `stats`:

```jsonc
{
  "id": "…", "title": "…", "description": "…",
  "modality": "VIRTUAL", "duration": "EIGHT", "price": 0, "status": "PUBLISHED",
  "instructor": { "firstName": "…", "lastName": "…" },
  "stats": {
    "cohortCount": 3,        // cohortes con deletedAt: null del curso
    "openCohortCount": 2,    // de esas cohortes, las que tienen endDate >= ahora
    "enrolledCount": 23,     // matrículas ACTIVE | PENDING_APPROVAL | PENDING_PAYMENT, deletedAt: null
    "totalCapacity": 45,     // suma de capacity de las cohortes no borradas
    "nextStartDate": "2026-11-01T14:00:00.000Z" // startDate >= ahora más próxima; null si no hay
  }
}
```

## Decisiones de implementación

- **Sin N+1**: un único `prisma.course.findMany` con
  `include: { instructor, cohorts: { where: { deletedAt: null }, include: { _count: { select: { enrollments: { where: { deletedAt: null, status: { in: [ACTIVE, PENDING_APPROVAL, PENDING_PAYMENT] } } } } } } } }`
  y `prisma.course.count({ where })` en el mismo `Promise.all`. Los agregados se calculan en memoria
  (`buildStats`) con una única referencia de "ahora" para toda la página.
- El servicio no toca HTTP: devuelve `{ total, page, pageSize, courses }`; el controlador setea las cabeceras.
- La query se valida en el servicio con `courseQuerySchema.parse(req.query)`, igual que `create` valida el body;
  el `errorHandler` existente traduce `ZodError` a 400.
- `openCohortCount` usa `endDate >= ahora` y `nextStartDate` usa `startDate >= ahora`: una cohorte en curso
  (ya empezó, no terminó) cuenta como abierta pero no como próxima fecha.

## Verificación (salida literal, 2026-10-16)

### `npx tsc --noEmit -p packages/api/tsconfig.json`

Sin salida, código de salida 0.

### `npx eslint packages/api/src packages/shared/src --ext .ts,.tsx`

Sin salida, código de salida 0 (`ESLINT_EXIT=0`).
(Nota: la primera pasada marcó 26 errores `prettier/prettier` en `course.schema.ts` por mezcla LF/CRLF;
se corrigieron con `npx eslint <archivo> --fix` y la re-ejecución quedó limpia.)

### `npm test --workspace @elprofeclei/api`

```
 > @elprofeclei/api@1.0.0 test
 > vitest run

 RUN  v4.1.12 D:/PAGINAS WEB CREADA POR IA/Portafolio/elprofeclei/packages/api

 ✓ test/access.test.ts (14 tests) 28ms
 ✓ test/schemas.test.ts (14 tests) 21ms
 ✓ test/courses.test.ts (12 tests) 33ms
 ✓ test/coupons.test.ts (10 tests) 14ms
 ✓ test/health.test.ts (1 test) 52ms

 Test Files  5 passed (5)
      Tests  51 passed (51)
   Start at  14:12:35
   Duration  8.09s (transform 1.18s, setup 0ms, import 2.33s, tests 148ms, environment 1ms)
```

(Advertencia previa no relacionada de Vite sobre `__dirname` en `vitest.config.ts:7`.)

Línea base previa a los cambios: los tres comandos ya pasaban (tsc 0, eslint 0, 39 tests);
los 12 tests nuevos son los de `courses.test.ts`.
