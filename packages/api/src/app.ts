import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middlewares/errorHandler';
import { rateLimit } from '@/middlewares/rateLimit';
import healthRouter from '@/modules/health/health.routes';
import authRouter from '@/modules/auth/auth.routes';
import usersRouter from '@/modules/users/users.routes';
import courseRouter from '@/modules/courses/course.routes';
import enrollmentRouter from '@/modules/enrollments/enrollment.routes';
import venueRouter from '@/modules/venues/venue.routes';
import cohortRouter from '@/modules/cohorts/cohort.routes';
import sessionRouter from '@/modules/sessions/session.routes';
import attendanceRouter from '@/modules/attendance/attendance.routes';
import assessmentRouter from '@/modules/assessments/assessment.routes';
import certificateRouter from '@/modules/certificates/certificate.routes';
import progressRouter from '@/modules/progress/progress.routes';
import couponRouter from '@/modules/coupons/coupon.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './docs/swagger.json';

const app = express();

// Detrás de un proxy (Netlify/Render) la IP real llega en X-Forwarded-For:
// es necesaria para que el rate limiting agrupe bien a los clientes.
if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
    // La paginación viaja en cabeceras: el navegador solo las expone si se declaran
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// Límite general suave y límite estricto en autenticación (fuerza bruta)
app.use(
  '/api',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    keyPrefix: 'global',
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    keyPrefix: 'auth',
  }),
);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/courses', courseRouter);
app.use('/api/enrollments', enrollmentRouter);
app.use('/api/venues', venueRouter);
app.use('/api/cohorts', cohortRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assessments', assessmentRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/progress', progressRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Recurso de la API no encontrado: respondemos JSON, no el HTML por defecto de Express
app.use('/api', (_req, res) => {
  res.status(404).json({ status: 'error', message: 'Recurso no encontrado' });
});

app.use(errorHandler);

export default app;
