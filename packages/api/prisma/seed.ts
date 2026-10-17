import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Limpiar BD (opcional en desarrollo)
  await prisma.coupon.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.course.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@elprofeclei.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'General',
      role: 'ADMIN',
      consent: true,
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: 'profe@elprofeclei.com',
      password: passwordHash,
      firstName: 'Profe',
      lastName: 'Clei',
      role: 'INSTRUCTOR',
      consent: true,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'estudiante@elprofeclei.com',
      password: passwordHash,
      firstName: 'Estudiante',
      lastName: 'Prueba',
      role: 'STUDENT',
      consent: true,
    },
  });

  const venue = await prisma.venue.create({
    data: {
      name: 'Sede Principal Bogotá',
      address: 'Av. Siempre Viva 742',
      capacity: 30,
    },
  });

  // Curso de pago: una cohorte MANUAL y una AUTO para probar ambos flujos
  const paidCourse = await prisma.course.create({
    data: {
      title: 'TypeScript Estricto desde Cero',
      description: 'Curso completo para dominar TS.',
      modality: 'HYBRID',
      duration: 'TEN',
      price: new Prisma.Decimal('150000.00'),
      status: 'PUBLISHED',
      instructorId: instructor.id,
    },
  });

  const manualCohort = await prisma.cohort.create({
    data: {
      courseId: paidCourse.id,
      name: 'Cohorte Fines de Semana',
      startDate: new Date('2026-11-07T13:00:00Z'),
      endDate: new Date('2026-11-29T17:00:00Z'),
      capacity: 20,
      approvalMode: 'MANUAL',
    },
  });

  const autoCohort = await prisma.cohort.create({
    data: {
      courseId: paidCourse.id,
      name: 'Cohorte Express Nocturna',
      startDate: new Date('2026-11-02T23:00:00Z'),
      endDate: new Date('2026-11-25T01:00:00Z'),
      capacity: 15,
      approvalMode: 'AUTO',
    },
  });

  await prisma.session.create({
    data: {
      cohortId: manualCohort.id,
      title: 'Introducción y Configuración',
      type: 'VIRTUAL_SYNC',
      videoUrl: 'https://meet.google.com/abc-defg-hij',
      startTime: new Date('2026-11-07T13:00:00Z'),
      endTime: new Date('2026-11-07T15:00:00Z'),
    },
  });

  await prisma.session.create({
    data: {
      cohortId: manualCohort.id,
      title: 'Sesión Presencial de Repaso',
      type: 'ONSITE',
      venueId: venue.id,
      startTime: new Date('2026-11-21T13:00:00Z'),
      endTime: new Date('2026-11-21T15:00:00Z'),
    },
  });

  await prisma.session.create({
    data: {
      cohortId: autoCohort.id,
      title: 'Clase en Vivo Nocturna',
      type: 'VIRTUAL_SYNC',
      videoUrl: 'https://meet.google.com/xyz-wxyz-klm',
      startTime: new Date('2026-11-03T23:00:00Z'),
      endTime: new Date('2026-11-04T01:00:00Z'),
    },
  });

  // Curso gratuito para probar matrícula directa sin pago
  const freeCourse = await prisma.course.create({
    data: {
      title: 'Introducción a la Ley 1581 y Datos Personales',
      description: 'Charla gratuita sobre protección de datos en Colombia.',
      modality: 'VIRTUAL',
      duration: 'EIGHT',
      price: new Prisma.Decimal('0.00'),
      status: 'PUBLISHED',
      instructorId: instructor.id,
    },
  });

  await prisma.cohort.create({
    data: {
      courseId: freeCourse.id,
      name: 'Cohorte Noviembre',
      startDate: new Date('2026-11-10T18:00:00Z'),
      endDate: new Date('2026-11-12T20:00:00Z'),
      capacity: 50,
      approvalMode: 'AUTO',
    },
  });

  // Cupones de prueba: porcentual, monto fijo y beca 100% asignada al estudiante
  await prisma.coupon.create({
    data: {
      code: 'BIENVENIDO10',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal('10.00'),
      validFrom: new Date('2026-10-01T00:00:00Z'),
      validUntil: new Date('2026-12-31T23:59:59Z'),
      maxUses: 100,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'DESCUENTO50K',
      discountType: 'FIXED',
      discountValue: new Prisma.Decimal('50000.00'),
      validFrom: new Date('2026-10-01T00:00:00Z'),
      validUntil: new Date('2026-12-31T23:59:59Z'),
      maxUses: 50,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'BECAESTUDIANTE',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal('100.00'),
      validFrom: new Date('2026-10-01T00:00:00Z'),
      validUntil: new Date('2026-12-31T23:59:59Z'),
      maxUses: 1,
      assignedToId: student.id,
    },
  });

  console.log(
    '✅ Seed ejecutado: Admin, Instructor, Estudiante, Sede, 2 cursos (pago y gratis), 4 cohortes, sesiones y 3 cupones.',
  );
  console.log(`   Admin: admin@elprofeclei.com / Instructor: profe@elprofeclei.com (id ${instructor.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
