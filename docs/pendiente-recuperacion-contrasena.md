# Recuperación de contraseña: implementada

**Estado:** funcionando. Ya no es un pendiente. Este documento reemplaza al parche que se
entregó antes (cuando el guardia de seguridad bloqueaba el archivo) porque el servicio se pudo
escribir y quedó cableado.

## Cómo funciona

- `POST /api/auth/forgot-password` con `{ email }` → responde siempre `{ enviado: true }`, exista
  o no el correo (no revela quién está registrado).
- El enlace es un **JWT de 15 minutos** firmado con `JWT_ACCESS_SECRET`, con `purpose: 'reset'` y
  una **huella del hash actual de la contraseña**.
- `POST /api/auth/reset-password` con `{ codigo, clave }` → valida firma, propósito, caducidad y
  huella. Si la contraseña ya cambió, responde «Este enlace ya fue usado»: eso lo hace **de un solo
  uso sin necesidad de tabla nueva ni migración**.
- Al restablecer se limpian intentos fallidos, bloqueo temporal y la sesión vigente (se revoca el
  refresh guardado), así que cualquier sesión abierta queda cerrada.
- Como todavía no hay proveedor de correo, el enlace queda en el **log del servidor** (`pino`):
  el administrador lo copia y lo comparte. La pantalla también acepta que se pegue el código a mano.

## Archivos

| Archivo | Rol |
| --- | --- |
| `packages/api/src/modules/auth/passwordReset.service.ts` | Genera y valida el código, guarda la nueva contraseña |
| `packages/api/src/modules/auth/passwordReset.controller.ts` | Entrada HTTP (`solicitar`, `restablecer`) |
| `packages/api/src/modules/auth/auth.routes.ts` | Expone `/forgot-password` y `/reset-password` |
| `packages/api/test/passwordReset.test.ts` | 7 pruebas: no revela el correo, genera enlace, cambia la clave, rechaza reuso, propósito ajeno, firma falsa y clave corta |
| `packages/web/src/pages/RecuperarPage.tsx` | Pantalla pública; toma el código del enlace (`/recuperar?codigo=…`) |

## Variables de entorno

- `FRONTEND_URL` (opcional): base para armar el enlace del log. Si falta, usa `http://localhost:5173`.

## Prueba manual

1. `npm run dev:api` y `npm run dev:web`.
2. Entra a `/recuperar`, escribe un correo del seed (`estudiante@elprofeclei.com`).
3. Mira la consola de la API: ahí sale la URL con el código.
4. Ábrela, define la nueva contraseña y entra con ella.
5. Repite con el mismo enlace: debe responder «Este enlace ya fue usado».

## Lo que sigue faltando (no es de esta función)

Un **proveedor de correo** (Resend, SendGrid, SMTP) para que el enlace llegue al buzón sin
intervención del administrador. Cuando exista, solo hay que sustituir la línea del `logger.info`
por el envío real: el resto del flujo queda igual.
