# Configurar el correo para que la recuperación llegue al buzón

La capa de correo ya está en el código (`packages/api/src/utils/mailer.ts`): soporta **Resend** y
**SendGrid** por HTTPS, sin añadir dependencias. Con `MAIL_PROVIDER=none` (el valor por defecto) el
contenido del correo se registra en el log y el flujo funciona igual: eso es lo que pasa hoy en
desarrollo.

Para que el enlace llegue al buzón solo faltan dos cosas: **tus credenciales** y **un parche de 6
líneas** en `passwordReset.service.ts` que no puedo aplicar por el bloqueo de escritura del guardia
(ese archivo contiene la asignación del campo de contraseña).

---

## 1. Lo que tienes que hacer tú (10 minutos)

### Opción recomendada: Resend

1. Crea una cuenta en <https://resend.com> (plan gratuito: 3.000 correos al mes, 100 al día).
2. **Domains → Add domain** y agrega los registros DNS que te indique (SPF y DKIM). Si no tienes
   dominio propio, usa el remitente de pruebas `onboarding@resend.dev` (solo envía a tu propio
   correo de la cuenta: sirve para probar, no para producción).
3. **API Keys → Create API Key** con permiso de envío. Copia la clave `re_...` (solo se muestra una
   vez).
4. Define las variables en el entorno del backend (no en el repositorio):

```
MAIL_PROVIDER=resend
MAIL_FROM=no-reply@tudominio.com     # debe ser de un dominio verificado (o onboarding@resend.dev en pruebas)
MAIL_FROM_NAME=elprofeclei
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://tudominio.com   # base para armar el enlace del correo
```

### Alternativa: SendGrid

1. Cuenta en <https://sendgrid.com> → **Settings → Sender Authentication** (verifica el dominio).
2. **Settings → API Keys → Create API Key** (permiso *Mail Send*).
3. Variables:

```
MAIL_PROVIDER=sendgrid
MAIL_FROM=no-reply@tudominio.com
MAIL_FROM_NAME=elprofeclei
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://tudominio.com
```

### Buenas prácticas que conviene que hagas también

- **Nunca subas la clave al repositorio**: va en el panel de variables del hosting (Render,
  Railway, Fly, Netlify…) y en tu `.env` local, que ya está en `.gitignore`.
- Si sospechas que la clave se filtró, **revócala y genera otra** desde el panel del proveedor.
- Configura `MAIL_FROM` con un buzón real que exista (por ejemplo `no-reply@`), pero con
  `Reply-To` a una dirección atendida si quieres recibir respuestas: hoy el código no lo envía, se
  añadiría en la misma llamada del mailer.
- Revisa la carpeta de spam la primera vez: con SPF/DKIM bien puestos, el enlace llega a la bandeja.

---

## 2. El parche de 6 líneas (lo único que no pude escribir)

En `packages/api/src/modules/auth/passwordReset.service.ts`:

**a)** Añade el import junto a los demás:

```ts
import { enviarCorreo, plantillaRecuperacion } from '@/utils/mailer';
```

**b)** Cambia la constante de vigencia para poder reutilizar el número:

```ts
const VIGENCIA_MINUTOS = 15;          // antes: const VIGENCIA = '15m';
```

**c)** En el `jwt.sign` del paso 1, usa esa constante:

```ts
      { expiresIn: `${VIGENCIA_MINUTOS}m` },   // antes: { expiresIn: VIGENCIA },
```

**d)** Debajo de la línea `const base = env.FRONTEND_URL ?? 'http://localhost:5173';`, añade:

```ts
    const url = `${base}/recuperar?codigo=${codigo}`;
```

**e)** Justo antes del `return { enviado: true };` final del método `solicitar`, añade:

```ts
    // Envío real con el proveedor configurado.
    // Con MAIL_PROVIDER=none, el contenido queda en el log y el flujo sigue igual.
    const plantilla = plantillaRecuperacion({
      nombre: user.firstName,
      url,
      minutos: VIGENCIA_MINUTOS,
    });
    await enviarCorreo({ para: correo, ...plantilla });
```

Se conserva el `logger.info` que ya existe: sirve para ver el enlace en desarrollo aunque el
proveedor esté configurado. Después del parche:

```
npx tsc --noEmit -p packages/api/tsconfig.json
npx eslint packages/api/src
npm test --workspace @elprofeclei/api
```

---

## 3. Comprobar que quedó “full”

1. `GET /api/health` ahora informa el estado del correo:

```json
{ "status": "OK", "correo": { "proveedor": "resend", "listo": true } }
```

Con `proveedor: "none"` o `listo: false`, el envío no sale del log.

2. Pide un enlace real: entra a `/recuperar`, escribe el correo de una cuenta existente y revisa el
   buzón (y spam). El enlace abre `/recuperar?codigo=…` con el campo ya relleno.
3. Define la contraseña nueva y entra con ella.
4. Repite con el mismo enlace: debe responder «Este enlace ya fue usado».
5. Si Resend o SendGrid rechazan el envío, la API registra el motivo exacto
   (`estado` + `detalle` del proveedor) en el log y responde 502; el usuario ve un aviso claro.

## 4. Si algún día quieres SMTP

SMTP requiere una dependencia (`nodemailer`). El camino más simple es quedarse con HTTPS: los dos
proveedores de arriba funcionan sin paquetes nuevos y con menos configuración. Si lo necesitas,
el cambio se hace solo dentro de `mailer.ts` (agregar la rama `smtp` en `enviarCorreo`), sin tocar
la recuperación de contraseña.
