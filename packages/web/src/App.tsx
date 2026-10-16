import { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@elprofeclei/shared';
import { useAuth } from './hooks/useAuth';
import { Sidebar, enlacesPorRol } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Logo } from './components/Logo';
import { CoursesPage } from './pages/CoursesPage';

// Carga diferida por ruta: el catálogo entra en el paquete inicial y el resto se
// descarga al visitarlo (incluye html5-qrcode, que solo usa el escáner).
const StudentDashboard = lazy(() =>
  import('./pages/StudentDashboard').then((modulo) => ({ default: modulo.StudentDashboard })),
);
const InstructorPanel = lazy(() =>
  import('./pages/InstructorPanel').then((modulo) => ({ default: modulo.InstructorPanel })),
);
const ManageCohortsPage = lazy(() =>
  import('./pages/ManageCohortsPage').then((modulo) => ({ default: modulo.ManageCohortsPage })),
);
const CourseDetailPage = lazy(() =>
  import('./pages/CourseDetailPage').then((modulo) => ({ default: modulo.CourseDetailPage })),
);
const AssessmentsPage = lazy(() =>
  import('./pages/AssessmentsPage').then((modulo) => ({ default: modulo.AssessmentsPage })),
);
const AttendanceInstructor = lazy(() =>
  import('./pages/AttendanceInstructor').then((modulo) => ({
    default: modulo.AttendanceInstructor,
  })),
);
const AttendanceStudent = lazy(() =>
  import('./pages/AttendanceStudent').then((modulo) => ({ default: modulo.AttendanceStudent })),
);
const CertificatesPage = lazy(() =>
  import('./pages/CertificatesPage').then((modulo) => ({ default: modulo.CertificatesPage })),
);
const CouponsAdmin = lazy(() =>
  import('./pages/CouponsAdmin').then((modulo) => ({ default: modulo.CouponsAdmin })),
);
const VerifyPage = lazy(() =>
  import('./pages/VerifyPage').then((modulo) => ({ default: modulo.VerifyPage })),
);
const ClassroomPage = lazy(() =>
  import('./pages/ClassroomPage').then((modulo) => ({ default: modulo.ClassroomPage })),
);
const CertificatePrintPage = lazy(() =>
  import('./pages/CertificatePrintPage').then((modulo) => ({
    default: modulo.CertificatePrintPage,
  })),
);
const CohortProgressPage = lazy(() =>
  import('./pages/CohortProgressPage').then((modulo) => ({ default: modulo.CohortProgressPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((modulo) => ({ default: modulo.ProfilePage })),
);
const CampusDocentePage = lazy(() =>
  import('./pages/CampusDocentePage').then((modulo) => ({ default: modulo.CampusDocentePage })),
);
const AdminPanelPage = lazy(() =>
  import('./pages/AdminPanelPage').then((modulo) => ({ default: modulo.AdminPanelPage })),
);
const RegistroPage = lazy(() =>
  import('./pages/RegistroPage').then((modulo) => ({ default: modulo.RegistroPage })),
);
const RecuperarPage = lazy(() =>
  import('./pages/RecuperarPage').then((modulo) => ({ default: modulo.RecuperarPage })),
);
// Mis evaluaciones: reutiliza la pantalla de evaluaciones resolviendo el curso desde la matrícula
const MisAulasPage = lazy(() =>
  import('./pages/MisAulasPage').then((modulo) => ({ default: modulo.MisAulasPage })),
);

const CARGANDO = (
  <p role="status" className="py-16 text-center text-lms-muted dark:text-gray-400">
    Cargando…
  </p>
);

// A dónde llega cada rol al iniciar sesión (antes todos caían en el marketplace)
export function inicioPorRol(rol: string): string {
  if (rol === 'STUDENT') return '/campus';
  if (rol === 'INSTRUCTOR') return '/panel';
  if (rol === 'ADMIN') return '/panel';
  return '/';
}

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      {user ? <SesionIniciada rol={user.role} /> : <AccesoPublico />}
    </BrowserRouter>
  );
}

/** Armazón con barra lateral (escritorio) y cajón (móvil) para usuarios con sesión */
function SesionIniciada({ rol }: { rol: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirigido, setRedirigido] = useState(false);

  // Primer aterrizaje tras iniciar sesión: se lleva a cada rol a su pantalla de inicio
  useEffect(() => {
    if (redirigido) return;
    if (location.pathname === '/' || location.pathname === '/ingresar') {
      navigate(inicioPorRol(rol), { replace: true });
    }
    setRedirigido(true);
  }, [rol, location.pathname, navigate, redirigido]);

  const enlaces = enlacesPorRol(rol);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en móvil: hamburguesa + marca */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-lms-border bg-white px-4 py-2.5 md:hidden dark:border-gray-700 dark:bg-lms-dark-card">
          <MobileNav enlaces={enlaces} />
          <Link to="/" aria-label="Ir al catálogo de cursos">
            <Logo />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Suspense fallback={CARGANDO}>
            <Routes>
              <Route path="/" element={<CoursesPage />} />
              <Route path="/course/:id" element={<CourseDetailPage />} />
              <Route path="/course/:id/assessments" element={<AssessmentsPage />} />
              <Route path="/aula/:id" element={<ClassroomPage />} />
              <Route path="/certificados/:code" element={<CertificatePrintPage />} />
              <Route path="/perfil" element={<ProfilePage />} />

              {rol === 'STUDENT' && (
                <>
                  <Route path="/campus" element={<StudentDashboard />} />
                  <Route path="/aula" element={<MisAulasPage />} />
                  <Route path="/evaluaciones" element={<MisAulasPage />} />
                  <Route path="/attendance" element={<AttendanceStudent />} />
                  <Route path="/certificates" element={<CertificatesPage />} />
                </>
              )}

              {(rol === 'INSTRUCTOR' || rol === 'ADMIN') && (
                <>
                  <Route path="/panel" element={<CampusDocentePage />} />
                  <Route path="/instructor" element={<InstructorPanel />} />
                  <Route path="/manage" element={<ManageCohortsPage />} />
                  {/* Las evaluaciones se gestionan por curso: se elige desde el listado */}
                  <Route path="/evaluaciones" element={<InstructorPanel />} />
                  <Route path="/progreso" element={<CohortProgressPage />} />
                  <Route path="/attendance" element={<AttendanceInstructor />} />
                </>
              )}

              {rol === 'ADMIN' && (
                <>
                  <Route path="/admin" element={<AdminPanelPage />} />
                  <Route path="/coupons" element={<CouponsAdmin />} />
                </>
              )}

              <Route path="*" element={<Navigate to={inicioPorRol(rol)} replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Acceso público: cualquiera puede ver la oferta antes de crear una cuenta */
function AccesoPublico() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-lms-border bg-white dark:border-gray-700 dark:bg-lms-dark-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Ir al catálogo de cursos">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/ingresar"
              className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-lms-text transition-colors hover:bg-lms-bg dark:border-gray-600 dark:text-lms-text-dark dark:hover:bg-gray-700"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="inline-flex h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-vs-blue dark:text-vs-bg"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={CARGANDO}>
          <Routes>
            <Route path="/" element={<CoursesPage />} />
            <Route path="/course/:id" element={<CourseDetailPage />} />
            <Route path="/verify/:code" element={<VerifyPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/recuperar" element={<RecuperarPage />} />
            <Route path="/ingresar" element={<LoginView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

// Vista de Login: con ver/ocultar contraseña, correo recordado y enlaces de alta
function LoginView() {
  const { login, error } = useAuth();
  const [verContrasena, setVerContrasena] = useState(false);
  const [correoRecordado] = useState(() => {
    try {
      return localStorage.getItem('elprofeclei-correo') ?? '';
    } catch {
      return '';
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: correoRecordado },
  });

  const onSubmit = async (data: LoginInput) => {
    await login(data.email, data.password);
    try {
      localStorage.setItem('elprofeclei-correo', data.email);
    } catch {
      /* navegación privada sin almacenamiento */
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col py-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-lms-border bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-lms-dark-card"
      >
        <h1 className="mb-6 text-xl font-bold text-lms-text dark:text-lms-text-dark">
          Iniciar sesión
        </h1>

        {error && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
            className="w-full rounded-lg border border-lms-border bg-lms-bg p-3 text-lms-text dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
            placeholder="usuario@elprofeclei.com"
          />
          {errors.email && (
            <p id="login-email-error" className="mt-2 text-xs text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-semibold text-lms-text dark:text-lms-text-dark"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={verContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
              className="w-full rounded-lg border border-lms-border bg-lms-bg p-3 pr-20 text-lms-text dark:border-gray-600 dark:bg-gray-800 dark:text-lms-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setVerContrasena(!verContrasena)}
              aria-pressed={verContrasena}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:underline dark:text-vs-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:focus-visible:ring-vs-blue"
            >
              {verContrasena ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="mt-2 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-700 py-3 font-bold text-white shadow-md transition-colors hover:bg-blue-800 disabled:opacity-50 dark:bg-vs-blue dark:text-vs-bg"
        >
          {isSubmitting ? 'Cargando...' : 'Entrar'}
        </button>

        <div className="mt-5 flex flex-col gap-2 text-center text-sm">
          <Link to="/recuperar" className="text-blue-700 hover:underline dark:text-vs-blue">
            Olvidé mi contraseña
          </Link>
          <p className="text-gray-600 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold text-blue-700 hover:underline dark:text-vs-blue"
            >
              Crear una gratis
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default App;
