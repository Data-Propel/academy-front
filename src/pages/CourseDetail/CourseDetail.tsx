import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated } from '../../services/api';
import './CourseDetail.css';

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

interface Lesson {
  id: number;
  title: string;
  order_index: number;
  video_url?: string;
  content?: string;
  topics?: Topic[];
}

interface Topic {
  id: number;
  title: string;
  order_index: number;
}

interface Material {
  id: number;
  title: string;
  type: string;
  url: string;
}

interface Instructor {
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number;
  duration_minutes?: number;
  category: {
    id: number;
    name: string;
  };
  lessons?: Lesson[];
  materials?: Material[];
  instructor?: Instructor;
  what_you_learn?: string[];
  what_you_get?: string[];
  has_certificate?: boolean;
  is_enrolled?: boolean;
  is_favorite?: boolean;
}

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchCourse = async () => {
      if (!slug) return;

      try {
        const [courseRes, enrollmentsRes] = await Promise.all([
          coursesApi.getBySlug(slug),
          coursesApi.getMyEnrollments(),
        ]);

        if (courseRes.ok) {
          const courseData = courseRes.data;

          // Check enrollment status
          if (enrollmentsRes.ok) {
            const enrolledSlugs = enrollmentsRes.data.map(
              (e: { course?: { slug?: string }; slug?: string }) => e.course?.slug || e.slug || ''
            );
            courseData.is_enrolled = enrolledSlugs.includes(slug);
          }

          setCourse(courseData);
          // Hash-aware initial expansion
          const hash = window.location.hash;
          const hashMatch = hash.match(/^#lesson-(\d+)$/);
          const hashLessonId = hashMatch ? Number(hashMatch[1]) : null;
          const validHashLesson = hashLessonId && courseData.lessons?.some((l: Lesson) => l.id === hashLessonId);

          if (validHashLesson) {
            setExpandedModules(new Set([hashLessonId]));
          } else if (courseData.lessons?.length > 0) {
            setExpandedModules(new Set([courseData.lessons[0].id]));
          }
        } else {
          setError('No se pudo cargar el curso');
        }
      } catch (err) {
        setError('Error al cargar el curso');
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug, navigate]);

  // Scroll to hash target after course loads
  useEffect(() => {
    if (!course) return;
    const hash = window.location.hash;
    const hashMatch = hash.match(/^#lesson-(\d+)$/);
    if (!hashMatch) return;

    const lessonId = Number(hashMatch[1]);
    const validLesson = course.lessons?.some((l) => l.id === lessonId);
    if (!validLesson) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`lesson-${lessonId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [course]);

  const handleEnroll = async () => {
    if (!course) return;

    setEnrolling(true);
    try {
      const response = await coursesApi.enroll(course.slug);
      if (response.ok) {
        setCourse({ ...course, is_enrolled: true });
      } else {
        setError('No se pudo inscribir en el curso');
      }
    } catch (err) {
      setError('Error al inscribirse');
      console.error('Error enrolling:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!course) return;

    setTogglingFavorite(true);
    try {
      const response = await coursesApi.toggleFavorite(course.slug);
      if (response.ok) {
        setCourse({ ...course, is_favorite: !course.is_favorite });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setTogglingFavorite(false);
    }
  };

  const toggleModule = (lessonId: number) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
        // Clear hash when collapsing
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        newSet.add(lessonId);
        // Update hash when expanding
        history.replaceState(null, '', `#lesson-${lessonId}`);
        if (slug) {
          localStorage.setItem(`lastLesson:${slug}`, String(lessonId));
        }
      }
      return newSet;
    });
  };

  const handleTocClick = (lessonId: number) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      newSet.add(lessonId);
      return newSet;
    });
    history.replaceState(null, '', `#lesson-${lessonId}`);
    if (slug) {
      localStorage.setItem(`lastLesson:${slug}`, String(lessonId));
    }
    setTimeout(() => {
      const el = document.getElementById(`lesson-${lessonId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const getEmbedUrl = (url: string): string | null => {
    // Vimeo: https://vimeo.com/123456 or https://vimeo.com/123456/hash or https://player.vimeo.com/video/123456
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?/);
    if (vimeo) {
      const hash = vimeo[2] ? `&h=${vimeo[2]}` : '';
      return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0${hash}`;
    }

    // YouTube: https://youtube.com/watch?v=ID or https://youtu.be/ID
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

    return null;
  };

  const formatDuration = (hours?: number, minutes?: number) => {
    if (minutes) return `${minutes} min`;
    if (hours) {
      if (hours < 1) return `${Math.round(hours * 60)} min`;
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="course-detail-page">
        <div className="course-detail-loading">
          <div className="loading-spinner"></div>
          <p>Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="course-detail-page">
        <div className="course-detail-error">
          <p>{error || 'Curso no encontrado'}</p>
          <Link to="/" className="back-link">Volver a cursos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="course-detail-page">
      <div className="course-detail-container">
        {/* Back Navigation */}
        <div className="course-detail-nav">
          <Link to="/" className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Cursos
          </Link>
        </div>

        <div className="course-detail-layout">
          {/* Main Content */}
          <div className="course-main-content">
            {/* Course Header */}
            <div className="course-header-section">
              <h1 className="course-title">{course.title}</h1>

              {course.instructor && (
                <p className="course-instructor-name">{course.instructor.name}</p>
              )}

              <div className="course-header-meta">
                {course.category && (
                  <span className="course-category-badge">{course.category.name}</span>
                )}
                <button
                  className={`favorite-button ${course.is_favorite ? 'active' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={togglingFavorite}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={course.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {course.is_favorite ? 'Guardado' : 'Agregar'}
                </button>
              </div>
            </div>

            {/* Course Description */}
            <div className="course-section">
              <div
                className="course-description-text"
                dangerouslySetInnerHTML={{ __html: course.description || course.short_description }}
              />
            </div>

            {/* What You'll Learn */}
            {course.what_you_learn && course.what_you_learn.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">¿Qué aprenderás?</h2>
                <ul className="learning-list">
                  {course.what_you_learn.map((item, index) => (
                    <li key={index}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FD6A44" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What You'll Get */}
            {course.what_you_get && course.what_you_get.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">¿Qué te llevarás?</h2>
                <div className="takeaway-list">
                  {course.what_you_get.map((item, index) => (
                    <div key={index} className="takeaway-item">
                      <div className="takeaway-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Materials */}
            {course.materials && course.materials.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">Materiales del curso</h2>
                <div className="materials-list">
                  {course.materials.map((material) => (
                    <a
                      key={material.id}
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="material-item"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {material.type === 'presentation' ? (
                          <><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>
                        ) : material.type === 'drive' ? (
                          <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>
                        ) : (
                          <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>
                        )}
                      </svg>
                      <span>{material.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Course Content / Modules */}
            {course.lessons && course.lessons.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">Contenido del Curso</h2>
                <div className="modules-list">
                  {course.lessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson) => (
                      <div key={lesson.id} id={`lesson-${lesson.id}`} className="module-item">
                        <button
                          className={`module-header ${expandedModules.has(lesson.id) ? 'expanded' : ''}`}
                          onClick={() => toggleModule(lesson.id)}
                        >
                          <span className="module-title">{lesson.title}</span>
                          <svg
                            className="module-chevron"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>

                        {expandedModules.has(lesson.id) && (
                          <div className="module-expanded-content">
                            {lesson.video_url && (() => {
                              const embedUrl = getEmbedUrl(lesson.video_url);
                              if (embedUrl) {
                                return (
                                  <div className="module-video-embed">
                                    <iframe
                                      src={embedUrl}
                                      allow="autoplay; fullscreen; picture-in-picture"
                                      allowFullScreen
                                      title={lesson.title}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div className="module-video-player">
                                  <video
                                    controls
                                    controlsList="nodownload"
                                    preload="metadata"
                                    title={lesson.title}
                                  >
                                    <source src={lesson.video_url} />
                                  </video>
                                </div>
                              );
                            })()}

                            {lesson.content && (
                              <div
                                className="module-content-html"
                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                              />
                            )}

                            {lesson.topics && lesson.topics.length > 0 && (
                              <div className="topics-list">
                                {lesson.topics
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((topic) => (
                                    <div key={topic.id} className="topic-item">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polygon points="10 8 16 12 10 16 10 8"/>
                                      </svg>
                                      <span>{topic.title}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Instructor Section */}
            {course.instructor && (
              <div className="course-section instructor-section">
                <h2 className="section-title">Conoce a tu instructor:</h2>
                <div className="instructor-card">
                  {course.instructor.avatar && (
                    <img
                      src={course.instructor.avatar}
                      alt={course.instructor.name}
                      className="instructor-avatar"
                    />
                  )}
                  <div className="instructor-info">
                    <h3 className="instructor-name">{course.instructor.name}</h3>
                    {course.instructor.title && (
                      <p className="instructor-title">{course.instructor.title}</p>
                    )}
                    {course.instructor.bio && (
                      <p className="instructor-bio">{course.instructor.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="course-sidebar">
            <div className="sidebar-card">
              {(() => {
                const thumbSrc = localThumbnails[course.slug] || course.thumbnail_url;
                return thumbSrc ? (
                  <div className="sidebar-thumbnail">
                    <img src={thumbSrc} alt={course.title} />
                  </div>
                ) : null;
              })()}
              <div className="sidebar-card-body">
                <h3 className="sidebar-title">Contenido</h3>

                <div className="sidebar-info">
                  {course.instructor && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">Instructor:</span>
                      <span className="sidebar-value">{course.instructor.name}</span>
                    </div>
                  )}

                  <div className="sidebar-row">
                    <span className="sidebar-label">Duración:</span>
                    <span className="sidebar-value">{formatDuration(course.duration_hours, course.duration_minutes)}</span>
                  </div>

                  {course.lessons && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">Módulos:</span>
                      <span className="sidebar-value">{course.lessons.length}</span>
                    </div>
                  )}

                  <div className="sidebar-row">
                    <span className="sidebar-label">Certificación:</span>
                    <span className="sidebar-value">{course.has_certificate !== false ? 'Sí' : 'No'}</span>
                  </div>
                </div>

                {course.lessons && course.lessons.length > 0 && (
                  <div className="sidebar-toc">
                    <h4 className="sidebar-toc-title">Navegación rápida</h4>
                    <nav className="sidebar-toc-nav">
                      {course.lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson, index) => (
                          <button
                            key={lesson.id}
                            className={`sidebar-toc-item ${expandedModules.has(lesson.id) ? 'active' : ''}`}
                            onClick={() => handleTocClick(lesson.id)}
                          >
                            <span className="sidebar-toc-number">{index + 1}</span>
                            <span className="sidebar-toc-label">{lesson.title}</span>
                          </button>
                        ))}
                    </nav>
                  </div>
                )}

                <button
                className={`sidebar-cta ${course.is_enrolled ? 'enrolled' : ''}`}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? (
                  <>
                    <span className="button-spinner"></span>
                    Inscribiendo...
                  </>
                ) : course.is_enrolled ? (
                  'Continuar'
                ) : (
                  'Inscribirme'
                )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
