import { useEffect, useState, useCallback, type MouseEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated, authApi } from '../../services/api';
import './Dashboard.css';

const localThumbnails: Record<string, string> = {
  'conecta-con-nuevos-donantes': '/thumbnails/Conacta-con-donantes-portada.webp',
  'crea-contenido-para-redes-sociales-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-may.webp',
  'aprende-a-liderar-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-oct.webp',
  'growth-marketing-para-ongs': '/thumbnails/Imagen-destacada.webp',
  'impact-accelerator': '/thumbnails/Copy-of-Imagen-destacada-1.webp',
  'propel-fellowship': '/thumbnails/Thumbnail-Propel-Fellowship-C8-1.webp',
  'team-handbook': '/thumbnails/Portadas-cursos-1.webp',
  'guia-de-procesos-internos': '/thumbnails/Portadas-cursos.webp',
  'introduccion-a-chatgpt-para-organizaciones-sociale': '/thumbnails/Introduccion-a-CHATGPT.webp',
  'define-tus-metas-con-okrs': '/thumbnails/okr.webp',
  'atrae-mas-vistas-con-seo': '/thumbnails/002.webp',
  'lean-data-para-impacto-social': '/thumbnails/Imagen-destacada-10-1.webp',
  'construye-indicadores-para-medir-impacto': '/thumbnails/Imagen-destacada-14.webp',
  'convierte-tus-ideas-en-un-pitch-ganador': '/thumbnails/001-1.webp',
  'potencia-tu-teoria-de-cambio': '/thumbnails/Imagen-destacada-11.webp',
  'aplica-a-tu-siguiente-grant-con-ia': '/thumbnails/003.webp',
  'identifica-a-tu-donante-ideal': '/thumbnails/Imagen-destacada-13-1.webp',
  'crea-tu-asistente-ia': '/thumbnails/Asistente-IA-portada.webp',
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

const CourseCard = ({ course, buttonLabel, enrolled, progress, onRemoveFavorite, showCertificate }: { course: Course; buttonLabel: string; enrolled?: boolean; progress?: number; onRemoveFavorite?: (slug: string) => void; showCertificate?: boolean }) => {
  const [downloadingCert, setDownloadingCert] = useState(false);
  const handleDownloadCert = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingCert(true);
    try {
      await coursesApi.downloadCertificate(course.slug);
    } finally {
      setDownloadingCert(false);
    }
  };
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
          <img src={src} alt={course.title} loading="lazy" decoding="async" width={400} height={260} />
        ) : (
          <div className="course-thumbnail-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(242,242,242,0.3)" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 13l3-3 2 2 4-4 4 4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
        {onRemoveFavorite && (
          <button
            className="remove-favorite-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveFavorite(course.slug);
            }}
            aria-label="Quitar de Mi Lista"
            title="Quitar de Mi Lista"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <svg className="remove-favorite-x" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      <div className="course-content">
        {course.category && (
          <span className="course-category">{course.category.name}</span>
        )}
        {enrolled && <span className="course-enrolled-badge">Inscrito</span>}
        <h3 className="course-title">{course.title}</h3>
        <p className="course-description">{course.short_description || course.subtitle}</p>
        <div className="course-meta">
          <span className="course-level">{getLevelLabel(course.level)}</span>
          <span className="course-duration">{course.duration_hours}h</span>
        </div>
        {progress != null && (
          <div className="course-progress">
            <div className="course-progress-bar">
              <div className="course-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="course-progress-text">{progress}% completado</span>
          </div>
        )}
        {showCertificate && (
          <button
            className="course-certificate-btn"
            onClick={handleDownloadCert}
            disabled={downloadingCert}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloadingCert ? 'Descargando...' : 'Descargar certificado'}
          </button>
        )}
        <span className={`course-button ${enrolled ? 'course-button-enrolled' : ''}`}>
          {enrolled ? 'Continuar' : buttonLabel}
        </span>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledSlugs, setEnrolledSlugs] = useState<Map<string, number>>(new Map());
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, coursesRes, enrollmentsRes, favoritesRes] = await Promise.all([
          authApi.getProfile(),
          coursesApi.list(),
          coursesApi.getMyEnrollments(),
          coursesApi.getMyFavorites(),
        ]);

        if (profileRes.ok) {
          setUser(profileRes.data);
        }

        if (coursesRes.ok) {
          setCourses(coursesRes.data);
        }

        if (enrollmentsRes.ok) {
          const slugMap = new Map<string, number>();
          enrollmentsRes.data.forEach((e: { course?: Course; slug?: string; progress?: number }) => {
            const slug = e.course?.slug || e.slug || '';
            if (slug) slugMap.set(slug, e.progress ?? 0);
          });
          setEnrolledSlugs(slugMap);
        }

        if (favoritesRes.ok) {
          const slugs = new Set<string>();
          favoritesRes.data.forEach((f: { course?: Course }) => {
            if (f.course?.slug) slugs.add(f.course.slug);
          });
          setFavoriteSlugs(slugs);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleRemoveFavorite = useCallback(async (slug: string) => {
    try {
      const response = await coursesApi.toggleFavorite(slug);
      if (response.ok) {
        setFavoriteSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  const completedCourses = courses.filter(c => enrolledSlugs.has(c.slug) && enrolledSlugs.get(c.slug) === 100);
  const completedSlugs = new Set(completedCourses.map(c => c.slug));
  const enrolledCourses = courses.filter(c => enrolledSlugs.has(c.slug) && !completedSlugs.has(c.slug));
  const favoriteCourses = courses.filter(c => favoriteSlugs.has(c.slug) && !completedSlugs.has(c.slug));
  const availableCourses = courses.filter(c => !enrolledSlugs.has(c.slug));


  const categories = ['Todos', ...Array.from(new Set(courses.map(c => c.category?.name).filter(Boolean)))];

  const filteredCourses = courses.filter(c => {
    const matchesCategory = activeCategory === 'Todos' || c.category?.name === activeCategory;
    const matchesSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.short_description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div className="dashboard-welcome">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-subtitle" />
            </div>
          </div>
          <div className="courses-section">
            <div className="skeleton skeleton-section-title" />
            <div className="courses-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton skeleton-thumb" />
                  <div className="skeleton-card-body">
                    <div className="skeleton skeleton-line-sm" />
                    <div className="skeleton skeleton-line-lg" />
                    <div className="skeleton skeleton-line-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                <CourseCard key={course.id} course={course} buttonLabel="Continuar" progress={enrolledSlugs.get(course.slug)} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Mi Lista (favorites) */}
        {favoriteCourses.length > 0 && (
          <div className="courses-section">
            <h2 className="section-title section-title-with-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FD6A44" stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Mi Lista
            </h2>
            <div className="courses-scroll">
              {favoriteCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  buttonLabel="Ver curso"
                  enrolled={enrolledSlugs.has(course.slug)}
                  progress={enrolledSlugs.has(course.slug) ? enrolledSlugs.get(course.slug) : undefined}
                  onRemoveFavorite={handleRemoveFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section: Completed courses */}
        {completedCourses.length > 0 && (
          <div className="courses-section">
            <h2 className="section-title section-title-with-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Cursos completados
            </h2>
            <div className="courses-scroll">
              {completedCourses.map((course) => (
                <CourseCard key={course.id} course={course} buttonLabel="Revisar" progress={100} showCertificate />
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Catalog with filters */}
        <div className="courses-section">
          <h2 className="section-title">Explora nuestro catálogo</h2>
          <div className="catalog-search">
            <svg className="catalog-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="catalog-search-input"
              placeholder="Buscar cursos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="catalog-search-clear" onClick={() => setSearchQuery('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
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
              <p>{searchQuery ? 'No se encontraron cursos.' : 'No hay cursos en esta categoría.'}</p>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  buttonLabel="Ver curso"
                  enrolled={enrolledSlugs.has(course.slug)}
                />
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
