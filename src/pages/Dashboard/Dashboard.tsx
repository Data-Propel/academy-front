import { useEffect, useState, useCallback, useRef, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { coursesApi, isAuthenticated, authApi } from '../../services/api';
import { matchesSearch } from '../../utils/searchAliases';
import CoursePreviewModal from './CoursePreviewModal';
import './Dashboard.css';
import portadaHero from '../../assets/PortadaAcademy-1920.webp';

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
  'atrae-mas-vistas-con-seo': '/thumbnails/alcanzamasvistasconseo.png',
  'lean-data-para-impacto-social': '/thumbnails/Imagen-destacada-10-1.webp',
  'construye-indicadores-para-medir-impacto': '/thumbnails/Imagen-destacada-14.webp',
  'convierte-tus-ideas-en-un-pitch-ganador': '/thumbnails/conviertetusideasenunpitchganador.png',
  'potencia-tu-teoria-de-cambio': '/thumbnails/Imagen-destacada-11.webp',
  'aplica-a-tu-siguiente-grant-con-ia': '/thumbnails/aplicaatusiguientegrantconia.png',
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
  description: string;
  short_description: string;
  subtitle: string;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number;
  duration_display: string;
  instructor: string;
  lessons_count: number;
  is_featured?: boolean;
  category: {
    id: number;
    name: string;
  };
  tags?: { id: number; name: string; slug: string; aliases?: string }[];
}


type CourseStatus = 'none' | 'in-progress' | 'completed';

