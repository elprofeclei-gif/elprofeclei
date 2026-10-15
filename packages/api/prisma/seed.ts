import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Limpiar BD (opcional en desarrollo)
  await prisma.coupon.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.assessment.deleteMany();
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

  await prisma.user.create({
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

  const course = await prisma.course.create({
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

  const cohort = await prisma.cohort.create({
    data: {
      courseId: course.id,
      startDate: new Date('2024-05-01T08:00:00Z'),
      endDate: new Date('2024-05-30T10:00:00Z'),
      capacity: 20,
      approvalMode: 'MANUAL',
    },
  });

  await prisma.session.create({
    data: {
      cohortId: cohort.id,
      title: 'Introducción y Configuración',
      type: 'VIRTUAL_SYNC',
      videoUrl: 'https://meet.google.com/abc-defg-hij',
      startTime: new Date('2024-05-01T08:00:00Z'),
      endTime: new Date('2024-05-01T10:00:00Z'),
    },
  });

  await prisma.session.create({
    data: {
      cohortId: cohort.id,
      title: 'Sesión Presencial de Repaso',
      type: 'ONSITE',
      venueId: venue.id,
      startTime: new Date('2024-05-15T08:00:00Z'),
      endTime: new Date('2024-05-15T10:00:00Z'),
    },
  });

  console.log('✅ Seed ejecutado: Admin, Instructor, Estudiante, Sede, Curso, Cohorte y Sesiones creados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });