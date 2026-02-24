import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated, authApi } from '../../services/api';
import './Dashboard.css';

const localThumbnails: Record<string, string> = {
  'conecta-con-nuevos-donantes': '/thumbnails/Conacta-con-donantes-portada.svg',
  'crea-contenido-para-redes-sociales-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-may.svg',
  'aprende-a-liderar-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-oct.svg',
  'growth-marketing-para-ongs': '/thumbnails/Imagen-destacada.svg',
  'impact-accelerator': '/thumbnails/Copy-of-Imagen-destacada-1.png',
  'propel-fellowship': '/thumbnails/Thumbnail-Propel-Fellowship-C8-1.png',
  'team-handbook': '/thumbnails/Portadas-cursos-1.png',
  'guia-de-procesos-internos': '/thumbnails/Portadas-cursos.png',
  'introduccion-a-chatgpt-para-organizaciones-sociale': '/thumbnails/Introduccion-a-CHATGPT.svg',
  'define-tus-metas-con-okrs': '/thumbnails/okr.jpg',
  'atrae-mas-vistas-con-seo': '/thumbnails/002.svg',
  'lean-data-para-impacto-social': '/thumbnails/Imagen-destacada-10-1.svg',
  'construye-indicadores-para-medir-impacto': '/thumbnails/Imagen-destacada-14.svg',
  'convierte-tus-ideas-en-un-pitch-ganador': '/thumbnails/001-1.svg',
  'potencia-tu-teoria-de-cambio': '/thumbnails/Imagen-destacada-11.svg',
  'aplica-a-tu-siguiente-grant-con-ia': '/thumbnails/003.svg',
  'identifica-a-tu-donante-ideal': '/thumbnails/Imagen-destacada-13-1.svg',
  'crea-tu-asistente-ia': '/thumbnails/Asistente-IA-portada.svg',
};

interface User {
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  subtitle: string;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number;
  lessons_count: number;
  category: {
    id: number;
    name: string;
  };
}

const getLevelLabel = (level: string) => {
  const levels: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };
  return levels[level] || level;
};

const CourseCard = ({ course, buttonLabel }: { course: Course; buttonLabel: string }) => {
  const src = localThumbnails[course.slug] || course.thumbnail_url;
  const lastLesson = buttonLabel === 'Continuar'
    ? localStorage.getItem(`lastLesson:${course.slug}`)
    : null;
  const courseUrl = lastLesson
    ? `/courses/${course.slug}#lesson-${lastLesson}`
    : `/courses/${course.slug}`;
  return (
    <Link to={courseUrl} className="course-card">
      <div className="course-thumbnail">
        {src ? (
          <img src={src} alt={course.title} loading="lazy" decoding="async" />
        ) : (
          <div className="course-thumbnail-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(242,242,242,0.3)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 13l3-3 2 2 4-4 4 4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
      </div>
      <div className="course-content">
        {course.category && (
          <span className="course-category">{course.category.name}</span>
        )}
        <h3 className="course-title">{course.title}</h3>
        <p className="course-description">{course.short_description || course.subtitle}</p>
        <div className="course-meta">
          <span className="course-level">{getLevelLabel(course.level)}</span>
          <span className="course-duration">{course.duration_hours}h</span>
        </div>
        <span className="course-button">{buttonLabel}</span>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledSlugs, setEnrolledSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, coursesRes, enrollmentsRes] = await Promise.all([
          authApi.getProfile(),
          coursesApi.list(),
          coursesApi.getMyEnrollments(),
        ]);

        if (profileRes.ok) {
          setUser(profileRes.data);
        }

        if (coursesRes.ok) {
          setCourses(coursesRes.data);
        }

        if (enrollmentsRes.ok) {
          const slugs = new Set<string>(
            enrollmentsRes.data.map((e: { course?: Course; slug?: string }) =>
              e.course?.slug || e.slug || ''
            ).filter(Boolean)
          );
          setEnrolledSlugs(slugs);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const enrolledCourses = courses.filter(c => enrolledSlugs.has(c.slug));
  const availableCourses = courses.filter(c => !enrolledSlugs.has(c.slug));

  const categories = ['Todos', ...Array.from(new Set(courses.map(c => c.category?.name).filter(Boolean)))];

  const filteredCourses = activeCategory === 'Todos'
    ? courses
    : courses.filter(c => c.category?.name === activeCategory);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">
              ¡Hola, {user?.first_name || 'Usuario'}!
            </h1>
            <p className="dashboard-subtitle">
              Define hoy las metas que guiarán tu 2026:
            </p>
          </div>
        </div>

        {/* Section 1: Pick up where you left off */}
        {enrolledCourses.length > 0 && (
          <div className="courses-section">
            <h2 className="section-title">Continúa donde lo dejaste</h2>
            <div className="courses-scroll">
              {enrolledCourses.map((course) => (
                <CourseCard key={course.id} course={course} buttonLabel="Continuar" />
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Catalog with filters */}
        <div className="courses-section">
          <h2 className="section-title">Explora nuestro catálogo</h2>
          <div className="catalog-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-button ${activeCategory === cat ? 'filter-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {filteredCourses.length === 0 ? (
            <div className="no-courses">
              <p>No hay cursos en esta categoría.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} buttonLabel="Ver curso" />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Sign up for a course */}
        {availableCourses.length > 0 && (
          <div className="courses-section">
            <h2 className="section-title">Inscríbete a un curso</h2>
            <div className="courses-grid">
              {availableCourses.map((course) => (
                <CourseCard key={course.id} course={course} buttonLabel="Inscribirse" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
