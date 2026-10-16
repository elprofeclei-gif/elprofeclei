# ADR 0001 — Monorepo con npm workspaces y Zod compartido

- **Estado**: aceptado
- **Fecha**: 2026-10-16

## Contexto

El proyecto lo mantiene una sola persona con apoyo de IA. Se necesita compartir validaciones entre frontend y backend sin duplicar reglas, y mantener entregas pequeñas y verificables.

## Decisión

- Monorepo con npm workspaces: `packages/api` (Express + Prisma), `packages/web` (React + Vite + Tailwind) y `packages/shared` (esquemas Zod y tipos).
- `packages/shared` se consume como código fuente TypeScript (`main: src/index.ts`), sin compilación propia.
- Un mismo esquema Zod valida el formulario del navegador y el cuerpo de la petición en la API.

## Consecuencias

- Una regla de negocio (por ejemplo, el tope del 100 % en descuentos porcentuales) se escribe una sola vez y vale para ambos lados.
- El backend se ejecuta con `tsx` en vez de compilar a JavaScript, así que no hay carpeta `dist` de producción: si el hospedaje exige JavaScript compilado, hará falta añadir un `build` que compile también `shared`.
- Cambiar un esquema compartido afecta a los dos paquetes a la vez: es la ventaja buscada, pero obliga a correr el typecheck de ambos antes de dar algo por terminado.
