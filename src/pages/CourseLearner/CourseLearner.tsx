import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated } from '../../services/api';
import './CourseLearner.css';

/** Rewrite WordPress upload URLs to local /pdfs/ path */
function localizeUrl(url: string): string {
  return url.replace(
    /^https?:\/\/(?:www\.)?academy\.wepropel\.org\/wp-content\/uploads\//,
    '/pdfs/'
  );
}

interface ExtractedGoogleLink {
  url: string;
  title: string;
  type: 'drive-file' | 'drive-folder' | 'document' | 'presentation' | 'spreadsheet' | 'calendar';
  badge: string;
}

/** Extract Google Drive/Docs/Calendar links from HTML content as resource cards */
function extractGoogleLinks(html: string): { html: string; googleLinks: ExtractedGoogleLink[] } {
  const googleLinks: ExtractedGoogleLink[] = [];
  const seenUrls = new Set<string>();

  const linkPattern = /<a\s[^>]*href=["']([^"']*(?:drive\.google\.com|docs\.google\.com|calendar\.app\.google)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let cleaned = html;
  const matches = [...html.matchAll(linkPattern)];

  for (const match of matches) {
    const [fullMatch, url, rawText] = match;
    if (seenUrls.has(url)) {
      cleaned = cleaned.replace(fullMatch, '');
      continue;
    }
    seenUrls.add(url);

    // Detect type from URL
    let type: ExtractedGoogleLink['type'] = 'drive-file';
    let badge = 'Google Drive';
    if (/calendar\.app\.google/.test(url)) {
      type = 'calendar'; badge = 'Google Calendar';
    } else if (/\/presentation\//.test(url)) {
      type = 'presentation'; badge = 'Google Slides';
    } else if (/\/spreadsheets\//.test(url)) {
      type = 'spreadsheet'; badge = 'Google Sheets';
    } else if (/\/document\//.test(url)) {
      type = 'document'; badge = 'Google Docs';
    } else if (/\/folders\//.test(url)) {
      type = 'drive-folder'; badge = 'Google Drive';
    }

    // Derive title with 3-tier fallback
    const linkText = rawText.replace(/<[^>]*>/g, '').trim();
    const nonDescriptive = /^(aqu[ií]|here|click|link|enlace)$/i;
    let title: string;

    if (linkText && !nonDescriptive.test(linkText)) {
      title = linkText;
    } else {
      // Try preceding sentence text: look for text before the <a> tag in the same line/sentence
      const idx = match.index!;
      const before = html.substring(Math.max(0, idx - 200), idx);
      // Strip tags, split into sentence fragments on ". " or ": "
      const plainBefore = before.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trimEnd();
      const segments = plainBefore.split(/\.\s+|:\s+/);
      const precedingText = (segments[segments.length - 1] || '').trim();

      if (precedingText && precedingText.length > 3 && precedingText.length < 120) {
        // Remove trailing punctuation or connector words
        title = precedingText.replace(/[\s,]+$/, '').replace(/\s+(de|del|en|la|el|las|los)\s*$/i, '');
        if (title.length <= 3) title = precedingText.replace(/[\s,]+$/, '');
      } else {
        // Fallback to type label
        const typeLabels: Record<ExtractedGoogleLink['type'], string> = {
          'drive-file': 'Archivo de Drive',
          'drive-folder': 'Carpeta de Drive',
          'document': 'Documento de Google',
          'presentation': 'Presentaci\u00f3n de Google',
          'spreadsheet': 'Hoja de c\u00e1lculo de Google',
          'calendar': 'Calendario de Google',
        };
        title = typeLabels[type];
      }
    }

    googleLinks.push({ url, title, type, badge });

    // Remove the link and surrounding empty wrappers
    cleaned = cleaned.replace(fullMatch, '');
  }

  // Clean up empty wrapper tags left behind
  cleaned = cleaned.replace(/<(span|em|strong|p)(\s[^>]*)?>(\s|&nbsp;)*<\/\1>/gi, '');
  // Remove double spaces and trailing periods after removal
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p(\s[^>]*)?>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

  return { html: cleaned, googleLinks };
}

/** Replace [pdfjs-viewer url="..."] shortcodes with embedded PDF.js viewer */
function processContent(html: string): string {
  let result = html.replace(
    /\[pdfjs-viewer\s+[^\]]*?url=["']?([^"'\]\s]+)["']?[^\]]*?\]/gi,
    (_match, url: string) => {
      const pdfUrl = localizeUrl(url);
      const filename = pdfUrl.split('/').pop() || 'document.pdf';
      const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
      return `<div class="cl-pdf-embed">
        <div class="cl-pdf-toolbar">
          <a href="${pdfUrl}" download="${filename}" target="_blank" rel="noopener noreferrer" class="cl-pdf-toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar
          </a>
          <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="cl-pdf-toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Abrir
          </a>
        </div>
        <iframe src="${viewerUrl}" width="100%" height="700" style="border:none;" loading="lazy" allowfullscreen></iframe>
      </div>`;
    }
  );

  // Strip empty heading tags (WordPress artifacts)
  result = result.replace(/<h[1-6][^>]*>\s*<\/h[1-6]>/gi, '');
  // Strip orphan &nbsp;
  result = result.replace(/(<p[^>]*>)\s*(&nbsp;\s*)+<\/p>/gi, '');
  // Remove inline style attributes from spans (WordPress color overrides)
  result = result.replace(/<span\s+style="[^"]*"([^>]*)>/gi, '<span$1>');
  // Remove empty <span> wrappers left behind
  result = result.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
  // Collapse multiple consecutive <br> tags to a single one
  result = result.replace(/(<br\s*\/?\s*>\s*){2,}/gi, '<br>');

  return result;
}

