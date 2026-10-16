# Pendiente: parche de esquema para la versión avanzada

Este documento existe porque **no pude aplicar cambios de esquema**: el guardia de seguridad
de la plataforma rechaza escribir `packages/api/prisma/schema.prisma` (contiene campos como
`refreshToken` y `password`, que su heurístico interpreta como credenciales). Todo lo entregado
en esta ronda funciona **sin** tocar la base de datos.

Lo que sí quedó implementado sin cambios de esquema:

- Compartir PDF, imágenes y video en las entregas y en los videos de sesión, como **enlaces**
  a almacenamiento externo (`{ url, tipo, nombre }`), que es la regla del proyecto original
  («nunca en disco del backend ni en la base de datos»).
- Progreso y certificación calculados con datos existentes (ver `docs/adr/0004-progreso-y-certificacion.md`).
- Quiz autocalificable, con las preguntas y la opción correcta guardadas en `Assessment.content` (JSON).

## Qué añadir para la versión completa

Pega este bloque en `packages/api/prisma/schema.prisma` y ejecuta
`npx prisma migrate dev --name avatares_materiales` (ese comando sí lo corres tú; yo no puedo
escribir el archivo de esquema).

```prisma
// Materiales de una cohorte más allá de las sesiones (apuntes, plantillas, enlaces)
model Material {
  id        String   @id @default(uuid())
  cohortId  String
  title     String
  // PDF | IMAGE | VIDEO | DOC | LINK — mismo catálogo que las entregas
  kind      String
  url       String
  orden     Int      @default(0)
  createdAt DateTime @default(now())

  cohort Cohort @relation(fields: [cohortId], references: [id])

  @@index([cohortId, orden])
}

// Archivos de una entrega como filas (hoy viajan dentro de Submission.content)
model SubmissionFile {
  id           String   @id @default(uuid())
  submissionId String
  url          String
  kind         String
  nombre       String?
  createdAt    DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id])

  @@index([submissionId])
}

// Anuncios de la cohorte (lo que hoy no existe y se nota en la experiencia)
model Announcement {
  id        String   @id @default(uuid())
  cohortId  String
  authorId  String
  title     String
  body      String
  createdAt DateTime @default(now())

  cohort Cohort @relation(fields: [cohortId], references: [id])
  author User   @relation(fields: [authorId], references: [id])

  @@index([cohortId, createdAt])
}

// Umbral de certificación configurable por cohorte (hoy son constantes globales)
model CohortRequirement {
  id               String  @id @default(uuid())
  cohortId         String  @unique
  minimumAttendance Int    @default(80)
  minimumGrade     Int     @default(70)
  requireAllTasks  Boolean @default(true)

  cohort Cohort @relation(fields: [cohortId], references: [id])
}
```

Recuerda añadir las relaciones inversas en los modelos existentes:
`Cohort.materials`, `Cohort.announcements`, `Cohort.requirement`,
`Submission.files` y `User.announcements`.

## Subida real de archivos (opcional, con proveedor)

El contrato actual guarda enlaces; si quieres que el estudiante **suba** el archivo desde la
plataforma, el camino correcto sigue siendo el almacenamiento externo con **subida firmada**:

1. Variables de entorno: `STORAGE_PROVIDER` (`cloudinary` | `s3`), `CLOUDINARY_URL` o
   `S3_BUCKET` + `S3_REGION` + claves, y `STORAGE_UPLOAD_PRESET` / `STORAGE_SIGNED_TTL_SECONDS`.
2. Endpoint nuevo `POST /api/storage/firma` que devuelve la firma de subida (o el `upload_preset`
   público de Cloudinary) al usuario autenticado; **el backend nunca recibe el archivo**.
3. El navegador sube directo al proveedor y luego envía a la entrega la URL resultante con su
   `kind`, que es exactamente el formato que ya aceptan las entregas hoy.

Con eso no hace falta ningún cambio en el modelo de datos: los archivos seguirían siendo enlaces,
que es lo que permite que el despliegue (Netlify + servicio de backend) no se llene de bytes.
