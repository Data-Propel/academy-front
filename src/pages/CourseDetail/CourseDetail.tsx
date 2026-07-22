import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { coursesApi, isAuthenticated } from '../../services/api';
import { getCurrentAttribution } from '../../utils/attribution';
import takeIcon1 from '../../assets/course/take-1.png';
import takeIcon2 from '../../assets/course/take-2.png';
import takeIcon3 from '../../assets/course/take-3.png';
import './CourseDetail.css';
import AddToCalendarModal from '../../components/AddToCalendarModal/AddToCalendarModal';
import { localThumbnails } from '../../utils/courseThumbnails';

const TAKEAWAY_ICONS = [takeIcon1, takeIcon2, takeIcon3];

/** Rewrite WordPress upload URLs to local /pdfs/ path */
function localizeUrl(url: string): string {
  return url.replace(
    /^https?:\/\/(?:www\.)?academy\.wepropel\.org\/wp-content\/uploads\//,
    '/pdfs/'
  );
}

/** Strip WordPress "Descripción del curso / programa" headings from description HTML */
function stripDescriptionHeading(html: string): string {
  return html.replace(/<h[1-6][^>]*>\s*Descripci[oó]n\s+del\s+(curso|programa)[^<]*<\/h[1-6]>\s*/gi, '');
}

/** Replace [pdfjs-viewer url="..."] shortcodes with embedded PDF.js viewer */
function processContent(html: string): string {
  return html.replace(
    /\[pdfjs-viewer\s+[^\]]*?url=["']?([^"'\]\s]+)["']?[^\]]*?\]/gi,
    (_match, url: string) => {
      const pdfUrl = localizeUrl(url);
      const filename = pdfUrl.split('/').pop() || 'document.pdf';
      const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
      return `<div class="cd-pdf-embed">
        <div class="cd-pdf-toolbar">
          <a href="${pdfUrl}" download="${filename}" target="_blank" rel="noopener noreferrer" class="cd-pdf-toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar
          </a>
          <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="cd-pdf-toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Abrir
          </a>
        </div>
        <iframe src="${viewerUrl}" width="100%" height="700" style="border:none;" loading="lazy" allowfullscreen></iframe>
      </div>`;
    }
  );
}

const localAvatars: Record<string, string> = {
  'Carolina Diez Canseco': '/instructors/Carolina.webp',
  'Shoshana Grossman-Crist': '/instructors/Shoshana-1.webp',
  'Maria Liliana Mor': '/instructors/Imagen-speakers-2025.webp',
  'Carla Grados': '/instructors/Imagen-speakers-2025-1.webp',
  'Cinthia Varela': '/instructors/Cinthia-foto.webp',
  'José Pajuelo': '/instructors/Imagen-speakers-2025-2.webp',
  'Vincent Wongvalle': '/instructors/Imagen-speakers-2025-3.webp',
  'Stephanie Hoyle': '/instructors/Stephanie-Hoyle.webp',
  'Herman Marin': '/instructors/Herman-Marin.webp',
  'Laura Loáiciga': '/instructors/Laura-Loaiciga.webp',
};

interface CourseMaterial {
  url: string;
  title: string;
}

/** Parse course-level materials HTML into a list of links */
function decodeHtmlEntities(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

function parseMaterialsHtml(html: string): CourseMaterial[] {
  const materials: CourseMaterial[] = [];
  const linkPattern = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = decodeHtmlEntities(match[1]);
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url && title) {
      materials.push({ url, title });
    }
  }
  return materials;
}

interface LessonResource {
  id: number;
  title: string;
  url: string;
  file_size: number;
}

interface Lesson {
  id: number;
  title: string;
  order_index: number;
  video_url?: string;
  content?: string;
  excerpt?: string;
  topics?: Topic[];
  resources?: LessonResource[];
}