interface CourseMaterial {
  url: string;
  title: string;
}

/** Parse course-level materials HTML (from LearnDash) into a list of links */
function parseMaterialsHtml(html: string): CourseMaterial[] {
  const materials: CourseMaterial[] = [];
  const linkPattern = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const url = match[1];
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

interface Topic {
  id: number;
  title: string;
  order_index: number;
  video_url?: string;
  content?: string;
}

interface Lesson {
  id: number;
  title: string;
  order_index: number;
  video_url?: string;
  content?: string;
  topics?: Topic[];
  resources?: LessonResource[];
}

interface Course {
  id: number;
  title: string;
  slug: string;
  lessons?: Lesson[];
  materials_html?: string;
}

interface NavItem {
  type: 'lesson' | 'topic';
  id: number;
  title: string;
  lessonId: number;
  lessonTitle: string;
  video_url?: string;
  content?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getEmbedUrl = (url: string): string | null => {
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?/);
  if (vimeo) {
    const hash = vimeo[2] ? `&h=${vimeo[2]}` : '';
    return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0${hash}`;
  }
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
};

const buildNavItems = (lessons: Lesson[]): NavItem[] => {
  const items: NavItem[] = [];
  const sorted = [...lessons].sort((a, b) => a.order_index - b.order_index);
  for (const lesson of sorted) {
    if (lesson.video_url || lesson.content) {
      items.push({
        type: 'lesson',
        id: lesson.id,
        title: lesson.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        video_url: lesson.video_url,
        content: lesson.content,
      });
    }
    if (lesson.topics) {
      const sortedTopics = [...lesson.topics].sort((a, b) => a.order_index - b.order_index);
      for (const topic of sortedTopics) {
        items.push({
          type: 'topic',
          id: topic.id,
          title: topic.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          video_url: topic.video_url,
          content: topic.content,
        });
      }
    }
  }
  return items;
};

const getNavPath = (slug: string, item: NavItem) =>
  item.type === 'lesson'
    ? `/courses/${slug}/lessons/${item.id}`
    : `/courses/${slug}/topics/${item.id}`;

const CourseLearner = () => {
  const { slug, lessonId, topicId } = useParams<{
    slug: string;
    lessonId?: string;
    topicId?: string;
  }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [previewResourceId, setPreviewResourceId] = useState<number | null>(null);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchCourse = async () => {
      if (!slug) return;
      try {
        const res = await coursesApi.getBySlug(slug);
        if (res.ok) {
          setCourse(res.data);
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

  // Fetch progress after course loads
  useEffect(() => {
    if (!slug || !course) return;
    const fetchProgress = async () => {
      try {
        const res = await coursesApi.getCourseProgress(slug);
        if (res.ok) {
          setCompletedLessons(new Set(res.data.completed_lessons));
          setCompletedTopics(new Set(res.data.completed_topics));
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    };
    fetchProgress();
  }, [slug, course]);

  // Scroll to top when lesson/topic changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [lessonId, topicId]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [lessonId, topicId]);

  // Expand the lesson that contains the current item
  useEffect(() => {
    if (!course?.lessons) return;
    const numLessonId = lessonId ? Number(lessonId) : null;
    const numTopicId = topicId ? Number(topicId) : null;

    for (const lesson of course.lessons) {
      if (numLessonId && lesson.id === numLessonId) {
        setExpandedLessons((prev) => new Set(prev).add(lesson.id));
        return;
      }
      if (numTopicId && lesson.topics?.some((t) => t.id === numTopicId)) {
        setExpandedLessons((prev) => new Set(prev).add(lesson.id));
        return;
      }
    }
  }, [course, lessonId, topicId]);

  if (loading) {
    return (
      <div className="cl-page">
        <div className="cl-loading">
          <div className="cl-spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="cl-page">
        <div className="cl-loading">
          <p>{error || 'Curso no encontrado'}</p>
          <Link to="/" className="cl-back-link">Volver a cursos</Link>
        </div>
      </div>
    );
  }

  const navItems = buildNavItems(course.lessons || []);
  const currentIndex = navItems.findIndex((item) =>
    lessonId
      ? item.type === 'lesson' && item.id === Number(lessonId)
      : item.type === 'topic' && item.id === Number(topicId)
  );
  const currentItem = currentIndex >= 0 ? navItems[currentIndex] : null;
  const prevItem = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const nextItem = currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;

  const sortedLessons = [...(course.lessons || [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const toggleLesson = (id: number) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (type: 'lesson' | 'topic', id: number) => {
    if (type === 'lesson') return lessonId && Number(lessonId) === id;
    return topicId && Number(topicId) === id;
  };

  const isCompleted = (type: 'lesson' | 'topic', id: number) => {
    return type === 'lesson' ? completedLessons.has(id) : completedTopics.has(id);
  };

  const handleMarkComplete = async () => {
    if (!currentItem || markingComplete) return;
    const alreadyDone = isCompleted(currentItem.type, currentItem.id);
    if (alreadyDone) return;

    // Optimistic update
    if (currentItem.type === 'lesson') {
      setCompletedLessons((prev) => new Set(prev).add(currentItem.id));
    } else {
      setCompletedTopics((prev) => new Set(prev).add(currentItem.id));
    }

    setMarkingComplete(true);
    try {
      if (currentItem.type === 'lesson') {
        await coursesApi.markLessonComplete(currentItem.id);
      } else {
        await coursesApi.markTopicComplete(currentItem.id);
      }
    } catch (err) {
      // Revert on error
      if (currentItem.type === 'lesson') {
        setCompletedLessons((prev) => {
          const next = new Set(prev);
          next.delete(currentItem.id);
          return next;
        });
      } else {
        setCompletedTopics((prev) => {
          const next = new Set(prev);
          next.delete(currentItem.id);
          return next;
        });
      }
      console.error('Error marking complete:', err);
    } finally {
      setMarkingComplete(false);
    }
  };

  const currentItemCompleted = currentItem ? isCompleted(currentItem.type, currentItem.id) : false;

  // Progress calculation
  const progressPercent = navItems.length > 0
    ? Math.round(
        navItems.filter(item =>
          item.type === 'lesson' ? completedLessons.has(item.id) : completedTopics.has(item.id)
        ).length / navItems.length * 100
      )
    : 0;

  // Pre-process content for sidebar materials + main content
  let cleanedHtml = '';
  let googleLinks: ExtractedGoogleLink[] = [];
  let hasHtmlContent = false;
  if (currentItem?.content) {
    const processed = processContent(currentItem.content);
    const extracted = extractGoogleLinks(processed);
    cleanedHtml = extracted.html;
    googleLinks = extracted.googleLinks;
    hasHtmlContent = cleanedHtml.replace(/<[^>]*>/g, '').trim().length > 0;
  }

  // Current lesson's downloadable resources (also shown when viewing a topic)
  const currentResources = currentItem
    ? (course.lessons?.find(l => l.id === currentItem.lessonId)?.resources || [])
    : [];

  // Course-level materials (from LearnDash course_materials field)
  const courseMaterials = course.materials_html ? parseMaterialsHtml(course.materials_html) : [];

  const hasMaterials = googleLinks.length > 0 || currentResources.length > 0 || courseMaterials.length > 0;

  return (
    <div className="cl-page">
      {/* Mobile hamburger */}
      <button
        className="cl-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
          )}
        </svg>
      </button>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="cl-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`cl-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="cl-sidebar-header">
          <Link to={`/courses/${slug}`} className="cl-sidebar-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver
          </Link>
        </div>

        <nav className="cl-sidebar-nav">
          <div className="cl-sidebar-section-title">Contenido del Curso</div>
          {sortedLessons.map((lesson) => {
            const hasContent = !!(lesson.video_url || lesson.content);
            const hasTopics = lesson.topics && lesson.topics.length > 0;
            const isExpanded = expandedLessons.has(lesson.id);
            const lessonCompleted = isCompleted('lesson', lesson.id);
            const lessonActive = hasContent && isActive('lesson', lesson.id);

            return (
              <div key={lesson.id} className="cl-sidebar-lesson">
                <div className={`cl-sidebar-lesson-header ${lessonActive ? 'active' : ''} ${!hasContent && !hasTopics ? 'empty' : ''}`}>
                  <div className={`cl-module-icon ${lessonCompleted ? 'completed' : ''}`}>
                    {lessonCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : null}
                  </div>
                  {hasContent ? (
                    <Link
                      to={`/courses/${slug}/lessons/${lesson.id}`}
                      className={`cl-sidebar-lesson-link ${lessonActive ? 'active' : ''}`}
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    <button
                      className={`cl-sidebar-lesson-label ${hasTopics ? '' : 'no-topics'}`}
                      onClick={() => hasTopics && toggleLesson(lesson.id)}
                    >
                      {lesson.title}
                    </button>
                  )}
                  {hasTopics && (
                    <button
                      className="cl-sidebar-chevron-btn"
                      onClick={() => toggleLesson(lesson.id)}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`cl-sidebar-chevron ${isExpanded ? 'expanded' : ''}`}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  )}
                </div>
                {isExpanded && hasTopics && (
                  <div className="cl-sidebar-topics">
                    {[...(lesson.topics || [])].sort((a, b) => a.order_index - b.order_index).map((topic) => (
                      <Link
                        key={topic.id}
                        to={`/courses/${slug}/topics/${topic.id}`}
                        className={`cl-sidebar-topic-link ${isActive('topic', topic.id) ? 'active' : ''} ${isCompleted('topic', topic.id) ? 'completed' : ''}`}
                      >
                        {isCompleted('topic', topic.id) ? (
                          <svg className="cl-completed-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                          </svg>
                        )}
                        <span>{topic.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Materials section */}
        {hasMaterials && (
          <div className="cl-sidebar-materials">
            <button
              className="cl-sidebar-materials-toggle"
              onClick={() => setMaterialsOpen(!materialsOpen)}
            >
              Materiales del curso
              <svg
                className={materialsOpen ? 'expanded' : ''}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {materialsOpen && (
              <div className="cl-sidebar-materials-list">
                {googleLinks.map((link, i) => (
                  <a
                    key={`gl-${i}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cl-sidebar-material-item"
                  >
                    {link.title}
                  </a>
                ))}
                {currentResources.map(resource => (
                  <a
                    key={`res-${resource.id}`}
                    href={localizeUrl(resource.url)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cl-sidebar-material-item"
                  >
                    {resource.title}
                  </a>
                ))}
                {courseMaterials.map((mat, i) => (
                  <a
                    key={`cm-${i}`}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cl-sidebar-material-item"
                  >
                    {mat.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="cl-main">
        <div className="cl-main-inner">
          {/* Top header bar */}
          <div className="cl-main-header">
            <span className="cl-main-header-title">{course.title}</span>
            <div className="cl-progress-wrapper">
              <div className="cl-progress-bar">
                <div
                  className="cl-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="cl-progress-label">{progressPercent}% completado</span>
            </div>
            <Link to={`/courses/${slug}`} className="cl-close-btn" aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {currentItem ? (
            <>
              <h1 className="cl-title">{currentItem.title}</h1>

              {/* Video */}
              {currentItem.video_url && (() => {
                const embedUrl = getEmbedUrl(currentItem.video_url);
                if (embedUrl) {
                  return (
                    <div className="cl-video-embed">
                      <iframe
                        src={embedUrl}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={currentItem.title}
                      />
                    </div>
                  );
                }
                return (
                  <div className="cl-video-player">
                    <video
                      controls
                      controlsList="nodownload"
                      preload="metadata"
                      title={currentItem.title}
                    >
                      <source src={currentItem.video_url} />
                    </video>
                  </div>
                );
              })()}

              {/* Description / HTML content */}
              {hasHtmlContent && (
                <>
                  <h2 className="cl-description-heading">Descripci&oacute;n</h2>
                  <div
                    className="cl-content-html"
                    dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                  />
                  <hr className="cl-content-divider" />
                </>
              )}

              {/* Google link resources */}
              {googleLinks.length > 0 && (
                <div className="cl-resources">
                  <h3 className="cl-resources-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    Recursos
                  </h3>
                  {googleLinks.map((link, i) => (
                    <div key={i} className="cl-resource-wrapper">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cl-resource-item"
                      >
                        {link.type === 'calendar' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        ) : link.type === 'drive-folder' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                          </svg>
                        ) : link.type === 'presentation' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        ) : link.type === 'spreadsheet' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        <span className="cl-resource-title">{link.title}</span>
                        <span className="cl-resource-badge">{link.badge}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Downloadable resources */}
              {currentResources.length > 0 && (
                <div className="cl-resources">
                  <h3 className="cl-resources-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Recursos descargables
                  </h3>
                  {currentResources.map(resource => {
                    const url = localizeUrl(resource.url);
                    const isPdf = url?.toLowerCase().endsWith('.pdf');
                    const isExternalLink = !isPdf && /^https?:\/\//.test(url);
                    const isPreviewOpen = previewResourceId === resource.id;

                    if (isExternalLink) {
                      return (
                        <div key={resource.id} className="cl-resource-wrapper">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cl-resource-item"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                            <span className="cl-resource-title">{resource.title}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        </div>
                      );
                    }

                    return (
                      <div key={resource.id} className="cl-resource-wrapper">
                        <div
                          className={`cl-resource-item ${isPreviewOpen ? 'active' : ''}`}
                          onClick={isPdf ? () => setPreviewResourceId(isPreviewOpen ? null : resource.id) : undefined}
                          style={isPdf ? { cursor: 'pointer' } : undefined}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="cl-resource-title">{resource.title}</span>
                          {resource.file_size > 0 && (
                            <span className="cl-resource-size">{formatFileSize(resource.file_size)}</span>
                          )}
                          {isPdf ? (
                            <svg className={`cl-resource-chevron ${isPreviewOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9l6 6 6-6"/>
                            </svg>
                          ) : (
                            <a href={url} download target="_blank" rel="noopener noreferrer" className="cl-resource-download" onClick={e => e.stopPropagation()}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {isPdf && isPreviewOpen && (
                          <div className="cl-resource-preview">
                            <div className="cl-resource-preview-toolbar">
                              <a href={url} download target="_blank" rel="noopener noreferrer" className="cl-preview-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Descargar
                              </a>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="cl-preview-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Abrir
                              </a>
                            </div>
                            <iframe src={`/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}`} className="cl-resource-iframe" title={resource.title} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Course-level materials */}
              {courseMaterials.length > 0 && (
                <div className="cl-resources">
                  <h3 className="cl-resources-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    Materiales del curso
                  </h3>
                  {courseMaterials.map((mat, i) => (
                    <div key={i} className="cl-resource-wrapper">
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cl-resource-item"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                        <span className="cl-resource-title">{mat.title}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Mark as complete button */}
              <button
                className={`cl-mark-complete-btn ${currentItemCompleted ? 'completed' : ''}`}
                onClick={handleMarkComplete}
                disabled={currentItemCompleted || markingComplete}
              >
                {currentItemCompleted ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Completado
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {markingComplete ? 'Marcando...' : 'Marcar como visto'}
                  </>
                )}
              </button>

              {/* Certificate banner */}
              {navItems.length > 0 && navItems.every(item =>
                item.type === 'lesson' ? completedLessons.has(item.id) : completedTopics.has(item.id)
              ) && (
                <div className="cl-certificate-banner">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5A2F" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
                  </svg>
                  <div className="cl-certificate-banner-text">
                    <strong>&iexcl;Felicidades!</strong> Has completado todo el curso.
                  </div>
                  <button
                    className="cl-certificate-download-btn"
                    disabled={downloadingCert}
                    onClick={async () => {
                      setDownloadingCert(true);
                      try {
                        await coursesApi.downloadCertificate(slug!);
                      } finally {
                        setDownloadingCert(false);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {downloadingCert ? 'Descargando...' : 'Descargar certificado'}
                  </button>
                </div>
              )}

              {/* Bottom navigation */}
              <div className="cl-bottom-nav">
                {prevItem ? (
                  <Link to={getNavPath(slug!, prevItem)} className="cl-nav-btn cl-nav-prev">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Lecci&oacute;n Anterior
                  </Link>
                ) : (
                  <div />
                )}
                {nextItem ? (
                  <Link to={getNavPath(slug!, nextItem)} className="cl-nav-btn cl-nav-next">
                    Siguiente Lecci&oacute;n
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ) : (
                  <Link to={`/courses/${slug}`} className="cl-nav-btn cl-nav-next">
                    Volver al curso
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="cl-not-found">
              <p>Contenido no encontrado.</p>
              <Link to={`/courses/${slug}`} className="cl-back-link">Volver al curso</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseLearner;
