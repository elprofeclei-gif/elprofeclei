import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coursesService } from '../services/courses.service';
import { Skeleton } from '../components/Skeleton';
import type { CourseView } from '@elprofeclei/shared';

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesService
      .getPublished()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-lms-text dark:text-lms-text-dark mb-6">
        Cursos Disponibles
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : courses.length === 0 ? (
          <p className="text-lms-muted col-span-full text-center py-10">
            No hay cursos publicados en este momento.
          </p>
        ) : (
          courses.map((c: CourseView) => (
            <Link
              to={`/course/${c.id}`}
              key={c.id}
              className="bg-white dark:bg-lms-dark-card rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              <div className="h-32 bg-gradient-to-br from-vs-blue to-vs-green flex items-center justify-center">
                <span className="text-4xl font-code text-white opacity-50">&lt;/&gt;</span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-lms-text dark:text-lms-text-dark mb-2 group-hover:text-vs-blue transition-colors">
                  {c.title}
                </h2>
                <p className="text-lms-muted text-sm mb-4 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-vs-blue/10 text-vs-blue px-2 py-1 rounded-md font-medium">
                    {c.modality}
                  </span>
                  <span className="font-bold text-lms-text dark:text-lms-text-dark">
                    ${c.price.toLocaleString('es-CO')}
                  </span>
                </div>
                <p className="mt-4 pt-4 border-t border-lms-border text-xs text-lms-muted">
                  Instructor: {c.instructor.firstName} {c.instructor.lastName}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