interface Topic {
  id: number;
  title: string;
  order_index: number;
  video_url?: string;
  content?: string;
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
  duration_display?: string;
  category: {
    id: number;
    name: string;
  };
  lessons?: Lesson[];
  resources?: Array<{
    id: number;
    title: string;
    resource_type: string;
    url: string;
    file_size: number;
  }>;
  materials?: Material[];
  materials_html?: string;
  seo_title?: string;
  seo_description?: string;
  seo_image_url?: string;
  instructor?: Instructor;
  what_you_learn?: string[];
  what_you_get?: string[];
  has_certificate?: boolean;
  is_enrolled?: boolean;
  is_favorite?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [previewResourceId, setPreviewResourceId] = useState<number | null>(null);
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set());
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;
      const loggedIn = isAuthenticated();

      try {
        const courseRes = await coursesApi.getBySlug(slug);

        if (courseRes.ok) {
          const courseData = courseRes.data;

          if (loggedIn) {
            const [enrollmentsRes, progressRes] = await Promise.all([
              coursesApi.getMyEnrollments(),
              coursesApi.getCourseProgress(slug),
            ]);

            // Check enrollment status
            if (enrollmentsRes.ok) {
              const enrolledSlugs = enrollmentsRes.data.map(
                (e: { course?: { slug?: string }; slug?: string }) => e.course?.slug || e.slug || ''
              );
              courseData.is_enrolled = enrolledSlugs.includes(slug);
            }

            // Set progress data
            if (progressRes.ok) {
              const doneLessons = new Set<number>(progressRes.data.completed_lessons);
              const doneTopics = new Set<number>(progressRes.data.completed_topics);
              setCompletedLessons(doneLessons);
              setCompletedTopics(doneTopics);
            }
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
  }, [slug]);

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
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      const response = await coursesApi.enroll(course.slug, getCurrentAttribution());
      if (response.ok) {
        const sortedLessons = [...(course.lessons || [])].sort((a, b) => a.order_index - b.order_index);
        // Content is stripped for unenrolled users, so navigate by ID order:
        // prefer first topic (always present), fall back to first lesson
        let navigated = false;
        for (const lesson of sortedLessons) {
          const sortedTopics = [...(lesson.topics || [])].sort((a, b) => a.order_index - b.order_index);
          if (sortedTopics.length > 0) {
            navigate(`/courses/${course.slug}/topics/${sortedTopics[0].id}`);
            navigated = true;
            break;
          }
        }
        if (!navigated) {
          const firstLesson = sortedLessons[0];
          if (firstLesson) {
            navigate(`/courses/${course.slug}/lessons/${firstLesson.id}`);
          } else {
            setCourse({ ...course, is_enrolled: true });
          }
        }
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
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

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
        if (course?.is_enrolled) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        newSet.add(lessonId);
        if (course?.is_enrolled) {
          history.replaceState(null, '', `#lesson-${lessonId}`);
          if (slug) {
            localStorage.setItem(`lastLesson:${slug}`, String(lessonId));
          }
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
    if (course?.is_enrolled) {
      history.replaceState(null, '', `#lesson-${lessonId}`);
      if (slug) {
        localStorage.setItem(`lastLesson:${slug}`, String(lessonId));
      }
    }
    setTimeout(() => {
      const el = document.getElementById(`lesson-${lessonId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };


  const formatDuration = (hours?: number, minutes?: number, display?: string) => {
    if (display) return display;
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
          <Link to="/cursos" className="back-link">Volver a cursos</Link>
        </div>
      </div>
    );
  }

  const instructor = course.instructor
    ? {
        ...course.instructor,
        avatar: (course.instructor.name && localAvatars[course.instructor.name]) || course.instructor.avatar,
      }
    : null;

  // S6-06: the course counts as completed when every content item is done.
  const courseCompleted = (() => {
    if (!course.is_enrolled || !course.lessons) return false;
    const allLessons = course.lessons.filter(l => l.video_url || l.content);
    const allTopics = course.lessons.flatMap(l => l.topics || []);
    if (allLessons.length + allTopics.length === 0) return false;
    return allLessons.every(l => completedLessons.has(l.id)) &&
      allTopics.every(t => completedTopics.has(t.id));
  })();

  // S6-05: default calendar block = the course duration, in minutes.
  const courseDurationMinutes =
    course.duration_minutes ||
    (course.duration_hours ? Math.round(course.duration_hours * 60) : 60);

  const seoTitle = course.seo_title || `${course.title} — Propel Academy`;
  const seoDescription =
    course.seo_description ||
    (course.short_description || course.description || '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 200);
  const seoImage =
    course.seo_image_url ||
    course.thumbnail_url ||
    (course.slug && localThumbnails[course.slug]) ||
    '';
  const absoluteImage = seoImage.startsWith('http') ? seoImage : `https://propelacademy.org${seoImage}`;
  const courseUrl = `https://propelacademy.org/courses/${course.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: seoDescription,
    url: courseUrl,
    inLanguage: 'es',
    image: absoluteImage || undefined,
    provider: {
      '@type': 'Organization',
      name: 'Propel Academy',
      sameAs: 'https://propelacademy.org',
    },
    ...(course.instructor?.name
      ? {
          instructor: {
            '@type': 'Person',
            name: course.instructor.name,
          },
        }
      : {}),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      inLanguage: 'es',
    },
  };

  return (
    <div className="course-detail-page">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={courseUrl} />
        <meta property="og:site_name" content="Propel Academy" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={courseUrl} />
        <meta property="og:locale" content="es_ES" />
        {absoluteImage && <meta property="og:image" content={absoluteImage} />}
        <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="course-detail-container">
        {/* Back Navigation */}
        <div className="course-detail-nav">
          <Link to="/cursos" className="back-button">
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
              <div className="course-header-top">
                <h1 className="course-title">{course.title}</h1>
                <button
                  className={`favorite-button ${course.is_favorite ? 'active' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={togglingFavorite}
                  aria-label={course.is_favorite ? 'Guardado' : 'Agregar a favoritos'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={course.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {course.is_favorite ? 'Guardado' : 'Agregar'}
                </button>
              </div>

              <div className="course-header-meta">
                {instructor?.name && (
                  <span className="course-meta-instructor">{instructor.name}</span>
                )}
                {instructor?.name && course.category && (
                  <span className="course-meta-sep" aria-hidden="true" />
                )}
                {course.category && (
                  <span className="course-meta-category">{course.category.name}</span>
                )}
              </div>
            </div>

            {/* Course Description */}
            <div className="course-section">
              <h2 className="section-title">Descripción del curso</h2>
              <div
                className="course-description-text"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripDescriptionHeading(course.description || course.short_description)) }}
              />
            </div>

            {/* What You'll Learn */}
            {course.what_you_learn && course.what_you_learn.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">¿Qué aprenderás?</h2>
                <ul className="learning-list">
                  {course.what_you_learn.map((item, index) => (
                    <li key={index}>
                      <span className="learning-bullet" aria-hidden="true" />
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
                <div className="takeaway-grid">
                  {course.what_you_get.map((item, index) => (
                    <div key={index} className="takeaway-item">
                      <img
                        className="takeaway-icon"
                        src={TAKEAWAY_ICONS[index % TAKEAWAY_ICONS.length]}
                        alt=""
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </div>
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
                    .map((lesson, index) => (
                      <div key={lesson.id} id={`lesson-${lesson.id}`} className="module-item">
                        <button
                          className={`module-header ${expandedModules.has(lesson.id) ? 'expanded' : ''}`}
                          onClick={() => toggleModule(lesson.id)}
                        >
                          {completedLessons.has(lesson.id) ? (
                            <svg className="module-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          ) : (
                            <span className="module-number">{index + 1}</span>
                          )}
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
                            {!course.is_enrolled && lesson.excerpt && (
                              <p className="module-excerpt">{lesson.excerpt}</p>
                            )}
                            {lesson.content && (
                              <div
                                className="module-content-html"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processContent(lesson.content)) }}
                              />
                            )}

                            {lesson.topics && lesson.topics.length > 0 && (
                              <div className="topics-list">
                                {lesson.topics
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((topic) => (
                                    <div key={topic.id} className="topic-item-wrapper">
                                      <Link
                                        to={course.is_enrolled ? `/courses/${slug}/topics/${topic.id}` : '#'}
                                        className={`topic-item ${completedTopics.has(topic.id) ? 'completed' : ''}`}
                                        onClick={(e) => { if (!course.is_enrolled) { e.preventDefault(); setShowEnrollPrompt(true); } }}
                                      >
                                        {completedTopics.has(topic.id) ? (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                            <polyline points="22 4 12 14.01 9 11.01"/>
                                          </svg>
                                        ) : (
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polygon points="10 8 16 12 10 16 10 8"/>
                                          </svg>
                                        )}
                                        <span>{topic.title}</span>
                                      </Link>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {lesson.resources && lesson.resources.length > 0 && (
                              <div className="module-resources">
                                <h4 className="module-resources-title">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Recursos
                                </h4>
                                {lesson.resources.map(resource => {
                                  const url = localizeUrl(resource.url);
                                  const isPdf = url?.toLowerCase().endsWith('.pdf');
                                  const isExternalLink = !isPdf && /^https?:\/\//.test(url);
                                  const isPreviewOpen = previewResourceId === resource.id;

                                  if (isExternalLink) {
                                    return (
                                      <div key={resource.id} className="module-resource-wrapper">
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="module-resource-item"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                                          </svg>
                                          <span className="module-resource-name">{resource.title}</span>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                          </svg>
                                        </a>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={resource.id} className="module-resource-wrapper">
                                      <div
                                        className={`module-resource-item ${isPreviewOpen ? 'active' : ''}`}
                                        onClick={isPdf ? (e) => { e.preventDefault(); setPreviewResourceId(isPreviewOpen ? null : resource.id); } : undefined}
                                        style={isPdf ? { cursor: 'pointer' } : undefined}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                          <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        <span className="module-resource-name">{resource.title}</span>
                                        {resource.file_size > 0 && (
                                          <span className="module-resource-size">{formatFileSize(resource.file_size)}</span>
                                        )}
                                        {isPdf ? (
                                          <svg className={`module-resource-chevron ${isPreviewOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 9l6 6 6-6"/>
                                          </svg>
                                        ) : (
                                          <a href={url} download target="_blank" rel="noopener noreferrer" className="module-resource-download" onClick={e => e.stopPropagation()}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                              <polyline points="7 10 12 15 17 10" />
                                              <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                          </a>
                                        )}
                                      </div>
                                      {isPdf && isPreviewOpen && (
                                        <div className="module-resource-preview">
                                          <div className="module-resource-preview-toolbar">
                                            <a href={url} download target="_blank" rel="noopener noreferrer" className="preview-toolbar-btn">
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                              </svg>
                                              Descargar
                                            </a>
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="preview-toolbar-btn">
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                                <polyline points="15 3 21 3 21 9" />
                                                <line x1="10" y1="14" x2="21" y2="3" />
                                              </svg>
                                              Abrir
                                            </a>
                                          </div>
                                          <iframe src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}`} className="module-resource-iframe" title={resource.title} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {course.is_enrolled && (
                              <Link to={`/courses/${slug}/lessons/${lesson.id}`} className="module-lesson-cta">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                Ir a la lección
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Course Materials */}
            {(() => {
              if (!isAuthenticated()) return null;
              const mats = course.resources && course.resources.length > 0
                ? course.resources.map(r => ({ url: r.url, title: r.title }))
                : course.materials && course.materials.length > 0
                  ? course.materials.map(m => ({ url: m.url, title: m.title }))
                  : course.materials_html
                    ? parseMaterialsHtml(course.materials_html)
                    : [];
              if (mats.length === 0) return null;
              return (
                <div className="course-section">
                  <button
                    className={`materials-toggle ${materialsOpen ? 'expanded' : ''}`}
                    onClick={() => setMaterialsOpen(o => !o)}
                  >
                    <span>Materiales del curso</span>
                    <svg
                      className={`materials-chevron ${materialsOpen ? 'expanded' : ''}`}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {materialsOpen && (
                    <div className="materials-list">
                      {mats.map((material, i) => (
                        <a
                          key={i}
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="material-item"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                          </svg>
                          <span>{material.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Instructor Section */}
            {instructor && (
              <div className="course-section instructor-section">
                <h2 className="section-title">Conoce a tu instructor:</h2>
                <div className="instructor-card">
                  <div className="instructor-avatar-wrapper">
                    {instructor.avatar ? (
                      <img
                        src={instructor.avatar}
                        alt={instructor.name}
                        className="instructor-avatar"
                        width={182}
                        height={189}
                      />
                    ) : (
                      <div className="instructor-avatar-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#11544F" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="instructor-info">
                    {instructor.name && (
                      <h3 className="instructor-name">{instructor.name}</h3>
                    )}
                    {instructor.title && (
                      <p className="instructor-title">{instructor.title}</p>
                    )}
                    {instructor.bio && (
                      <p className="instructor-bio">{instructor.bio}</p>
                    )}
                  </div>
                  <a
                    href="https://www.linkedin.com/company/wepropel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instructor-linkedin"
                    aria-label={`LinkedIn de ${instructor.name ?? 'el instructor'}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="course-sidebar">
            <div className="sidebar-card">
              {(() => {
                // Admin-uploaded thumbnail (backend) wins; hardcoded local map is only a fallback.
                const thumbSrc = course.thumbnail_url || localThumbnails[course.slug];
                return thumbSrc ? (
                  <div className="sidebar-thumbnail">
                    <img src={thumbSrc} alt={course.title} width={400} height={260} />
                  </div>
                ) : null;
              })()}
              <div className="sidebar-card-body">
                <h3 className="sidebar-title">Contenido</h3>

                <div className="sidebar-info">
                  {instructor && (
                    <div className="sidebar-row">
                      <span className="sidebar-row-label">
                        <svg className="sidebar-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Instructor
                      </span>
                      <span className="sidebar-value">{instructor.name}</span>
                    </div>
                  )}

                  <div className="sidebar-row">
                    <span className="sidebar-row-label">
                      <svg className="sidebar-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      Duración
                    </span>
                    <span className="sidebar-value">{formatDuration(course.duration_hours, course.duration_minutes, course.duration_display)}</span>
                  </div>

                  {course.lessons && (
                    <div className="sidebar-row">
                      <span className="sidebar-row-label">
                        <svg className="sidebar-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <rect x="3" y="4" width="18" height="5" rx="1" />
                          <rect x="3" y="13" width="18" height="5" rx="1" />
                        </svg>
                        Módulos
                      </span>
                      <span className="sidebar-value">{course.lessons.length}</span>
                    </div>
                  )}

                  <div className="sidebar-row">
                    <span className="sidebar-row-label">
                      <svg className="sidebar-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <circle cx="12" cy="8" r="5" />
                        <path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5" />
                      </svg>
                      Certificación
                    </span>
                    <span className="sidebar-value">{course.has_certificate !== false ? 'Sí' : 'No'}</span>
                  </div>
                </div>

                {course.is_enrolled && course.lessons && course.lessons.length > 0 && (
                  <div className="sidebar-toc">
                    <h4 className="sidebar-toc-title">Navegación rápida</h4>
                    <nav className="sidebar-toc-nav">
                      {course.lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson, index) => (
                          <button
                            key={lesson.id}
                            className={`sidebar-toc-item ${course.is_enrolled && expandedModules.has(lesson.id) ? 'active' : ''} ${completedLessons.has(lesson.id) ? 'completed' : ''}`}
                            onClick={() => handleTocClick(lesson.id)}
                          >
                            {completedLessons.has(lesson.id) ? (
                              <svg className="sidebar-toc-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              <span className="sidebar-toc-number">{index + 1}</span>
                            )}
                            <span className="sidebar-toc-label">{lesson.title}</span>
                          </button>
                        ))}
                    </nav>
                  </div>
                )}

                {courseCompleted && (
                  <>
                    <p className="sidebar-completed-note">¡Ya terminaste este curso!</p>
                    <button
                      className="sidebar-certificate-btn"
                      disabled={downloadingCert}
                      onClick={async () => {
                        setDownloadingCert(true);
                        setCertError(null);
                        try {
                          const result = await coursesApi.downloadCertificate(course.slug);
                          if (result && !result.ok) {
                            setCertError(result.detail || 'No se pudo descargar el certificado.');
                          }
                        } finally {
                          setDownloadingCert(false);
                        }
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {downloadingCert ? 'Descargando...' : 'Descargar certificado'}
                    </button>
                    {certError && <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.5rem' }}>{certError}</p>}
                  </>
                )}

                {course.is_enrolled ? (() => {
                  // Find first incomplete content item for "Continuar" link
                  const sortedLessons = [...(course.lessons || [])].sort((a, b) => a.order_index - b.order_index);
                  let firstPath = `/courses/${slug}`;
                  let found = false;

                  // First pass: find the first incomplete item
                  for (const lesson of sortedLessons) {
                    if ((lesson.video_url || lesson.content) && !completedLessons.has(lesson.id)) {
                      firstPath = `/courses/${slug}/lessons/${lesson.id}`;
                      found = true;
                      break;
                    }
                    if (lesson.topics && lesson.topics.length > 0) {
                      const incompleteTopic = [...lesson.topics]
                        .sort((a, b) => a.order_index - b.order_index)
                        .find(t => !completedTopics.has(t.id));
                      if (incompleteTopic) {
                        firstPath = `/courses/${slug}/topics/${incompleteTopic.id}`;
                        found = true;
                        break;
                      }
                    }
                  }

                  // Fallback: if everything is completed, go to the first item
                  if (!found) {
                    for (const lesson of sortedLessons) {
                      if (lesson.video_url || lesson.content) {
                        firstPath = `/courses/${slug}/lessons/${lesson.id}`;
                        break;
                      }
                      if (lesson.topics && lesson.topics.length > 0) {
                        const firstTopic = [...lesson.topics].sort((a, b) => a.order_index - b.order_index)[0];
                        firstPath = `/courses/${slug}/topics/${firstTopic.id}`;
                        break;
                      }
                    }
                  }
                  return (
                    <Link to={firstPath} className={`sidebar-cta${courseCompleted ? '' : ' enrolled'}`}>
                      {courseCompleted ? 'Retomar curso' : 'Continuar'}
                    </Link>
                  );
                })() : (
                  <button
                    className="sidebar-cta"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <>
                        <span className="button-spinner"></span>
                        Inscribiendo...
                      </>
                    ) : (
                      'Iniciar curso ahora'
                    )}
                  </button>
                )}

                {/* S6-05: block time for the course in the user's calendar */}
                <button className="sidebar-calendar-link" onClick={() => setShowCalModal(true)}>
                  Agregar a mi calendario
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add-to-calendar modal (S6-05) */}
      {showCalModal && (
        <AddToCalendarModal
          courseTitle={course.title}
          courseUrl={`${window.location.origin}/courses/${course.slug}`}
          defaultDurationMinutes={courseDurationMinutes}
          onClose={() => setShowCalModal(false)}
        />
      )}

      {/* Enroll prompt popup */}
      {showEnrollPrompt && (
        <div className="cd-enroll-overlay" onClick={() => setShowEnrollPrompt(false)}>
          <div className="cd-enroll-popup" onClick={e => e.stopPropagation()}>
            <div className="cd-enroll-popup-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 11V7M12 15h.01"/>
              </svg>
            </div>
            <h3 className="cd-enroll-popup-title">¿Quieres explorar el contenido?</h3>
            <p className="cd-enroll-popup-subtitle">Te invito a inscribirte</p>
            <div className="cd-enroll-popup-actions">
              <button
                className="cd-enroll-popup-btn-primary"
                onClick={() => { setShowEnrollPrompt(false); handleEnroll(); }}
                disabled={enrolling}
              >
                {enrolling ? 'Inscribiendo...' : 'Inscribirme'}
              </button>
              <button
                className="cd-enroll-popup-btn-secondary"
                onClick={() => setShowEnrollPrompt(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
