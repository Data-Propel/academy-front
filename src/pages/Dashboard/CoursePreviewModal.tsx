import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi, isAuthenticated } from '../../services/api';
import './CoursePreviewModal.css';

/** Convert HTML description to plain-text paragraphs. */
function htmlToParagraphs(html: string): string[] {
  if (typeof document === 'undefined') return [html];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Remove WordPress "Descripción del curso/programa" headings
  tmp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    if (/Descripci[oó]n\s+del\s+(curso|programa)/i.test(h.textContent || '')) h.remove();
  });
  const blocks = Array.from(tmp.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div'))
    .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (blocks.length > 0) return blocks;
  const fallback = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
  return fallback ? [fallback] : [];
}

const localThumbnails: Record<string, string> = {
  'conecta-con-nuevos-donantes': '/thumbnails/Conacta-con-donantes-portada.webp',
  'crea-contenido-para-redes-sociales-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-may.webp',
  'aprende-a-liderar-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-oct.webp',
  'growth-marketing-para-ongs': '/thumbnails/Imagen-destacada.webp',
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

interface Topic {
  id: number;
  title: string;
  order_index: number;
}

interface Lesson {
  id: number;
  title: string;
  order_index: number;
  topics?: Topic[];
}

interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  subtitle?: string;
  thumbnail_url?: string | null;
  instructor?: string | { name?: string; title?: string; bio?: string; avatar?: string };
  duration_display?: string;
  duration_hours?: number;
  lessons_count?: number;
  category?: { id: number; name: string };
  lessons?: Lesson[];
}

export default function CoursePreviewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLessonIds, setOpenLessonIds] = useState<Set<number>>(new Set());
  const loggedIn = isAuthenticated();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    coursesApi.getBySlug(slug).then((res) => {
      if (cancelled) return;
      if (res.ok) setCourse(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toggleLesson = (id: number) => {
    setOpenLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const thumb = course ? (localThumbnails[course.slug] || course.thumbnail_url) : null;
  const ctaLabel = loggedIn ? 'Empezar curso' : 'Inscribirme';
  const ctaHref = loggedIn ? `/courses/${slug}` : '/login';

  return (
    <div className="cpm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cpm-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="cpm-close" onClick={onClose} aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {loading || !course ? (
          <div className="cpm-loading">
            <div className="cpm-skeleton cpm-skeleton-thumb" />
            <div className="cpm-skeleton cpm-skeleton-line cpm-skeleton-title" />
            <div className="cpm-skeleton cpm-skeleton-line" />
            <div className="cpm-skeleton cpm-skeleton-line" />
          </div>
        ) : (
          <>
            {thumb && (
              <div className="cpm-thumb">
                <img src={thumb} alt={course.title} loading="lazy" />
              </div>
            )}
            <div className="cpm-body">
              {course.category && (
                <span className="cpm-category">{course.category.name}</span>
              )}
              <h2 className="cpm-title">{course.title}</h2>
              {course.subtitle && <p className="cpm-subtitle">{course.subtitle}</p>}

              <div className="cpm-meta">
                {(() => {
                  const i = course.instructor;
                  const name = typeof i === 'string' ? i : i?.name;
                  return name ? <span>{name}</span> : null;
                })()}
                {(course.duration_display || (course.duration_hours ?? 0) > 0) && (
                  <span>· {course.duration_display || `${course.duration_hours}h`}</span>
                )}
                {course.lessons_count != null && (
                  <span>· {course.lessons_count} lecciones</span>
                )}
              </div>

              {course.description && (
                <div className="cpm-description">
                  {htmlToParagraphs(course.description).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {course.lessons && course.lessons.length > 0 && (
                <div className="cpm-lessons">
                  <h3 className="cpm-lessons-title">Contenido del curso</h3>
                  <ul className="cpm-lessons-list">
                    {[...course.lessons].sort((a, b) => a.order_index - b.order_index).map((lesson) => {
                      const isOpen = openLessonIds.has(lesson.id);
                      const topics = (lesson.topics || []).slice().sort((a, b) => a.order_index - b.order_index);
                      return (
                        <li key={lesson.id} className="cpm-lesson">
                          <button
                            className="cpm-lesson-header"
                            onClick={() => toggleLesson(lesson.id)}
                            aria-expanded={isOpen}
                          >
                            <span className="cpm-lesson-title">{lesson.title}</span>
                            <span className="cpm-lesson-meta">
                              {topics.length > 0 && <span>{topics.length} temas</span>}
                              <svg
                                className={`cpm-chev${isOpen ? ' cpm-chev--open' : ''}`}
                                width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                              >
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </span>
                          </button>
                          {isOpen && topics.length > 0 && (
                            <ul className="cpm-topics">
                              {topics.map((t) => (
                                <li key={t.id} className="cpm-topic">{t.title}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="cpm-footer">
              <Link to={ctaHref} className="cpm-cta">{ctaLabel}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
