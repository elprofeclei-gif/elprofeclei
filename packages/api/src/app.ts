import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middlewares/errorHandler';
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
import couponRouter from '@/modules/coupons/coupon.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

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
app.use('/api/coupons', couponRouter);

app.use(errorHandler);

export default app;
