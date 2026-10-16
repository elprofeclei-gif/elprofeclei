# elprofeclei

Marketplace de cursos virtuales, presenciales e híbridos: un instructor crea cursos, un ADMIN los aprueba y los estudiantes se matriculan por cohortes (con pago y cupones).

Monorepo con npm workspaces:

| Paquete | Contenido |
| --- | --- |
| `packages/api` | API REST con Express + Prisma (MVC: rutas → controladores → servicios) |
| `packages/web` | SPA con React + Vite + Tailwind |
| `packages/shared` | Esquemas Zod y tipos compartidos entre API y web |

## Requisitos

- Node.js 20 o superior
- Docker (PostgreSQL local) o una base PostgreSQL gestionada
- Windows con Git Bash, o Linux/macOS

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Base de datos local
docker compose up -d

# 3. Variables de entorno de la API (completa las claves de firma)
cp packages/api/.env.example packages/api/.env

# 4. Esquema, cliente de Prisma y datos de prueba
npx prisma migrate dev --schema packages/api/prisma/schema.prisma
npm run prisma:seed --workspace @elprofeclei/api

# 5. API y web en dos terminales
npm run dev:api
npm run dev:web
```

Usuarios del seed (contraseña `Password123!`): `admin@elprofeclei.com`, `profe@elprofeclei.com`, `estudiante@elprofeclei.com`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev:api` | API en modo desarrollo con recarga |
| `npm run dev:web` | SPA de desarrollo (proxy `/api` a `localhost:3000`) |
| `npm run lint` | ESLint en todo el repo |
| `npm run format` | Prettier en todo el repo |
| `npm test --workspace @elprofeclei/api` | Pruebas de la API con Vitest |
| `npm run build --workspace @elprofeclei/web` | Typecheck + build de la SPA |
| `npx tsc --noEmit -p packages/api/tsconfig.json` | Typecheck de la API |

## Variables de entorno de la API

Todas se validan al arrancar (`packages/api/src/config/env.ts`) y la API no inicia si falta alguna obligatoria:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL |
| `PORT` | Puerto de la API (3000 por defecto) |
| `NODE_ENV` | `development`, `test` o `production` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Claves de firma (mínimo 10 caracteres) |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` / `COOKIE_DOMAIN` | Cookie del refresh token |
| `REFRESH_TOKEN_TTL_DAYS` | Vigencia del refresh token (7 por defecto) |
| `QR_TOKEN_SECRET` | Secreto propio de los QR de asistencia (opcional) |
| `TRUST_PROXY` | Número de proxies delante de la API (1 en Netlify/Render) |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | Rate limiting |

## Despliegue

- **Frontend (Netlify)**: build `npm run build --workspace @elprofeclei/web`, publish `dist`, y `VITE_API_URL` apuntando al backend (`packages/web/.env.example`).
- **Backend**: hospedaje Node con `npm run start --workspace @elprofeclei/api`, con `CORS_ORIGIN` incluyendo el dominio de Netlify.
- **Cookie del refresh token**: si el frontend y la API quedan en dominios distintos, el navegador exige `COOKIE_SAMESITE=none` y `COOKIE_SECURE=true` con HTTPS; con `strict` la cookie no viaja entre sitios y la sesión no se renueva.

## Modelo de negocio implementado

- **Cursos**: modalidad VIRTUAL/ONSITE/HYBRID, duración 8/10/16/20 horas, estados DRAFT → PENDING_REVIEW → PUBLISHED. Solo el ADMIN publica.
- **Cohortes**: pertenecen a un curso, con cupo y modo de aprobación MANUAL o AUTO.
- **Sesiones**: VIRTUAL_SYNC (enlace), ONSITE (sede y horario) o ASYNC_VIDEO (URL de video).
- **Matrículas**: curso gratuito entra al flujo de aprobación; curso de pago genera una prematrícula `PENDING_PAYMENT` con referencia de pago que el instructor o el ADMIN confirman.
- **Asistencia**: el instructor genera un QR firmado de 5 minutos; solo estudiantes con matrícula `ACTIVE` pueden registrarla.
- **Cupones y becas**: descuento porcentual (máximo 100 %) o monto fijo, vigencia, usos máximos y asignación opcional a un usuario.
- **Evaluaciones**: quiz o tarea, con una entrega por estudiante y calificación con retroalimentación.
- **Certificados**: código de verificación con URL pública de validación.

## Estado

Fases 1 a 5 implementadas (setup, autenticación, CRUD, UI, asistencia por QR, evaluaciones, certificados y cupones). Pendiente: pasarela de pago real, almacenamiento externo de archivos, envío de correos y generación de PDF del certificado.
