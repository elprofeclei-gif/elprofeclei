import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@elprofeclei/shared';
import { useAuth } from './hooks/useAuth';
import { Logo } from './components/Logo';
import { CoursesPage } from './pages/CoursesPage';
import { InstructorPanel } from './pages/InstructorPanel';
import { ManageCohortsPage } from './pages/ManageCohortsPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AttendanceInstructor } from './pages/AttendanceInstructor';
import { AttendanceStudent } from './pages/AttendanceStudent';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { VerifyPage } from './pages/VerifyPage';
import { CouponsAdmin } from './pages/CouponsAdmin';

function App() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  if (!user) return <LoginView />;

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <nav className="flex items-center justify-between px-6 py-3 bg-white dark:bg-lms-dark-card border-b border-lms-border dark:border-gray-700 shadow-sm">
        <Logo />
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
          >
            Inicio
          </Link>

          {/* Enlaces de Instructor/Admin */}
          {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN') && (
            <>
              <Link
                to="/instructor"
                className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
              >
                Panel
              </Link>
              <Link
                to="/manage"
                className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
              >
                Cohortes
              </Link>
              {/* AÑADE ESTE ENLACE SOLO PARA ADMIN */}
              {user.role === 'ADMIN' && (
                <Link
                  to="/coupons"
                  className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
                >
                  Cupones
                </Link>
              )}
            </>
          )}

          {/* Enlace de Asistencia para TODOS */}
          <Link
            to="/attendance"
            className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
          >
            Asistencia
          </Link>
          <Link
            to="/certificates"
            className="text-lms-text dark:text-lms-text-dark hover:text-vs-blue transition-colors"
          >
            Mis Certificados
          </Link>

          <button
            onClick={toggleTheme}
            className="px-3 py-1 border border-lms-border dark:border-gray-600 rounded-md text-xs text-lms-muted dark:text-lms-text-dark hover:bg-lms-bg dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-lms-border dark:border-gray-600">
            <div className="text-right">
              <p className="text-lms-text dark:text-lms-text-dark font-semibold text-sm">
                {user.email}
              </p>
              <p className="text-lms-muted dark:text-gray-400 text-xs">{user.role}</p>
            </div>
            <button
              onClick={() => logout()}
              className="text-vs-orange hover:underline text-sm font-semibold"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <Routes>
          <Route path="/" element={<CoursesPage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />

          {/* AÑADE ESTA LÍNEA */}
          <Route path="/course/:id/assessments" element={<AssessmentsPage />} />

          {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN') && (
            <>
              <Route path="/instructor" element={<InstructorPanel />} />
              <Route path="/manage" element={<ManageCohortsPage />} />
              {user.role === 'ADMIN' && <Route path="/coupons" element={<CouponsAdmin />} />}
              <Route path="/attendance" element={<AttendanceInstructor />} />
            </>
          )}

          {user.role === 'STUDENT' && <Route path="/attendance" element={<AttendanceStudent />} />}

          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/verify/:code" element={<VerifyPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

// Vista de Login Minimalista
function LoginView() {
  const { login, error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    await login(data.email, data.password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-lms-bg dark:bg-lms-dark-bg">
      <Toaster position="top-center" />
      <div className="mb-8">
        <Logo />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-lms-dark-card p-8 rounded-2xl border border-lms-border dark:border-gray-700 shadow-xl w-full max-w-sm"
      >
        <h2 className="text-xl mb-6 font-bold text-lms-text dark:text-white">Iniciar Sesión</h2>

        <div className="mb-4">
          <label className="block text-lms-text dark:text-lms-text-dark text-sm font-semibold mb-2">
            Correo electrónico
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-vs-blue focus:border-transparent transition-all"
            placeholder="usuario@elprofeclei.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-2">{errors.email.message}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-lms-text dark:text-lms-text-dark text-sm font-semibold mb-2">
            Contraseña
          </label>
          <input
            type="password"
            {...register('password')}
            className="w-full bg-lms-bg dark:bg-gray-800 text-lms-text dark:text-lms-text-dark border border-lms-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-vs-blue focus:border-transparent transition-all"
            placeholder="********"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-2">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-vs-blue text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-md"
        >
          {isSubmitting ? 'Cargando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default App;