const CourseCard = ({ course, status, progress, isFavorite, onToggleFavorite, onPreview }: {
  course: Course;
  status: CourseStatus;
  progress?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (e: MouseEvent) => void;
  onPreview?: (slug: string) => void;
}) => {
  // Admin-uploaded thumbnail (backend) wins; hardcoded local map is only a fallback.
  const src = course.thumbnail_url || localThumbnails[course.slug];
  const lastLesson = status === 'in-progress'
    ? localStorage.getItem(`lastLesson:${course.slug}`)
    : null;
  const courseUrl = lastLesson
    ? `/courses/${course.slug}/lessons/${lastLesson}`
    : `/courses/${course.slug}`;

  const statusLabel = status === 'completed' ? 'Completado' : status === 'in-progress' ? 'En progreso' : null;
  const statusClass = status === 'completed' ? 'status-completed' : status === 'in-progress' ? 'status-in-progress' : '';

  const buttonLabel = status === 'completed' ? 'Revisar' : status === 'in-progress' ? 'Continuar' : 'Ver curso';

  const handleCardClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onPreview) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    onPreview(course.slug);
  };

  return (
    <Link
      to={courseUrl}
      className="course-card"
      onClick={handleCardClick}
      onMouseEnter={() => coursesApi.prefetchBySlug(course.slug)}
      onFocus={() => coursesApi.prefetchBySlug(course.slug)}
    >
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
        {statusLabel && (
          <span className={`course-status-tag ${statusClass}`}>{statusLabel}</span>
        )}
        {onToggleFavorite && (
          <button
            className={`card-fav-btn${isFavorite ? ' card-fav-btn--active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        )}
      </div>
      <div className="course-content">
        {(course.category || (course.tags && course.tags.length > 0)) && (
          <div className="course-tags-row">
            {course.category && (
              <span className="course-category">{course.category.name}</span>
            )}
            {(course.tags || []).map(t => (
              <span key={t.id} className="course-tag-chip">{t.name}</span>
            ))}
          </div>
        )}
        {course.instructor && (
          <p className="course-card-instructor">{course.instructor}</p>
        )}
        {course.short_description && (
          <p className="course-description">{course.short_description}</p>
        )}
        <div className="course-meta">
          {(course.duration_display || course.duration_hours > 0) && (
            <span className="course-duration">{course.duration_display || `${course.duration_hours}h`}</span>
          )}
        </div>
        {status === 'in-progress' && progress != null && (
          <div className="course-progress">
            <div className="course-progress-bar">
              <div className="course-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="course-progress-text">{progress}% completado</span>
          </div>
        )}
        <span className={`course-button ${status === 'in-progress' ? 'course-button-enrolled' : ''}`}>
          {buttonLabel}
        </span>
      </div>
    </Link>
  );
};

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  linkedin: string;
  image: string;
}

const faqItems = [
  {
    q: '¿Hay límite de tiempo para completar los cursos?',
    a: 'No. Los cursos son on demand, diseñados para que puedas avanzar a tu ritmo, según tus tiempos y prioridades.',
  },
  {
    q: '¿Necesito experiencia previa para tomar los cursos?',
    a: 'No. Los cursos están creados para ser fáciles de entender y aplicar, incluso si es la primera vez que trabajas con herramientas digitales.',
  },
  {
    q: '¿Recibiré certificado al completar?',
    a: 'Sí. Al finalizar cada curso, recibirás un certificado de participación de Propel.',
  },
  {
    q: '¿Qué hago si tengo dudas durante un curso?',
    a: 'Cada curso incluye un kit de aprendizaje con pasos claros para acompañarte en completar el curso.',
  },
  {
    q: '¿Cuándo puedo ver nuevos cursos?',
    a: 'Actualizamos el catálogo cada trimestre, según los temas más demandados por las organizaciones sociales.',
  },
  {
    q: '¿Tengo más preguntas, cómo puedo contactarme?',
    a: 'Escríbenos a nonprofitacademy@wepropel.org y estaremos felices de conversar.',
  },
];

const FaqSection = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq-section">
      <div className="faq-inner">
        <h2 className="faq-title">Preguntas frecuentes.</h2>
        <div className="faq-list">
          {faqItems.map((item, i) => (
            <div key={i} className={`faq-item${open === i ? ' faq-item--open' : ''}`}>
              <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
                <span>{item.q}</span>
                <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TestimonialsCarousel = ({ testimonials }: { testimonials: Testimonial[] }) => {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef(false);

  const goTo = useCallback((index: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(index);
      setAnimating(false);
    }, 500);
  }, [animating]);

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!hovered.current) {
        goTo((active + 1) % testimonials.length);
      }
    }, 5000);
  }, [active, goTo, testimonials.length]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startTimer]);

  const t = testimonials[active];

  return (
    <div className="testimonials-section">
      <div className="testimonials-inner">
        <h2 className="testimonials-title">Lo que dice nuestra comunidad</h2>
        <div
          className="testimonials-carousel"
          onMouseEnter={() => { hovered.current = true; }}
          onMouseLeave={() => { hovered.current = false; }}
        >
          <div className={`testimonial-card${animating ? ' testimonial-card--exit' : ' testimonial-card--enter'}`}>
            <div className="testimonial-card-img" style={{ backgroundImage: `url(${t.image})` }} />
            <div className="testimonial-card-body">
              <div className="testimonial-card-top">
                <svg className="testimonial-quote-mark" width="36" height="28" viewBox="0 0 36 28" fill="none">
                  <path d="M0 28V17.2C0 13.8667 0.6 10.8 1.8 8C3.06667 5.2 4.93333 2.86667 7.4 1L10.6 4.6C8.86667 5.93333 7.53333 7.53333 6.6 9.4C5.66667 11.2667 5.2 13.2 5.2 15.2H10.8V28H0ZM19.2 28V17.2C19.2 13.8667 19.8 10.8 21 8C22.2667 5.2 24.1333 2.86667 26.6 1L29.8 4.6C28.0667 5.93333 26.7333 7.53333 25.8 9.4C24.8667 11.2667 24.4 13.2 24.4 15.2H30V28H19.2Z" fill="#FD6A44"/>
                </svg>
                <p className="testimonial-quote">{t.quote}</p>
              </div>
              <div className="testimonial-card-bottom">
                <div className="testimonial-person">
                  <span className="testimonial-name">{t.name}</span>
                  <span className="testimonial-role">{t.role}</span>
                </div>
                <a href={t.linkedin} target="_blank" rel="noopener noreferrer" className="testimonial-linkedin" aria-label={`LinkedIn de ${t.name}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="testimonials-dots">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={`testimonials-dot${i === active ? ' testimonials-dot--active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Testimonio ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  console.log('[Dashboard]');
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledSlugs, setEnrolledSlugs] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeStatus, setActiveStatus] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const location = useLocation();
  const isCatalogRoute = location.pathname === '/cursos';
  const [showAllCatalog, setShowAllCatalog] = useState(isCatalogRoute);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    if (isCatalogRoute) setShowAllCatalog(true);
  }, [isCatalogRoute]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const loggedIn = isAuthenticated();

        const coursesRes = await coursesApi.list();
        if (coursesRes.ok) {
          setCourses(coursesRes.data);
        }

        if (loggedIn) {
          const [profileRes, enrollmentsRes] = await Promise.all([
            authApi.getProfile(),
            coursesApi.getMyEnrollments(),
          ]);

          if (profileRes.ok) {
            setUser(profileRes.data);
          }

          if (enrollmentsRes.ok) {
            const slugMap = new Map<string, number>();
            enrollmentsRes.data.forEach((e: { course?: Course; slug?: string; progress?: number }) => {
              const slug = e.course?.slug || e.slug || '';
              if (slug) slugMap.set(slug, e.progress ?? 0);
            });
            setEnrolledSlugs(slugMap);
          }

          const favoritesRes = await coursesApi.getMyFavorites();
          if (favoritesRes.ok) {
            const slugs = new Set<string>(
              favoritesRes.data.map((f: { course?: { slug?: string }; slug?: string }) => f.course?.slug || f.slug || '').filter(Boolean)
            );
            setFavoriteSlugs(slugs);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  const handleToggleFavorite = useCallback(async (slug: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoriteSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    await coursesApi.toggleFavorite(slug);
  }, []);

  const completedSlugs = new Set(
    courses.filter(c => enrolledSlugs.has(c.slug) && enrolledSlugs.get(c.slug) === 100).map(c => c.slug)
  );

  const getStatus = (slug: string): CourseStatus => {
    if (completedSlugs.has(slug)) return 'completed';
    if (enrolledSlugs.has(slug)) return 'in-progress';
    return 'none';
  };

  const loggedIn = isAuthenticated();

  const matchesStatusFilter = (c: Course, status: string) => {
    if (status === 'En progreso') return getStatus(c.slug) === 'in-progress';
    if (status === 'Completados') return getStatus(c.slug) === 'completed';
    if (status === 'No iniciado') return getStatus(c.slug) === 'none';
    if (status === 'Favoritos') return favoriteSlugs.has(c.slug);
    return true;
  };

  // Base: search only
  const coursesBySearch = courses.filter(c =>
    matchesSearch(
      searchQuery,
      [
        c.title,
        c.short_description,
        c.category?.name,
        ...(c.tags || []).flatMap(t => [t.name, t.aliases || '']),
      ],
      c.tags || [],
    )
  );

  // Status options: computed from search + active category (not status-filtered)
  const coursesBySearchAndCategory = coursesBySearch.filter(c =>
    activeCategory === 'Todos' || c.category?.name === activeCategory
  );
  const statusOptions = loggedIn
    ? [
        { value: 'Todos', label: 'Todos' },
        ...(coursesBySearchAndCategory.some(c => getStatus(c.slug) === 'in-progress') ? [{ value: 'En progreso', label: 'En progreso' }] : []),
        ...(coursesBySearchAndCategory.some(c => getStatus(c.slug) === 'completed') ? [{ value: 'Completados', label: 'Completados' }] : []),
        ...(coursesBySearchAndCategory.some(c => getStatus(c.slug) === 'none') ? [{ value: 'No iniciado', label: 'No iniciado' }] : []),
        ...(coursesBySearchAndCategory.some(c => favoriteSlugs.has(c.slug)) ? [{ value: 'Favoritos', label: 'Favoritos' }] : []),
      ]
    : [];

  const effectiveStatus = statusOptions.some(o => o.value === activeStatus) ? activeStatus : 'Todos';

  // Category options: computed from search + effective status (dynamic!)
  const coursesBySearchAndStatus = coursesBySearch.filter(c => matchesStatusFilter(c, effectiveStatus));
  const categories = ['Todos', ...Array.from(new Set(
    coursesBySearchAndStatus.map(c => c.category?.name).filter(Boolean)
  ))];
  const effectiveCategory = categories.includes(activeCategory) ? activeCategory : 'Todos';

  // Final result: all filters applied
  const filteredCourses = coursesBySearchAndStatus.filter(c =>
    effectiveCategory === 'Todos' || c.category?.name === effectiveCategory
  );

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
      <Helmet>
        <title>Propel Academy — Cursos en línea para organizaciones sin fines de lucro</title>
        <meta name="description" content="Plataforma de cursos en línea para organizaciones sin fines de lucro: liderazgo, marketing, IA, fundraising, OKRs y más." />
        <link rel="canonical" href="https://propelacademy.org/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Propel Academy" />
        <meta property="og:description" content="Cursos en línea para organizaciones sin fines de lucro." />
        <meta property="og:url" content="https://propelacademy.org/" />
        <meta property="og:image" content="https://propelacademy.org/thumbnails/Conacta-con-donantes-portada.webp" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      {/* Hero Banner */}
      {!isCatalogRoute && (
      <div className={`dashboard-hero${loggedIn ? ' dashboard-hero--logged-in' : ''}`}>
        <img
          src={portadaHero}
          alt=""
          className="dashboard-hero-img"
          fetchPriority="high"
          decoding="async"
          width={1920}
          height={1278}
        />
        <div className="dashboard-hero-fade" />
        <div className="dashboard-hero-content">
          {loggedIn ? (
            <>
              <h1 className="dashboard-title">{user ? `¡Hola, ${user.first_name}!` : '¡Bienvenido!'}</h1>
            </>
          ) : (
            <>
              <h1 className="dashboard-title">Aprende a usar la IA<br />con propósito</h1>
              <p className="dashboard-subtitle">Cursos prácticos y gratuitos para organizaciones sociales.</p>
              <Link to="/login" className="dashboard-hero-cta">Empieza a aprender aquí</Link>
            </>
          )}
        </div>
      </div>
      )}

      <div className="dashboard-container">
        {/* Popular courses — shown to visitors */}
        {!isCatalogRoute && !loggedIn && courses.length > 0 && (
          <div className="courses-section courses-section--featured">
            <h2 className="section-title">Empieza hoy con estos 3 cursos <span className="text-orange">más populares</span></h2>
            <p className="section-subtitle">entre organizaciones sociales de LatAm.</p>
            <div className="courses-grid">
              {(courses.filter(c => c.is_featured).length > 0
                ? courses.filter(c => c.is_featured).slice(0, 3)
                : courses.slice(0, 3)
              ).map((course) => (
                <CourseCard key={course.id} course={course} status="none" />
              ))}
            </div>
            <div className="catalog-view-more">
              <Link to="/cursos" className="catalog-view-more-btn">
                Ver más cursos
              </Link>
            </div>
          </div>
        )}

        {(loggedIn || showAllCatalog) && (
          <div className="courses-section">
            <h2 className="section-title">Explora nuestros cursos</h2>
            {loggedIn && (
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
            )}
            <div className="catalog-filters">
              {loggedIn && statusOptions.length > 1 && (
                <div className="catalog-filters-row catalog-filters-row--status">
                  <span className="catalog-filters-label">Estado</span>
                  <div className="catalog-status-dropdown-wrap">
                    <select
                      className={`catalog-status-dropdown${effectiveStatus !== 'Todos' ? ' catalog-status-dropdown--active' : ''}`}
                      value={effectiveStatus}
                      onChange={e => setActiveStatus(e.target.value)}
                    >
                      {statusOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <svg className="catalog-status-dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </div>
              )}
              <div className="catalog-filters-row catalog-filters-row--categories">
                <span className="catalog-filters-label">Categoría</span>
                {categories.map((cat) => (
                  <button
                    key={`cat-${cat}`}
                    className={`filter-button ${effectiveCategory === cat ? 'filter-active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === 'Todos' ? 'Todas' : cat}
                  </button>
                ))}
              </div>
            </div>
            {filteredCourses.length === 0 ? (
              <div className="no-courses">
                <p>{searchQuery ? 'No se encontraron cursos.' : 'No hay cursos con estos filtros.'}</p>
              </div>
            ) : (
              <div className="courses-grid">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    status={getStatus(course.slug)}
                    progress={enrolledSlugs.get(course.slug)}
                    isFavorite={loggedIn ? favoriteSlugs.has(course.slug) : undefined}
                    onToggleFavorite={loggedIn ? (e) => handleToggleFavorite(course.slug, e) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features section — guests only */}
      {!loggedIn && !isCatalogRoute && (
        <div className="features-section">
          <div className="features-decoration" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="164" height="164" viewBox="0 0 164 164" fill="none">
              <clipPath id="feat-clip"><rect width="164" height="164"/></clipPath>
              <g clipPath="url(#feat-clip)">
                <path d="M164 164H29.0687L124.074 36.3996L0 164V0H164V164Z" fill="#FD6A44"/>
              </g>
            </svg>
          </div>
          <div className="features-inner">
            <h2 className="features-title">
              La academia gratuita donde líderes sociales<br />
              <span className="text-orange">aprenden a escalar su impacto con tecnología.</span>
            </h2>
            <div className="features-grid">
              <div className="feature-card">
                <img className="feature-card-img" src="/landing/feature-1.webp" alt="" loading="lazy" width="768" height="711" />
                <div className="feature-card-body">
                  <h3 className="feature-card-title">Aprende de expertos</h3>
                  <p className="feature-card-text">Cursos creados por profesionales que conocen de impacto social.</p>
                </div>
              </div>
              <div className="feature-card">
                <img className="feature-card-img" src="/landing/feature-2.jpg" alt="" loading="lazy" width="768" height="511" />
                <div className="feature-card-body">
                  <h3 className="feature-card-title">Digitaliza tu organización</h3>
                  <p className="feature-card-text">Cada curso te prepara para usar IA y herramientas digitales.</p>
                </div>
              </div>
              <div className="feature-card">
                <img className="feature-card-img" src="/landing/feature-3.jpg" alt="" loading="lazy" width="768" height="511" />
                <div className="feature-card-body">
                  <h3 className="feature-card-title">Capacítate gratis</h3>
                  <p className="feature-card-text">Acceso a todos los cursos y materiales prácticos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials carousel — guests only */}
      {!loggedIn && !isCatalogRoute && (() => {
        const testimonials = [
          {
            name: 'Alba Carrasco',
            role: 'Directora Ejecutiva de Fundación Ixcanul',
            quote: '"La forma en que distribuyen la información y combinan teoría con práctica marca la diferencia".',
            linkedin: 'https://www.linkedin.com/in/alba-carrasco/',
            image: '/landing/testimonio-1.jpg',
          },
          {
            name: 'Araceli Roldán',
            role: 'Responsable de Comunicación de Donar Online',
            quote: '"Los cursos me ayudaron a entender mejor el proceso de medición de impacto y a desarrollar un proyecto de manera clara".',
            linkedin: 'https://www.linkedin.com/in/araceli-roldan-alcala/',
            image: '/landing/testimonio-2.webp',
          },
          {
            name: 'Marcelo Pesce',
            role: 'Legal Designer de Global Cuyo',
            quote: '"Los cursos me han ayudado a planificar mejor los objetivos con mi equipo e incursionar con automatizaciones".',
            linkedin: 'https://www.linkedin.com/in/marcelopescemendez/',
            image: '/landing/testimonio-3.webp',
          },
        ];
        return <TestimonialsCarousel testimonials={testimonials} />;
      })()}

      {/* FAQ — guests only */}
      {!loggedIn && !isCatalogRoute && <FaqSection />}

      {previewSlug && (
        <CoursePreviewModal slug={previewSlug} onClose={() => setPreviewSlug(null)} />
      )}
    </div>
  );
};

export default Dashboard;
